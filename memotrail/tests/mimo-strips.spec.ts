import { test, expect, devices } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { mimoPackStates, parseMimoManifest } from '../src/lib/mimo-manifest';

test.use({ viewport: { width: 393, height: 851 }, hasTouch: true, isMobile: true, userAgent: devices['Pixel 7'].userAgent });

test('all 14 real strips render exact frame crops, manifest timing and loops on Android-sized Chrome', async ({ page }) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const requestedStrips = new Set<string>();
  page.on('request', (request) => { if (request.url().includes('/assets/mimo/') && request.url().endsWith('.png')) requestedStrips.add(request.url()); });
  const epoch = new Date('2026-10-13T05:00:00Z');
  await page.clock.install({ time: epoch }); await page.clock.pauseAt(epoch);
  await page.goto('/');
  await expect(page.locator('.mimo-sprite-player')).toHaveAttribute('data-asset', 'strip');
  await expect.poll(() => requestedStrips.size).toBe(14);
  await page.clock.runFor(300);
  const floating = await page.locator('.mimo-companion').boundingBox(), nav = await page.locator('.bottom-nav').boundingBox();
  expect(floating!.y + floating!.height).toBeLessThan(nav!.y);
  const size = await page.locator('.mimo-sprite-player').boundingBox(); expect(size!.width).toBeGreaterThanOrEqual(64); expect(size!.width).toBeLessThanOrEqual(88);
  await page.getByRole('button', { name: 'Chat with Mimo' }).tap();
  // React's lazy Suspense commit uses timers as well as the sprite RAF clock.
  await expect.poll(async () => { await page.clock.runFor(300); return page.getByRole('dialog').count(); }).toBe(1);
  await page.clock.runFor(1000);
  await page.getByText('Try a Mimo reaction', { exact: true }).click();
  const raw = JSON.parse(await readFile('public/assets/mimo/manifest.json', 'utf8'));
  const parsed = parseMimoManifest(raw, 'http://127.0.0.1:4173/assets/mimo/manifest.json');
  const canvas = page.locator('.mimo-sprite');
  for (const state of mimoPackStates) {
    await page.getByLabel('Mimo pose').selectOption(state);
    await page.getByRole('button', { name: 'Play reaction', exact: true }).click();
    await expect(page.locator('.mimo-companion')).toHaveAttribute('data-state', state);
    await expect(page.locator('.mimo-sprite-player')).toHaveAttribute('data-asset', 'strip');
    const animation = parsed[state]!;
    let advanced = 0;
    for (let index = 0; index < 8; index++) {
      const target = Math.ceil(index * 1000 / raw.animations[state].fps) + 24;
      await page.clock.runFor(target - advanced); advanced = target;
      await expect(canvas).toHaveAttribute('data-frame', String(index));
      // Compare the rendered canvas with an independent crop of the real PNG.
      const comparison = await canvas.evaluate(async (element: HTMLCanvasElement, { file, index }) => {
        const source = new Image(); source.src = file; await source.decode();
        const reference = document.createElement('canvas'); reference.width = 256; reference.height = 256;
        const ctx = reference.getContext('2d')!; ctx.drawImage(source, index * 256, 0, 256, 256, 0, 0, 256, 256);
        const expected = ctx.getImageData(0, 0, 256, 256).data;
        const actual = element.getContext('2d')!.getImageData(0, 0, 256, 256).data;
        let wrongBytes = 0, maxDelta = 0, first = '';
        // Chrome's CPU/GPU alpha premultiplication can differ by one color level.
        expected.forEach((value, i) => { const delta = Math.abs(value - actual[i]!); maxDelta = Math.max(maxDelta, delta); if (delta > 1) { wrongBytes++; if (!first) first = `${i}: ${value} != ${actual[i]}`; } });
        return { wrongBytes, maxDelta, first, renderedFrame: element.dataset.frame };
      }, { file: animation.frames[0]!.file, index });
      expect(comparison.wrongBytes, `${state} frame ${index}: ${JSON.stringify(comparison)}`).toBe(0);
    }
    await page.screenshot({ path: `artifacts/mimo-reaction-${state}-android.png` });
    await page.clock.runFor(Math.ceil(animation.durationMs) + 32 - advanced);
    if (animation.loop) {
      await expect(page.locator('.mimo-companion')).toHaveAttribute('data-state', state);
      await expect(canvas).toHaveAttribute('data-frame', '0');
    } else await expect(page.locator('.mimo-companion')).toHaveAttribute('data-state', 'idle');
  }
  await page.getByLabel('Mimo pose').selectOption('walk'); await page.getByRole('button', { name: 'Play reaction', exact: true }).click();
  await page.clock.runFor(350); const frame = await canvas.getAttribute('data-frame');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.runFor(3000); await expect(canvas).toHaveAttribute('data-frame', frame!);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.clock.runFor(1000); await expect(canvas).toHaveAttribute('data-frame', '0');
});

test('installed PWA keeps real sprites, assistant and explicit reactions available offline', async ({ page, context }) => {
  test.setTimeout(60000);
  await page.goto('/'); await page.evaluate(async () => { await navigator.serviceWorker.ready; }); await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true); await page.reload();
  await expect(page.locator('.mimo-sprite-player')).toHaveAttribute('data-asset', 'strip');
  await expect(page.locator('.mimo-preview')).toHaveCount(0);
  await page.getByRole('button', { name: 'Chat with Mimo' }).tap();
  await page.getByText('Try a Mimo reaction', { exact: true }).click();
  for (const state of mimoPackStates) {
    await page.getByLabel('Mimo pose').selectOption(state); await page.getByRole('button', { name: 'Play reaction', exact: true }).click();
    await expect(page.locator('.mimo-companion')).toHaveAttribute('data-state', state);
    await expect(page.locator('.mimo-sprite-player')).toHaveAttribute('data-asset', 'strip');
    await expect(page.locator('.mimo-sprite')).toHaveAttribute('data-frame', '0');
  }
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Minimize Mimo' }).click();
  await page.getByRole('button', { name: 'Restore Mimo' }).click(); await expect(page.locator('.mimo-sprite-player')).toHaveAttribute('data-asset', 'strip');
});
