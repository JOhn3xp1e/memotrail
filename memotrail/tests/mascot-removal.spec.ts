import { test, expect } from '@playwright/test';

test('Mimo is absent from desktop, mobile and offline pages', async ({ page, context }) => {
  const mascotRequests: string[] = [];
  page.on('request', (request) => { if (/\/assets\/mimo\/|\/MASCOTMIMO\/|\/assets\/mimo-assistant-/.test(request.url())) mascotRequests.push(request.url()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  for (const path of ['/', '/add', '/timeline', '/jar', '/capsules', '/rewind', '/settings']) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('.mimo-companion, .mimo-assistant-panel')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Chat with Mimo' })).toHaveCount(0);
  }
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await expect(page.locator('.bottom-nav')).toBeVisible();
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.mimo-companion, .mimo-assistant-panel')).toHaveCount(0);
  expect(mascotRequests).toEqual([]);
});
