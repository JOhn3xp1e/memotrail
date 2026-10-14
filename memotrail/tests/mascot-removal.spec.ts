import { test, expect } from '@playwright/test';
test('Mimo remains an interactive offline mascot without an AI assistant', async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.locator('.mimo-sprite-player')).toHaveAttribute('data-asset', 'strip');
  await page.getByRole('button', { name: 'Wave to Mimo' }).click();
  await expect(page.locator('.mimo-companion')).toHaveAttribute('data-state', 'wave');
  await expect(page.locator('.mimo-assistant-panel')).toHaveCount(0);
  await page.getByRole('button', { name: 'Minimize Mimo' }).click();
  await page.getByRole('button', { name: 'Restore Mimo' }).click();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.mimo-sprite-player')).toHaveAttribute('data-asset', 'strip');
  await page.getByRole('button', { name: 'Wave to Mimo' }).click();
  await expect(page.locator('.mimo-companion')).toHaveAttribute('data-state', 'wave');
});
