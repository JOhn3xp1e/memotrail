import { chooseOption } from "./helpers/memo-select";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.use({ timezoneId: "Asia/Singapore" });

test("version 3 adds capsule tables without changing existing memories or photos", async ({ page }) => {
  await page.goto("/manifest.webmanifest");
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("memotrail", 20);
      request.onupgradeneeded = () => {
        const database = request.result;
        const definitions: Record<string, string[]> = {
          memories: ["memoryDate", "createdAt", "updatedAt", "favorite", "collectionId"],
          media: ["memoryId", "createdAt", "[memoryId+order]"],
          collections: ["name", "createdAt", "updatedAt"], tags: ["name"], memoryTags: ["memoryId", "tagId"],
        };
        for (const [name, indexes] of Object.entries(definitions)) {
          const store = database.createObjectStore(name, { keyPath: name === "memoryTags" ? ["memoryId", "tagId"] : "id" });
          for (const index of indexes) store.createIndex(index, index === "[memoryId+order]" ? ["memoryId", "order"] : index, { unique: name === "tags" });
        }
        request.transaction!.objectStore("memories").put({ id: "kept", title: "Keep this memory", description: "Untouched", memoryDate: "2025-10-13", createdAt: 1, updatedAt: 1, favorite: true, mood: "happy", collectionId: "album" });
        request.transaction!.objectStore("media").put({ id: "kept-photo", memoryId: "kept", type: "image", blob: new Blob(["original bytes"], { type: "image/jpeg" }), mimeType: "image/jpeg", size: 14, order: 0, createdAt: 1 });
        request.transaction!.objectStore("collections").put({ id: "album", name: "Keep this album", description: "", coverMediaId: "kept-photo", createdAt: 1, updatedAt: 1 });
      };
      request.onsuccess = () => { request.result.close(); resolve(); };
      request.onerror = () => reject(request.error);
    });
  });
  await page.goto("/capsules");
  await expect(page.getByRole("heading", { name: "A little room for tomorrow." })).toBeVisible();
  const saved = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve) => { const request = indexedDB.open("memotrail"); request.onsuccess = () => resolve(request.result); });
    const read = (table: string, id: string) => new Promise<Record<string, unknown>>((resolve) => { const request = database.transaction(table).objectStore(table).get(id); request.onsuccess = () => resolve(request.result); });
    const [memory, media, collection] = await Promise.all([read("memories", "kept"), read("media", "kept-photo"), read("collections", "album")]);
    const result = { memory, collection, bytes: await (media.blob as Blob).text(), stores: Array.from(database.objectStoreNames), version: database.version };
    database.close(); return result;
  });
  expect(saved.version).toBe(40);
  expect(saved.stores).toContain("timeCapsules");
  expect(saved.stores).toContain("timeCapsuleMedia");
  expect(saved.memory).toMatchObject({ title: "Keep this memory", description: "Untouched", collectionId: "album", favorite: true });
  expect(saved.collection.coverMediaId).toBe("kept-photo");
  expect(saved.bytes).toBe("original bytes");
});

test("capsules seal privately, unlock on time offline, convert once, and delete safely", async ({ page, context }) => {
  test.setTimeout(120_000);
  await page.clock.install({ time: new Date("2026-10-13T04:00:00Z") });
  await page.goto("/");
  await page.getByRole("link", { name: "View All Capsules" }).click();
  await expect(page.getByRole("heading", { name: "Letters to Tomorrow" })).toBeVisible();
  await page.getByRole("link", { name: "Create Capsule", exact: true }).first().click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert")).toContainText("title and a letter");
  await page.getByLabel("Capsule title").fill("For a brighter tomorrow");
  await page.getByLabel("Your letter").fill("Remember the wonderful afternoon by the lake.");
  await page.getByLabel("Recipient name (optional)").fill("Future me");
  await chooseOption(page, "Mood (optional)", "grateful");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Attach photos").setInputFiles(["public/photos/lake-weekend.jpg", "public/photos/wildflowers.jpg"]);
  await expect(page.locator(".capsule-photo-previews img")).toHaveCount(2);
  await page.getByRole("button", { name: "Remove photo 2" }).click();
  await expect(page.locator(".capsule-photo-previews img")).toHaveCount(1);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Unlock date", { exact: true }).fill("2026-10-12");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert")).toContainText("future");
  await page.getByLabel("Unlock date", { exact: true }).fill("2026-10-13");
  await page.getByLabel("Unlock time (optional)", { exact: true }).fill("12:10");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator(".capsule-letter-text")).toContainText("wonderful afternoon");
  await page.getByRole("button", { name: "Seal Capsule", exact: true }).click();
  await page.getByRole("button", { name: "Confirm and Seal" }).click();
  await expect(page).toHaveURL(/\/capsules\/[a-f0-9-]+$/);
  const url = page.url();
  await page.goto("/capsules");
  await expect(page.locator(".capsule-card")).toHaveCount(1);
  await expect(page.locator(".capsule-card")).not.toContainText("wonderful afternoon");
  await page.getByRole("button", { name: "Opened", exact: true }).click();
  await expect(page.locator(".capsule-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Sealed", exact: true }).click();
  await expect(page.locator(".capsule-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await page.screenshot({ path: "artifacts/capsules-dark-desktop.png", fullPage: true });
  await page.goto("/");
  await expect(page.locator(".capsule-home-preview")).toContainText("For a brighter tomorrow");
  await page.goto(url);
  await expect(page.getByRole("button", { name: "Open Capsule", exact: true })).toBeDisabled();
  await expect(page.getByText("Remember the wonderful afternoon by the lake.")).toHaveCount(0);
  await expect(page.locator(".capsule-detail img")).toHaveCount(0);
  const before = await page.locator(".capsule-countdown").innerText();
  await page.clock.fastForward(2000);
  await expect(page.locator(".capsule-countdown")).not.toHaveText(before);
  await page.reload();
  await expect(page.getByRole("button", { name: "Open Capsule", exact: true })).toBeDisabled();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("button", { name: "Open Capsule", exact: true })).toBeDisabled();
  await page.clock.fastForward(10 * 60 * 1000);
  await expect(page.getByRole("button", { name: "Open Capsule", exact: true })).toBeEnabled();
  await expect(page.getByText("Remember the wonderful afternoon by the lake.")).toHaveCount(0);
  await page.getByRole("button", { name: "Open Capsule", exact: true }).click();
  await expect(page.locator(".capsule-letter-text")).toContainText("wonderful afternoon");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "artifacts/capsule-open-mobile.png", fullPage: true });
  await expect(page.locator(".details-viewer-image img")).toHaveAttribute("src", /^blob:/);
  await page.reload();
  await expect(page.locator(".capsule-letter-text")).toBeVisible();
  await page.getByRole("button", { name: "Save as Memory" }).click();
  await expect(page).toHaveURL(/\/memories\//);
  const memoryUrl = page.url();
  await page.goto(url);
  await page.getByRole("button", { name: "View Saved Memory" }).click();
  await expect(page).toHaveURL(memoryUrl);
  await page.goto(url);
  await page.getByRole("button", { name: "Delete Capsule", exact: true }).click();
  await page.getByRole("button", { name: "Keep capsule" }).click();
  await expect(page.locator(".capsule-letter-text")).toBeVisible();
  await page.getByRole("button", { name: "Delete Capsule", exact: true }).click();
  await page.getByRole("button", { name: "Confirm Delete Capsule" }).click();
  await expect(page).toHaveURL(/\/capsules$/);
  await page.goto(url);
  await expect(page.getByRole("heading", { name: "This letter isn’t here." })).toBeVisible();
  await page.goto(memoryUrl);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("For a brighter tomorrow");
  const counts = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve) => { const request = indexedDB.open("memotrail"); request.onsuccess = () => resolve(request.result); });
    const result = await Promise.all(["memories", "timeCapsules", "timeCapsuleMedia"].map((name) => new Promise<number>((resolve) => { const request = database.transaction(name).objectStore(name).count(); request.onsuccess = () => resolve(request.result); })));
    database.close(); return result;
  });
  expect(counts).toEqual([1, 0, 0]);
});

test("capsule layouts and accessibility work on mobile and desktop in both themes", async ({ page }) => {
  for (const dark of [false, true]) {
    await page.goto("/capsules");
    if (dark) await page.getByRole("button", { name: "Switch to dark theme" }).click();
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ["/capsules", "/capsules/new", "/capsules/missing"]) {
        await page.goto(route);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        expect(result.violations).toEqual([]);
      }
    }
  }
});
