import { test, expect } from "./fixtures";

test('Mimo is absent on desktop, mobile and offline pages', async ({ page, context }) => {
  const requests: string[] = [];
  page.on('request', (request) => { if (/\/assets\/mimo\/|\/MASCOTMIMO\/|\/assets\/mimo-assistant-/.test(request.url())) requests.push(request.url()); });
  for (const path of ['/', '/add', '/timeline', '/jar', '/capsules', '/rewind', '/settings']) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('.mimo-companion, .mimo-assistant-panel')).toHaveCount(0);
  }
  await page.setViewportSize({ width: 393, height: 851 });
  await page.goto('/');
  await expect(page.locator('.bottom-nav')).toBeVisible();
  await expect(page.getByRole('button', { name: /Mimo/ })).toHaveCount(0);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('.mimo-companion, .mimo-assistant-panel')).toHaveCount(0);
  expect(requests).toEqual([]);
});
