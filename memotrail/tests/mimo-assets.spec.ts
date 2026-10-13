import { test, expect, type Page } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
test.use({ serviceWorkers: 'block' });

async function png(page: Page, kind = 'valid', color = '#a78bfa') {
  return page.evaluate(({ kind, color }) => {
    const canvas = document.createElement('canvas'); canvas.width = kind === 'dimensions' ? 32 : 16; canvas.height = 16;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = color;
    if (kind === 'opaque') ctx.fillRect(0, 0, canvas.width, canvas.height);
    else if (kind !== 'empty') ctx.fillRect(4, 4, 8, 8);
    return canvas.toDataURL('image/png').split(',')[1]!;
  }, { kind, color });
}
function manifest(animation: object) {
  return { version: 2, format: 'individual-png-frames', frameWidth: 16, frameHeight: 16, animations: animation };
}
function action(files: string[], loop = false, status = 'verified') {
  return { status, visualReview: true, frames: files, frameCount: files.length, frameDurationMs: files.map((_, i) => i === 0 ? 300 : 700), loop };
}

test('all frames preload before playback; fallback and canvas occupy the same box', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const image = Buffer.from(await png(page), 'base64');
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/animation_manifest.json', (route) => route.fulfill({ json: manifest({ wave: action(['frames/wave/001.png', 'frames/wave/002.png']) }) }));
  await page.route('**/frames/wave/*.png', async (route) => {
    if (route.request().url().endsWith('002.png')) await gate;
    await route.fulfill({ contentType: 'image/png', body: image });
  });
  await page.reload();
  await page.getByRole('button', { name: 'Wave to Mimo' }).click();
  const box = page.locator('.mimo-sprite-player');
  const before = await box.boundingBox();
  await page.waitForTimeout(1100);
  await expect(page.locator('.mimo-companion')).toHaveAttribute('data-state', 'wave');
  await expect(box).toHaveAttribute('data-asset', 'static-preview');
  await expect(page.locator('.mimo-sprite')).toHaveCount(0);
  release();
  await expect(box).toHaveAttribute('data-asset', 'frames');
  const after = await box.boundingBox();
  expect(after!.width).toBe(before!.width); expect(after!.height).toBe(before!.height);
  await expect(page.locator('.mimo-companion')).toHaveAttribute('data-state', 'idle');
});

for (const kind of ['opaque', 'dimensions', 'empty', 'not-png']) {
  test(`rejects ${kind} production frames without exposing partial animation`, async ({ page }) => {
    await page.goto('/');
    const image = kind === 'not-png' ? Buffer.from('not a PNG') : Buffer.from(await png(page, kind), 'base64');
    await page.route('**/animation_manifest.json', (route) => route.fulfill({ json: manifest({ wave: { ...action(['frames/wave/001.png']), frameDurationMs: 800 } }) }));
    await page.route('**/frames/wave/*.png', (route) => route.fulfill({ contentType: 'image/png', body: image }));
    await page.reload();
    await page.getByRole('button', { name: 'Wave to Mimo' }).click();
    await expect(page.locator('.mimo-companion')).toHaveAttribute('data-state', 'wave');
    await expect(page.locator('.mimo-companion')).toContainText('Static preview');
    await expect(page.locator('.mimo-sprite')).toHaveCount(0);
    await expect(page.locator('.mimo-companion')).toHaveAttribute('data-state', 'idle');
  });
}

for (const viewport of [{ width: 360, height: 800 }, { width: 1440, height: 1000 }]) {
  test(`verified idle loops and decoded frames are reused at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const image = Buffer.from(await png(page), 'base64');
    const files = ['frames/idle/001.png', 'frames/idle/002.png'];
    let requests = 0;
    await page.route('**/animation_manifest.json', (route) => route.fulfill({ json: manifest({ idle: action(files, true) }) }));
    await page.route('**/frames/idle/*.png', (route) => { requests++; return route.fulfill({ contentType: 'image/png', body: image }); });
    await page.reload();
    const sprite = page.locator('.mimo-sprite');
    await expect(sprite).toBeVisible();
    await expect(sprite).toHaveAttribute('data-frame', '1');
    await expect(sprite).toHaveAttribute('data-frame', '0');
    await expect(page.locator('.mimo-companion')).toHaveAttribute('data-state', 'idle');
    await page.getByRole('button', { name: 'Minimize Mimo' }).click();
    await page.getByRole('button', { name: 'Restore Mimo' }).click();
    await expect(sprite).toBeVisible();
    expect(requests).toBe(2);
    expect(await sprite.evaluate((el: HTMLCanvasElement) => el.getContext('2d')!.getImageData(0, 0, 1, 1).data[3])).toBe(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(sprite).toHaveAttribute('data-frame', '0');
    await page.waitForTimeout(1100);
    await expect(sprite).toHaveAttribute('data-frame', '0');
  });
}

test('candidate frames stay in preview; local validator generates ordered review and rejects opaque files', async ({ page }) => {
  await page.goto('/');
  const image = Buffer.from(await png(page), 'base64');
  const animation = { ...action(['frames/wave/001.png'], false, 'candidate'), visualReview: false };
  let requested = false;
  await page.route('**/animation_manifest.json', (route) => route.fulfill({ json: manifest({ wave: animation }) }));
  await page.route('**/frames/wave/*.png', (route) => { requested = true; return route.fulfill({ contentType: 'image/png', body: image }); });
  await page.reload();
  await page.getByRole('button', { name: 'Wave to Mimo' }).click();
  await expect(page.locator('.mimo-companion')).toHaveAttribute('data-state', 'idle');
  expect(requested).toBe(false);
  const root = resolve('artifacts/mimo-test-fixtures');
  await mkdir(resolve(root, 'frames/wave'), { recursive: true });
  await writeFile(resolve(root, 'frames/wave/001.png'), image);
  const file = resolve(root, 'manifest.json');
  await writeFile(file, JSON.stringify(manifest({ wave: animation })));
  const run = promisify(execFile);
  const result = await run(process.execPath, ['scripts/validate-mimo-assets.mjs', file]);
  expect(result.stdout).toContain('Candidates: wave');
  expect(await readFile('artifacts/mimo-frame-review.html', 'utf8')).toContain('wave frame 1');
  await writeFile(resolve(root, 'frames/wave/001.png'), Buffer.from(await png(page, 'opaque'), 'base64'));
  await expect(run(process.execPath, ['scripts/validate-mimo-assets.mjs', file])).rejects.toMatchObject({ code: 1 });
});
