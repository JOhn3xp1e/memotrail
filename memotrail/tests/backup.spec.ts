import { test, expect, devices, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { unzipSync, zipSync } from "fflate";
import AxeBuilder from "@axe-core/playwright";

const tables = ["memories", "media", "collections", "tags", "memoryTags", "timeCapsules", "timeCapsuleMedia"];
async function seed(page: Page) {
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => { const r = indexedDB.open("memotrail"); r.onsuccess = () => resolve(r.result); });
    const tx = db.transaction(["memories", "media", "collections", "tags", "memoryTags", "timeCapsules", "timeCapsuleMedia"], "readwrite");
    const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII="), (c) => c.charCodeAt(0));
    for (let i = 1; i <= 2; i++) {
      tx.objectStore("memories").add({ id: `m${i}`, title: `Memory ${i}`, description: `Offline story ${i}`, memoryDate: "2025-06-07", createdAt: i, updatedAt: i, favorite: true, mood: "happy", collectionId: "c1" });
      tx.objectStore("media").add({ id: `p${i}`, memoryId: `m${i}`, type: "image", blob: new Blob([png], { type: "image/png" }), mimeType: "image/png", size: png.length, createdAt: 1, order: 0 });
    }
    tx.objectStore("collections").add({ id: "c1", name: "Our days", description: "Together", createdAt: 1, updatedAt: 1, coverMediaId: "p1" });
    tx.objectStore("tags").add({ id: "t1", name: "family" }); tx.objectStore("memoryTags").add({ memoryId: "m1", tagId: "t1" });
    tx.objectStore("timeCapsules").add({ id: "cap1", title: "Tomorrow", message: "Sealed private letter", recipientName: "Me", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z", unlockAt: "2030-01-01T00:00:00Z", status: "sealed", memoryId: "m1" });
    tx.objectStore("timeCapsuleMedia").add({ id: "cp1", capsuleId: "cap1", blob: new Blob([png], { type: "image/png" }), mimeType: "image/png", createdAt: "2025-01-01T00:00:00Z", order: 0 });
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); db.close();
  });
  await page.reload(); await expect(page.locator(".backup-stats")).toContainText("Not yet confirmed");
}
async function snapshot(page: Page) {
  return page.evaluate(async (tables) => {
    const db = await new Promise<IDBDatabase>((resolve) => { const r = indexedDB.open("memotrail"); r.onsuccess = () => resolve(r.result); });
    const values: Record<string, unknown> = {};
    for (const table of tables) {
      const rows = await new Promise<Record<string, unknown>[]>((resolve) => { const r = db.transaction(table).objectStore(table).getAll(); r.onsuccess = () => resolve(r.result); });
      values[table] = await Promise.all(rows.map(async (row) => {
        if (!(row.blob instanceof Blob)) return row;
        const { blob, ...rest } = row;
        return { ...rest, blobType: blob.type, bytes: Array.from(new Uint8Array(await blob.arrayBuffer())) };
      }));
    }
    db.close(); return values;
  }, tables);
}
async function exportFile(page: Page) {
  const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Export All Data" }).click();
  const file = await download; const bytes = await readFile((await file.path())!);
  await page.getByRole("button", { name: "I saved this backup" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Backup saved" })).toBeVisible(); return bytes;
}
async function select(page: Page, buffer: Buffer) {
  await page.getByLabel("Select ZIP backup").setInputFiles({ name: "MemoTrail.zip", mimeType: "application/zip", buffer });
  await expect(page.getByRole("dialog")).toBeVisible();
}
for (const mobile of [false, true]) {
  test.describe(mobile ? "Android Chrome emulation" : "Desktop", () => {
  if (mobile) test.use({ viewport: { width: 393, height: 851 }, hasTouch: true, isMobile: true, userAgent: devices["Pixel 7"].userAgent });
  test(`offline round trip, duplicates and editing (${mobile ? "phone layout / standalone emulation" : "desktop Chrome"})`, async ({ page, context }) => {
    test.setTimeout(120_000);
    if (mobile) {
      await page.setViewportSize({ width: 393, height: 851 });
      await page.addInitScript(() => { const native = window.matchMedia.bind(window); window.matchMedia = (query) => query === "(display-mode: standalone)" ? { ...native(query), matches: true } as MediaQueryList : native(query); });
    }
    await page.goto("/settings"); await expect(page.getByRole("heading", { name: "Storage & Backup" })).toBeVisible();
    await seed(page); const original = await snapshot(page);
    await page.evaluate(async () => { await navigator.serviceWorker.ready; }); await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await context.setOffline(true); await page.reload();
    const archive = await exportFile(page);
    await page.evaluate(async (tables) => {
      const db = await new Promise<IDBDatabase>((resolve) => { const r = indexedDB.open("memotrail"); r.onsuccess = () => resolve(r.result); });
      const tx = db.transaction(tables, "readwrite"); for (const table of tables) tx.objectStore(table).clear();
      await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); }); db.close();
    }, tables);
    await select(page, archive); await expect(page.getByRole("dialog")).toContainText("2 memories");
    await page.getByRole("button", { name: "Restore with Merge" }).click(); await expect(page.getByRole("dialog")).toHaveCount(0); expect(await snapshot(page)).toEqual(original);
    await select(page, archive); await expect(page.getByRole("dialog")).toContainText("9 identical records");
    await page.getByRole("button", { name: "Restore with Merge" }).click(); await expect(page.getByRole("dialog")).toHaveCount(0); expect(await snapshot(page)).toEqual(original);
    await page.goto("/memories/m1"); await expect(page.locator(".details-story")).toContainText("Offline story 1");
    await expect.poll(() => page.locator(".details-viewer-image img").evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.goto("/add?id=m1"); await page.getByLabel("What made it special?").fill("Edited offline"); await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\/timeline$/); await page.goto("/memories/m1"); await expect(page.locator(".details-story")).toContainText("Edited offline");
    await page.goto("/settings"); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `artifacts/phase7-${mobile ? "mobile" : "desktop"}.png`, fullPage: true });
  });
  });
}
test("conflicting merge blocks; Replace needs confirmation and real IndexedDB abort preserves the journal", async ({ page }) => {
  await page.goto("/settings"); await seed(page); const archive = await exportFile(page);
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => { const r = indexedDB.open("memotrail"); r.onsuccess = () => resolve(r.result); });
    const tx = db.transaction("memories", "readwrite"); const store = tx.objectStore("memories"); const r = store.get("m1"); r.onsuccess = () => store.put({ ...r.result, description: "Newer story" });
    await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); }); db.close();
  });
  const before = await snapshot(page); await select(page, archive);
  await expect(page.getByRole("dialog")).toContainText("ID conflict"); await expect(page.getByRole("button", { name: "Restore with Merge" })).toBeDisabled();
  await page.getByRole("radio", { name: /Replace Existing Data/ }).check(); await expect(page.getByRole("button", { name: "Restore and Replace" })).toBeDisabled();
  await page.getByRole("checkbox", { name: /I understand/ }).check();
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function(value, key) {
      if (this.name === "collections") { this.transaction.abort(); throw new DOMException("Simulated interrupted restore", "AbortError"); }
      return key === undefined ? original.call(this, value) : original.call(this, value, key);
    };
  });
  await page.getByRole("button", { name: "Restore and Replace" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible(); expect(await snapshot(page)).toEqual(before);
  await page.reload(); await select(page, archive); await page.getByRole("radio", { name: /Replace Existing Data/ }).check(); await page.getByRole("checkbox", { name: /I understand/ }).check();
  await page.getByRole("button", { name: "Restore and Replace" }).click(); await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(JSON.stringify(await snapshot(page))).toContain("Offline story 1");
});
test("corrupt and missing-media archives report errors before preview", async ({ page }) => {
  await page.goto("/settings"); await seed(page); const archive = await exportFile(page); const before = await snapshot(page);
  const files = unzipSync(archive); delete files["media/media/0.bin"];
  for (const buffer of [Buffer.from("corrupt zip"), Buffer.from(zipSync(files))]) {
    await page.getByLabel("Select ZIP backup").setInputFiles({ name: "bad.zip", mimeType: "application/zip", buffer });
    await expect(page.locator(".storage-backup").getByRole("alert")).toBeVisible(); await expect(page.getByRole("dialog")).toHaveCount(0); expect(await snapshot(page)).toEqual(before);
  }
});
test("reminders dismiss and disable; persistence can be requested again", async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator.storage, "persist", { value: async () => false, configurable: true }); });
  await page.goto("/settings"); await seed(page); await expect(page.locator(".backup-reminder")).toBeVisible();
  await page.getByRole("button", { name: "Remind me next week" }).click(); await expect(page.locator(".backup-reminder")).toHaveCount(0);
  await page.reload(); await expect(page.locator(".backup-reminder")).toHaveCount(0);
  await page.getByRole("switch", { name: "Gentle backup reminders" }).click(); await expect(page.getByRole("switch", { name: "Gentle backup reminders" })).not.toBeChecked(); await page.reload(); await expect(page.getByRole("switch", { name: "Gentle backup reminders" })).not.toBeChecked();
  await page.evaluate(() => { Object.defineProperty(navigator.storage, "persist", { value: async () => true }); });
  await page.getByRole("button", { name: "Request persistent storage" }).click(); await expect(page.getByRole("button", { name: "Storage protection granted" })).toBeVisible();
});
