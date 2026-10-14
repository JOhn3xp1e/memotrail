import { test, expect, devices, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const titles = ["Every life has a story.", "Keep the little moments.", "Relive what matters.", "Some stories are for tomorrow.", "Your memories stay yours."];
async function screen(page: Page, index: number, focused = true) {
  await expect(page.getByRole("heading", { name: titles[index], exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  if (focused) await expect(page.getByRole("heading", { name: titles[index], exact: true })).toBeFocused();
  await expect(page.getByLabel(`Go to introduction step ${index + 1}`, { exact: true })).toHaveAttribute("aria-current", "step");
}
async function state(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open("memotrail"); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const tables: Record<string, unknown[]> = {};
    for (const table of ["memories", "media", "collections", "tags", "memoryTags", "timeCapsules", "timeCapsuleMedia", "settings"]) {
      tables[table] = await new Promise<unknown[]>((resolve) => { const request = db.transaction(table).objectStore(table).getAll(); request.onsuccess = () => resolve(request.result); });
    }
    db.close(); return tables;
  });
}
async function skip(page: Page) {
  await page.getByRole("button", { name: "Skip introduction", exact: true }).click();
  await expect(page.locator(".app-shell")).toBeVisible(); await expect(page).toHaveURL(/\/$/);
}
test("fresh launch shows only the introduction, never flashes the dashboard, and skip persists across pages/reloads", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { journalFlashed: boolean }).journalFlashed = false;
    new MutationObserver(() => { if (document.querySelector(".app-shell")) (window as unknown as { journalFlashed: boolean }).journalFlashed = true; }).observe(document, { subtree: true, childList: true });
  });
  await page.goto("/add"); await screen(page, 0); await expect(page).toHaveURL(/\/introduction$/);
  expect(await page.evaluate(() => (window as unknown as { journalFlashed: boolean }).journalFlashed)).toBe(false);
  await expect(page.locator(".app-shell,.mimo-companion")).toHaveCount(0);
  const initial = await state(page); expect(initial.memories).toHaveLength(0); expect(initial.collections).toHaveLength(0);
  await skip(page); await page.reload(); await expect(page.locator(".app-shell")).toBeVisible(); await expect(page.locator(".onboarding")).toHaveCount(0);
  expect((await state(page)).settings).toContainEqual({ key: "onboarding", value: JSON.stringify({ completed: true, step: 0 }) });
  await page.goto("/add"); await expect(page.getByRole("heading", { name: "What would you like to remember?" })).toBeVisible();
});
test("complete all five chapters with keyboard/back controls, refresh midway resumes, and privacy note is visible", async ({ page }) => {
  await page.goto("/"); await screen(page, 0);
  await page.getByRole("button", { name: "Begin Your Story" }).click(); await screen(page, 1);
  await page.keyboard.press("ArrowRight"); await screen(page, 2);
  await expect(page.getByText("Memory Rewind", { exact: true })).toBeVisible();
  await page.reload(); await screen(page, 2);
  await page.getByRole("button", { name: "Back", exact: true }).click(); await screen(page, 1);
  await page.getByRole("button", { name: "Next", exact: true }).click(); await screen(page, 2);
  await page.getByRole("button", { name: "Next", exact: true }).click(); await screen(page, 3);
  await page.getByRole("button", { name: "Next", exact: true }).click(); await screen(page, 4);
  await expect(page.getByText("Clearing browser data or uninstalling the app may remove local memories. Back up regularly.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Start Collecting Memories" }).click(); await expect(page).toHaveURL(/\/$/); await expect(page.locator(".app-shell")).toBeVisible();
  await page.reload(); await expect(page.locator(".onboarding")).toHaveCount(0); await expect(page.locator(".app-shell")).toBeVisible();
});
for (const existing of ["memory", "collection", "capsule"]) test(`existing ${existing} is automatically onboarded without touching its data`, async ({ page }) => {
  await page.goto("/manifest.webmanifest");
  await page.evaluate(async (existing) => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open("memotrail", 40);
      request.onupgradeneeded = () => {
        const definitions: Record<string, string[]> = { memories: ["memoryDate", "createdAt", "updatedAt", "favorite", "collectionId"], media: ["memoryId", "createdAt", "[memoryId+order]"], collections: ["name", "createdAt", "updatedAt"], tags: ["name"], memoryTags: ["memoryId", "tagId"], timeCapsules: ["createdAt", "unlockAt", "status"], timeCapsuleMedia: ["capsuleId", "[capsuleId+order]"], settings: [] };
        for (const [table, indexes] of Object.entries(definitions)) {
          const store = request.result.createObjectStore(table, { keyPath: table === "settings" ? "key" : table === "memoryTags" ? ["memoryId", "tagId"] : "id" });
          for (const index of indexes) store.createIndex(index, index.startsWith("[") ? index.slice(1, -1).split("+") : index, { unique: table === "tags" });
        }
      };
      request.onsuccess = () => resolve(request.result);
    });
    const table = existing === "memory" ? "memories" : existing === "collection" ? "collections" : "timeCapsules";
    const tx = db.transaction(table, "readwrite");
    tx.objectStore(table).add(existing === "memory" ? { id: "kept", title: "My saved story", description: "Never alter this", memoryDate: "2025-10-01", createdAt: 1, updatedAt: 1, favorite: true, mood: "happy" } : existing === "collection" ? { id: "kept", name: "My saved album", description: "Never alter this", createdAt: 1, updatedAt: 1 } : { id: "kept", title: "My saved letter", message: "Never alter this", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z", unlockAt: "2030-01-01T00:00:00Z", status: "sealed" });
    await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); }); db.close();
  }, existing);
  const before = await state(page); await page.goto("/settings"); await expect(page.locator(".app-shell")).toBeVisible(); await expect(page.locator(".onboarding")).toHaveCount(0);
  const after = await state(page); for (const key of Object.keys(before).filter((key) => key !== "settings")) expect(after[key]).toEqual(before[key]);
  expect(after.settings).toContainEqual({ key: "onboarding", value: JSON.stringify({ completed: true, step: 0 }) });
});
test("Settings replay exits to Settings, preserves preferences/journal, refresh remains replay, and unknown return URLs are safe", async ({ page }) => {
  await page.goto("/"); await screen(page, 0); await skip(page); await page.goto("/settings");
  await page.getByLabel("What should we call you?").fill("Our memory keeper"); await page.getByRole("button", { name: "Save name", exact: true }).click();
  await expect(page.getByRole("button", { name: "Saved", exact: true })).toBeVisible();
  const before = await state(page);
  await page.getByRole("link", { name: "View Introduction Again" }).click(); await screen(page, 0);
  await page.getByRole("button", { name: "Begin Your Story" }).click(); await screen(page, 1);
  await page.reload(); await screen(page, 0); await page.keyboard.press("Escape"); await expect(page).toHaveURL(/\/settings$/);
  expect(await state(page)).toEqual(before);
  await page.getByRole("link", { name: "View Introduction Again" }).click(); await screen(page, 0);
  await page.getByLabel("Go to introduction step 5", { exact: true }).click(); await screen(page, 4);
  await page.getByRole("button", { name: "Start Collecting Memories" }).click(); await expect(page).toHaveURL(/\/settings$/); expect(await state(page)).toEqual(before);
  await page.getByRole("link", { name: "View Introduction Again" }).click(); await screen(page, 0);
  await page.evaluate(() => { history.replaceState({ ...history.state, usr: { returnTo: "//outside.example" } }, "", location.href); });
  await page.reload(); await screen(page, 0); await page.getByRole("button", { name: "Exit introduction" }).click(); await expect(page).toHaveURL(/\/$/);
  expect(await state(page)).toEqual(before);
});
test("first introduction and Settings replay work after caching offline", async ({ page, context }) => {
  await page.goto("/"); await screen(page, 0); await page.getByRole("button", { name: "Begin Your Story" }).click(); await screen(page, 1);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; }); await page.reload(); await screen(page, 1);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true); await page.reload(); await screen(page, 1);
  await expect.poll(() => page.locator(".intro-polaroid img").evaluateAll((images) => images.every((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await skip(page); await page.reload(); await expect(page.locator(".app-shell")).toBeVisible();
  await page.goto("/settings"); await page.getByRole("link", { name: "View Introduction Again" }).click(); await screen(page, 0);
  await page.getByRole("button", { name: "Exit introduction" }).click(); await expect(page).toHaveURL(/\/settings$/);
});
test.describe("Android onboarding", () => {
  test.use({ hasTouch: true, isMobile: true, userAgent: devices["Pixel 7"].userAgent });
  test("all phone widths and short screens keep buttons visible, contrast, and no overflow", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/"); await screen(page, 0);
    for (const width of [360, 375, 390, 412, 430]) for (const height of [640, 850]) {
      await page.setViewportSize({ width, height });
      for (let index = 0; index < 5; index++) {
        await page.getByLabel(`Go to introduction step ${index + 1}`, { exact: true }).click(); await screen(page, index, false);
        const button = page.locator(".intro-next"); const bounds = await button.boundingBox(); expect(bounds!.y).toBeGreaterThanOrEqual(0); expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height); expect(bounds!.height).toBeGreaterThanOrEqual(44);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
    await page.setViewportSize({ width: 390, height: 850 }); await page.getByLabel("Go to introduction step 1", { exact: true }).click(); await screen(page, 0);
    await page.screenshot({ path: "artifacts/introduction-mobile.png" });
  });
  test("real touch swipes move chapters; vertical gestures do not; standalone emulation works", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 850 });
    await page.addInitScript(() => { const native = matchMedia.bind(window); window.matchMedia = (query) => query === "(display-mode: standalone)" ? { ...native(query), matches: true } as MediaQueryList : native(query); });
    await page.goto("/"); await screen(page, 0);
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 290, y: 250 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 110, y: 250 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await screen(page, 1);
    await page.locator(".intro-chapter").dispatchEvent("pointerdown", { pointerType: "touch", pointerId: 7, clientX: 150, clientY: 150 });
    await page.locator(".intro-chapter").dispatchEvent("pointerup", { pointerType: "touch", pointerId: 7, clientX: 155, clientY: 250 }); await screen(page, 1, false);
  });
});
test("tablet/desktop replay respects both saved themes without changing them", async ({ page }) => {
  await page.goto("/"); await screen(page, 0); await skip(page);
  for (const theme of ["light", "dark"]) {
    await page.goto("/settings"); await page.getByRole("button", { name: theme === "dark" ? "After hours" : "A little light" }).click();
    for (const width of [768, 1440]) {
      await page.setViewportSize({ width, height: 1000 }); await page.getByRole("link", { name: "View Introduction Again" }).click(); await screen(page, 0);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width === 1440 && theme === "dark") await page.screenshot({ path: "artifacts/introduction-desktop.png" });
      await page.getByRole("button", { name: "Exit introduction" }).click(); await expect(page).toHaveURL(/\/settings$/);
      await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*dark)/);
    }
  }
});
test("failed completion stays on the introduction and retry works without resetting data", async ({ page }) => {
  await page.goto("/"); await screen(page, 0);
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    (window as unknown as { restorePut: () => void }).restorePut = () => { IDBObjectStore.prototype.put = put; };
    IDBObjectStore.prototype.put = function(value, key) { if (this.name === "settings" && value.key === "onboarding") throw new DOMException("No space", "QuotaExceededError"); return key === undefined ? put.call(this, value) : put.call(this, value, key); };
  });
  await page.getByRole("button", { name: "Skip introduction" }).click(); await expect(page.getByRole("alert")).toContainText("could not be saved as complete"); await screen(page, 0, false);
  await page.evaluate(() => (window as unknown as { restorePut: () => void }).restorePut()); await skip(page);
});
test("changing motion preferences while open preserves hooks, navigation and heading focus", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" }); await page.goto("/"); await screen(page, 0);
  await page.getByRole("button", { name: "Begin Your Story" }).click(); await screen(page, 1);
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.keyboard.press("ArrowRight"); await screen(page, 2);
  await page.emulateMedia({ reducedMotion: "no-preference" }); await page.keyboard.press("ArrowRight"); await screen(page, 3);
  await expect(page.locator(".intro-screen")).toHaveCSS("opacity", "1"); expect(errors).toEqual([]);
});
