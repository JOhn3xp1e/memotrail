import { chooseOption } from "./helpers/memo-select";
import { test, expect, type Page } from "./fixtures";
import { onThisDay } from "../src/lib/anniversaries";

test.use({ timezoneId: "Asia/Singapore" });

async function seed(page: Page, count: number) {
  await page.evaluate(async (count) => {
    const blob = await (await fetch("/photos/wildflowers.jpg")).blob();
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("memotrail");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(["memories", "media", "collections"], "readwrite");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      for (const id of ["a", "b"]) transaction.objectStore("collections").put({ id, name: `Album ${id}`, description: "", createdAt: 1, updatedAt: 1 });
      for (let index = 0; index < count; index++) {
        const id = `timeline-${index}`;
        transaction.objectStore("memories").put({ id, title: `Moment ${index}`, description: index === 1 ? "A secret sunset" : "A story", memoryDate: index === 0 ? "2025-10-13" : index === 1 ? "2024-10-13" : `2023-06-${String(index % 28 + 1).padStart(2, "0")}`, createdAt: index, updatedAt: index, mood: index % 2 ? "peaceful" : "happy", favorite: index === 1, collectionId: index % 2 ? "b" : "a" });
        for (let order = 0; order < (index === 0 ? 2 : 1); order++) transaction.objectStore("media").put({ id: `${id}-${order}`, memoryId: id, type: "image", blob, mimeType: blob.type, size: blob.size, createdAt: index, order });
      }
    });
    database.close();
  }, count);
  await page.reload();
}

test("timeline groups, filters, paginates, and links local memories", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("switch", { name: "Show the sample scrapbook" }).click();
  await page.goto("/timeline");
  await expect(page.getByRole("heading", { name: "Your story is just beginning" })).toBeVisible();
  await seed(page, 1);
  await expect(page.locator(".memory-card")).toHaveCount(1);
  await expect(page.getByLabel("2 photos", { exact: true })).toBeVisible();
  await seed(page, 60);
  await expect(page.locator(".memory-card")).toHaveCount(48);
  await expect(page.locator(".timeline-year")).toHaveText(["2025", "2024", "2023"]);
  await page.getByRole("button", { name: /Show more memories/ }).click();
  await expect(page.locator(".memory-card")).toHaveCount(60);
  await chooseOption(page, "Filter by year", "2024");
  await expect(page.locator(".memory-card")).toHaveCount(1);
  await chooseOption(page, "Filter by collection", "b");
  await chooseOption(page, "Filter by mood", "peaceful");
  await page.getByRole("button", { name: "Favorites", exact: true }).click();
  await page.getByLabel("Search memories by title or description").fill("secret sunset");
  await expect(page.locator(".memory-card")).toContainText("Moment 1");
  await chooseOption(page, "Filter by collection", "a");
  await expect(page.getByText("No moments found, just yet.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".memory-card")).toHaveCount(48);
  await page.getByRole("button", { name: "Open personal memory: Moment 0", exact: true }).click();
  await expect(page).toHaveURL(/memories\/timeline-0$/);
});

test("On this day uses the local calendar and shows all past anniversaries", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-12T16:30:00Z"));
  await page.goto("/settings");
  await page.getByRole("switch", { name: "Show the sample scrapbook" }).click();
  await page.goto("/");
  await expect(page.locator(".nostalgia-empty")).toBeVisible();
  await seed(page, 3);
  await expect(page.locator(".anniversary-list a")).toHaveCount(2);
  await expect(page.locator(".anniversary-list")).toContainText("2025 · 1 year ago today");
  await expect(page.locator(".anniversary-list")).toContainText("2024 · 2 years ago today");
  await page.locator(".anniversary-list a").last().click();
  await expect(page).toHaveURL(/memories\/timeline-1$/);
  await page.clock.setFixedTime(new Date("2026-10-13T16:30:00Z"));
  await page.goto("/");
  await expect(page.locator(".nostalgia-empty")).toBeVisible();
});

test("leap-day anniversaries match only the same calendar day in a previous year", () => {
  const memories = [{ date: "2020-02-29" }, { date: "2024-02-29" }, { date: "2023-02-28" }];
  expect(onThisDay(memories, "2024-02-29")).toEqual([{ date: "2020-02-29" }]);
  expect(onThisDay(memories, "2025-02-28")).toEqual([{ date: "2023-02-28" }]);
  expect(onThisDay(memories, "2025-03-01")).toEqual([]);
});
