import { closeMimoChat } from './helpers/mimo-chat';
import { test, expect } from '@playwright/test';
import { useMimo } from '../src/stores/mimo';
import { mimoStates, parseMimoManifest, mimoFrameAt } from '../src/lib/mimo-manifest';
test.use({ hasTouch: true, serviceWorkers: 'block' });

test('controller switches every state, guards stale completions, and keeps persistent future states', () => {
  useMimo.setState({ state: 'idle', requestId: 0, temporary: false, minimized: false, rewindOpen: false });
  for (const state of mimoStates) {
    useMimo.getState().play('idle', false);
    useMimo.getState().play(state);
    expect(useMimo.getState().state).toBe(state);
    expect(useMimo.getState().temporary).toBe(!['idle', 'thinking', 'speaking', 'sleep'].includes(state));
  }
  useMimo.getState().play('camera');
  const previous = useMimo.getState().requestId;
  useMimo.getState().play('celebrate');
  useMimo.getState().finish(previous);
  expect(useMimo.getState().state).toBe('celebrate');
  useMimo.getState().finish(useMimo.getState().requestId);
  expect(useMimo.getState().state).toBe('idle');
  useMimo.getState().minimize(true);
  useMimo.getState().play('wave');
  expect(useMimo.getState().state).toBe('idle');
  useMimo.getState().minimize(false);
});

test('Mimo supports Android screens, both themes, keyboard minimize/restore and reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  const mimo = page.locator('.mimo-companion');
  await expect(mimo).toHaveAttribute('data-state', 'idle');
  await expect(mimo).toContainText('Static preview');
  await expect(page.locator('.mimo-preview')).toHaveJSProperty('complete', true);
  await expect(page.locator('.mimo-preview')).toHaveJSProperty('naturalWidth', 256);
  expect(await page.locator('.mimo-preview').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  const bounds = await mimo.boundingBox();
  const navigation = await page.locator('.bottom-nav').boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThan(navigation!.y);
  await page.getByRole('button', { name: 'Chat with Mimo' }).focus();
  await page.keyboard.press('Enter');
  await closeMimoChat(page);
  await expect(mimo).toHaveAttribute('data-state', 'wave');
  await expect(mimo).toHaveAttribute('data-state', 'idle');
  await page.getByRole('button', { name: 'Minimize Mimo' }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Restore Mimo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Restore Mimo' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Chat with Mimo' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Restore Mimo' }).click();
  await expect(page.getByRole('button', { name: 'Chat with Mimo' })).toBeFocused();
  await expect(mimo).toHaveAttribute('data-state', 'idle');
  await page.getByRole('button', { name: 'Chat with Mimo' }).tap();
  await closeMimoChat(page);
  await expect(mimo).toHaveAttribute('data-state', 'wave');
  await expect(mimo).toHaveAttribute('data-state', 'idle');
  await page.screenshot({ path: 'artifacts/mimo-light-android.png' });
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await page.screenshot({ path: 'artifacts/mimo-dark-android.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => page.locator('.mimo-preview').evaluate((el) => getComputedStyle(el).animationName)).toBe('mimo-breathe');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => page.locator('.mimo-preview').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/settings');
  await page.getByRole('switch', { name: 'A little less motion' }).click();
  await expect(page.locator('.mimo-companion')).toHaveAttribute('data-reduced', 'true');
  expect(await page.locator('.mimo-preview').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
});

test('successful memory save and jar reveal trigger camera and happy, returning to idle', async ({ page }) => {
  await page.goto('/add');
  await page.getByLabel('Give this moment a title').fill('Mimo remembers');
  await page.getByRole('button', { name: 'Save memory', exact: true }).click();
  await expect(page).toHaveURL(/\/timeline$/);
  await expect(page.locator('.mimo-companion')).toHaveAttribute('data-state', 'camera');
  // A low-priority greeting must not interrupt the camera response.
  await page.getByRole('button', { name: 'Chat with Mimo' }).click();
  await closeMimoChat(page);
  await expect(page.locator('.mimo-companion')).toHaveAttribute('data-state', 'camera');
  await expect(page.locator('.mimo-companion')).toHaveAttribute('data-state', 'idle');
  await page.goto('/jar');
  await page.getByRole('button', { name: 'Shake the Jar' }).click();
  await expect(page.locator('.mimo-companion')).toHaveAttribute('data-state', 'happy');
  await expect(page.locator('.mimo-companion')).toHaveAttribute('data-state', 'idle');
  // Re-picking a single memory still fires a new response.
  await page.getByRole('button', { name: 'Pick Another' }).click();
  await expect(page.locator('.mimo-companion')).toHaveAttribute('data-state', 'happy');
});

test('verified individual PNG frames advance in order, pause while hidden, and complete', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // Synthetic transparent test frames, never production mascots or reference crops.
  await page.route('**/animation_manifest.json', (route) => route.fulfill({ json: {
    version: 2, format: 'individual-png-frames',
    frameWidth: 16, frameHeight: 16,
    animations: { wave: { status: 'verified', visualReview: true, frames: ['frames/wave/001.png', 'frames/wave/002.png', 'frames/wave/003.png', 'frames/wave/004.png'], frameCount: 4, frameDurationMs: 1000, loop: false } },
  } }));
  await page.route('**/frames/wave/*.png', async (route) => {
    const index = Number(route.request().url().match(/(\d+)\.png$/)![1]) - 1;
    const data = await page.evaluate((index) => {
      const canvas = document.createElement('canvas'); canvas.width = 16; canvas.height = 16;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = ['#f00', '#0f0', '#00f', '#fff'][index]!; ctx.fillRect(4, 4, 8, 8);
      return canvas.toDataURL('image/png').split(',')[1]!;
    }, index);
    await route.fulfill({ contentType: 'image/png', body: Buffer.from(data, 'base64') });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Mimo' }).click();
  await closeMimoChat(page);
  const sprite = page.locator('.mimo-sprite');
  await expect(sprite).toBeVisible();
  await expect(page.locator('.mimo-name')).toContainText('Companion');
  await expect(sprite).toHaveAttribute('data-frame', '1');
  expect(await sprite.evaluate((el: HTMLCanvasElement) => Array.from(el.getContext('2d')!.getImageData(8, 8, 1, 1).data))).toEqual([0, 255, 0, 255]);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const position = await sprite.getAttribute('data-frame');
  await page.waitForTimeout(1100);
  await expect(page.locator('.mimo-companion')).toHaveAttribute('data-state', 'wave');
  expect(await sprite.getAttribute('data-frame')).toBe(position);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(sprite).toHaveAttribute('data-frame', '0');
  await expect(page.locator('.mimo-companion')).toHaveAttribute('data-state', 'idle');
});

test('missing frames and invalid metadata fall back to a labeled static preview', async ({ page }) => {
  await page.route('**/animation_manifest.json', (route) => route.fulfill({ json: { version: 2, format: 'individual-png-frames', frameWidth: 256, frameHeight: 256, animations: { wave: { status: 'verified', visualReview: true, frames: ['frames/missing.png'], frameCount: 1, frameDurationMs: 800, loop: false } } } }));
  await page.route('**/missing.png', (route) => route.fulfill({ status: 404 }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Mimo' }).click();
  await closeMimoChat(page);
  await expect(page.locator('.mimo-companion')).toContainText('Static preview');
  await expect(page.locator('.mimo-companion')).toHaveAttribute('data-state', 'idle');
  await page.route('**/animation_manifest.json', (route) => route.fulfill({ json: { animations: { idle: { fps: 0 } } } }));
  await page.reload();
  await expect(page.locator('.mimo-preview')).toBeVisible();
});

test('manifest rejects reference atlases, incomplete reviews and bad timing; variable durations select exact boundaries', () => {
  const url = 'https://memotrail.local/mimo/animation_manifest.json';
  const entry = { status: 'verified', visualReview: true, frames: ['frames/wave/001.png', 'frames/wave/002.png', 'frames/wave/003.png'], frameCount: 3, frameDurationMs: [100, 200, 300], loop: false };
  const manifest = { version: 2, format: 'individual-png-frames', frameWidth: 256, frameHeight: 256, animations: { wave: entry } };
  const animation = parseMimoManifest(manifest, url).wave!;
  expect([0, 99, 100, 299, 300, 599, 600].map((time) => mimoFrameAt(animation, time, true))).toEqual([0, 0, 1, 1, 2, 2, 2]);
  expect(mimoFrameAt(animation, 600, false)).toBe(0);
  expect(() => parseMimoManifest({ ...manifest, version: 1 }, url)).toThrow(/v2/);
  expect(() => parseMimoManifest({ ...manifest, animations: { memoryjar: entry } }, url)).toThrow(/Unknown/);
  for (const patch of [{ visualReview: false }, { frameCount: 4 }, { frameDurationMs: [0, 100, 200] }, { frames: ['reference/concept.png', ...entry.frames.slice(1)] }]) {
    expect(() => parseMimoManifest({ ...manifest, animations: { wave: { ...entry, ...patch } } }, url)).toThrow();
  }
});

test('capsule sealing celebrates and rewind celebrates inside the closing dialog', async ({ page }) => {
  await page.goto('/capsules/new');
  await page.getByLabel('Capsule title').fill('A letter with Mimo');
  await page.getByLabel('Your letter').fill('Keep the good bits.');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  const future = new Date(); future.setFullYear(future.getFullYear() + 1);
  await page.getByLabel('Unlock date').fill(`${future.getFullYear()}-12-25`);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Seal Capsule', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm and Seal' }).click();
  await expect(page.locator('.mimo-companion')).toHaveAttribute('data-state', 'celebrate');
  await expect(page.locator('.mimo-companion')).toHaveAttribute('data-state', 'idle');
  await page.goto('/add');
  await page.getByLabel('Give this moment a title').fill('Recap with Mimo');
  await page.getByRole('button', { name: 'Save memory', exact: true }).click();
  await expect(page).toHaveURL(/\/timeline$/);
  await page.goto('/rewind');
  await page.locator('.rewind-period').first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(page.locator('.app-shell > .mimo-companion')).toBeHidden();
  const next = dialog.getByRole('button', { name: 'Next slide', exact: true });
  for (let i = 0; i < 20 && await next.isEnabled(); i++) await next.click();
  await expect(dialog.locator('.mimo-companion')).toHaveAttribute('data-state', 'celebrate');
  await expect(dialog.locator('.mimo-companion')).toHaveAttribute('data-state', 'idle');
  await page.keyboard.press('Escape');
  await expect(page.locator('.app-shell > .mimo-companion')).toBeVisible();
});
