import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { searchLocalMemories, captionTemplates, tidyStory, parseMemorySearch } from '../src/lib/mimo-assistant';
import { availableLocalModels, initializeLocalModel, type LocalModelAdapter } from '../src/services/mimo-local-model';
import type { Memory, Collection } from '../src/types/memory';

const records: Memory[] = [
  { id: 'beach-one', title: 'Beach with Ana', description: '  Ana and I   walked by the sea.\n\n\nWe saw 3 boats.  ', memoryDate: '2026-08-12', createdAt: 1, updatedAt: 1, mood: 'peaceful', favorite: true, collectionId: 'summer' },
  { id: 'garden-two', title: 'Garden morning', description: 'Roses in the garden.', memoryDate: '2026-08-20', createdAt: 2, updatedAt: 2, mood: 'happy', favorite: false },
  { id: 'beach-old', title: 'Another beach day', description: 'Wind in the dunes.', memoryDate: '2025-07-01', createdAt: 3, updatedAt: 3, mood: 'adventurous', favorite: false, collectionId: 'summer' },
];
const collections: Collection[] = [{ id: 'summer', name: 'Summer travels', description: '', createdAt: 1, updatedAt: 1 }];
async function seed(page: Page) {
  await page.goto('/');
  await page.evaluate(async ({ memories, collections }) => {
    const db = await new Promise<IDBDatabase>((resolve) => { const request = indexedDB.open('memotrail'); request.onsuccess = () => resolve(request.result); });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['memories', 'collections'], 'readwrite');
      memories.forEach((memory) => tx.objectStore('memories').put(memory));
      collections.forEach((collection) => tx.objectStore('collections').put(collection));
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    }); db.close();
  }, { memories: records, collections });
}
async function open(page: Page) {
  await page.getByRole('button', { name: 'Chat with Mimo' }).click();
  await expect(page.getByRole('dialog', { name: 'A little help from Mimo' })).toBeVisible();
}
async function search(page: Page, query: string) {
  await page.getByLabel('Ask Mimo to find memories').fill(query);
  await page.getByRole('button', { name: 'Search with Mimo' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Looking through' })).toHaveCount(0);
}

test('local rules search title, description, dates, collections, moods and favorites without inventing facts', () => {
  const find = (query: string) => searchLocalMemories(records, collections, query).memories.map((memory) => memory.id);
  expect(find('Show my beach memories')).toEqual(['beach-one', 'beach-old']);
  expect(find('Find memories from August 2026')).toEqual(['garden-two', 'beach-one']);
  expect(find('Show my favorite memories')).toEqual(['beach-one']);
  expect(find('Summer travels')).toEqual(['beach-one', 'beach-old']);
  expect(find('peaceful memories')).toEqual(['beach-one']);
  expect(find('3 boats')).toEqual(['beach-one']);
  expect(find('2026-08-12')).toEqual(['beach-one']);
  expect(find('Show all memories')).toHaveLength(3);
  expect(find('mountain')).toEqual([]);
  expect(parseMemorySearch('2026-02-30').error).toBeTruthy();
  expect(parseMemorySearch('2026-99-99').error).toBeTruthy();
  expect(captionTemplates(records[0]!)[2]).toContain(records[0]!.description.trim());
  expect(tidyStory(records[0]!.description)).toBe('Ana and I walked by the sea.\n\nWe saw 3 boats.');
  expect(tidyStory('')).toBe('');
});

test('future model initialization requires consent, tested runtime, backend and declared storage', async () => {
  let downloads = 0;
  const adapter: LocalModelAdapter = { id: 'test-only', testedInMemoTrail: true, backend: 'wasm', downloadBytes: 10, storageBytes: 20, initialize: async () => { downloads++; }, generate: async () => 'test-only', dispose: async () => {} };
  const support = { secureContext: true, webGpu: false, wasm: true, storageAvailableBytes: 100 };
  const signal = new AbortController().signal;
  await expect(initializeLocalModel(adapter, false, support, signal)).rejects.toThrow(/Consent/);
  await expect(initializeLocalModel({ ...adapter, testedInMemoTrail: false }, true, support, signal)).rejects.toThrow(/tested/);
  await expect(initializeLocalModel(adapter, true, { ...support, storageAvailableBytes: 1 }, signal)).rejects.toThrow(/storage/);
  await expect(initializeLocalModel(adapter, true, { ...support, wasm: false }, signal)).rejects.toThrow(/backend/);
  expect(downloads).toBe(0); expect(availableLocalModels).toHaveLength(0);
  await initializeLocalModel(adapter, true, support, signal); expect(downloads).toBe(1);
});

test('chat searches multiple saved memories and empty results; links open personal details', async ({ page }) => {
  await seed(page); await open(page);
  await expect(page.getByLabel('Ask Mimo to find memories')).toBeFocused();
  await page.evaluate(() => {
    const states: string[] = [];
    const observer = new MutationObserver((records) => { for (const record of records) { if (record.oldValue) states.push(record.oldValue); states.push((record.target as HTMLElement).dataset.state ?? ''); } });
    observer.observe(document.querySelector('.mimo-companion')!, { attributes: true, attributeFilter: ['data-state'], attributeOldValue: true });
    (window as Window & { mimoReactionHistory?: { states: string[]; observer: MutationObserver } }).mimoReactionHistory = { states, observer };
  });
  await search(page, 'Show my beach memories');
  await expect(page.locator('.mimo-result-card')).toHaveCount(2);
  await expect(page.locator('.mimo-companion')).toHaveAttribute('data-state', 'happy');
  const history = await page.evaluate(() => {
    const history = (window as Window & { mimoReactionHistory?: { states: string[]; observer: MutationObserver } }).mimoReactionHistory!;
    history.observer.disconnect(); return history.states;
  });
  expect(history).toContain('thinking');
  await search(page, 'Find memories from August 2026');
  await expect(page.locator('.mimo-exchange').last().locator('.mimo-result-card')).toHaveCount(2);
  await search(page, 'Show my favorite memories');
  await expect(page.locator('.mimo-exchange').last().locator('.mimo-result-card')).toHaveCount(1);
  await search(page, 'unicorn parade');
  await expect(page.locator('.mimo-exchange').last()).toContainText('No saved memories matched');
  await expect(page.locator('.mimo-companion')).toHaveAttribute('data-state', 'idle');
  await page.getByRole('checkbox', { name: 'Mimo reactions' }).uncheck();
  await search(page, 'Summer travels');
  await expect(page.locator('.mimo-exchange').last().locator('.mimo-result-card')).toHaveCount(2);
  await expect(page.locator('.mimo-companion')).toHaveAttribute('data-state', 'idle');
  await page.getByRole('link', { name: /Beach with Ana/ }).first().click();
  await expect(page).toHaveURL(/\/memories\/beach-one$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Beach with Ana' })).toBeVisible();
});

test('captions and mechanical story drafts are labeled and never mutate saved records', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await seed(page); await open(page); await search(page, 'Show my favorite memories');
  await page.getByRole('button', { name: 'Caption templates', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Writing workspace' })).toContainText('Rule-based');
  await page.getByRole('button', { name: /Template 3/ }).click();
  await expect(page.getByLabel('Review and edit your draft')).toHaveValue(`Beach with Ana\n${records[0]!.description.trim()}`);
  await page.getByRole('button', { name: 'Copy draft' }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  await page.getByRole('button', { name: 'Tidy story', exact: true }).click();
  await expect(page.getByLabel('Review and edit your draft')).toHaveValue('Ana and I walked by the sea.\n\nWe saw 3 boats.');
  await page.getByLabel('Review and edit your draft').fill('My edited draft');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Chat with Mimo' })).toBeFocused();
  const original = await page.evaluate(async () => new Promise<string>((resolve) => { const req = indexedDB.open('memotrail'); req.onsuccess = () => { const db = req.result; const read = db.transaction('memories').objectStore('memories').get('beach-one'); read.onsuccess = () => { resolve(read.result.description); db.close(); }; }; }));
  expect(original).toBe(records[0]!.description);
  await open(page); await expect(page.locator('.mimo-exchange')).toHaveCount(0);
});

test('mobile and desktop themes, focus, capabilities, and navigation clearance', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 }); await seed(page); await open(page);
  const panel = page.getByRole('dialog');
  const nav = await page.locator('.bottom-nav').boundingBox(); const rect = await panel.boundingBox();
  expect(rect!.x).toBeGreaterThanOrEqual(0); expect(rect!.y + rect!.height).toBeLessThan(nav!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/mimo-assistant-mobile-light.png' });
  const accessibility = await new AxeBuilder({ page }).include('.mimo-assistant-panel').analyze();
  expect(accessibility.violations).toEqual([]);
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Switch to dark theme' }).click(); await open(page);
  await page.screenshot({ path: 'artifacts/mimo-assistant-mobile-dark.png' });
  await page.getByText('Optional on-device AI', { exact: true }).click();
  await page.getByRole('button', { name: 'Check browser capabilities' }).click();
  await expect(panel).toContainText('WebGPU adapter:');
  await expect(panel).toContainText('No local model is installed or tested');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'artifacts/mimo-assistant-desktop-dark.png' });
  const desktop = await panel.boundingBox(); expect(desktop!.width).toBeLessThan(500);
});

test('installed PWA lazy-loads the assistant and searches offline without external processing', async ({ page, context }) => {
  test.setTimeout(60000);
  const external: string[] = [], posts: string[] = [];
  page.on('request', (request) => { if (!request.url().startsWith('http://127.0.0.1:4173') && !request.url().startsWith('blob:') && !request.url().startsWith('data:')) external.push(request.url()); if (request.method() !== 'GET') posts.push(request.url()); });
  await seed(page);
  expect(await page.evaluate(() => performance.getEntriesByType('resource').some((entry) => entry.name.includes('/assets/mimo-assistant-')))).toBe(false);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; }); await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true); await page.reload(); await open(page);
  await search(page, 'Show my beach memories'); await expect(page.locator('.mimo-result-card')).toHaveCount(2);
  await page.keyboard.press('Escape'); await open(page);
  await expect(page.locator('.mimo-exchange')).toHaveCount(0);
  expect(external).toEqual([]); expect(posts).toEqual([]);
});
