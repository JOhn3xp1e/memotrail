import { chooseOption } from "./helpers/memo-select";
import { test, expect } from "@playwright/test";
import path from "node:path";

test("collection covers react to uploads, selection, moves, and deletion", async ({ page, context }) => {
  test.setTimeout(120_000);
  await page.goto("/collections");
  await page.getByRole("button", { name: "New collection" }).click();
  await page.getByLabel("Collection name").fill("Tropa Time");
  await page.getByRole("button", { name: "Create collection", exact: true }).click();
  const card = page.locator(".collection-card").filter({ hasText: "Tropa Time" });
  await expect(card).toBeVisible();
  await expect(card.locator("img")).toHaveCount(0);
  const editor = await context.newPage();
  for (let count = 1; count <= 5; count++) {
    await editor.goto("/add");
    await editor.getByLabel("Give this moment a title").fill(`Photo memory ${count}`);
    await chooseOption(editor, "Add to a collection", { label: "Tropa Time" });
    await editor.locator("input[type=file]").setInputFiles(path.resolve(
      `public/photos/${count % 2 ? "wildflowers" : "lake-weekend"}.jpg`,
    ));
    await editor.getByRole("button", { name: "Save memory", exact: true }).click();
    await expect(editor).toHaveURL(/\/timeline$/);
    await expect(card.locator(".album-photo-grid")).toHaveClass(new RegExp(`album-photo-grid-${Math.min(count, 4)}`));
    await expect(card.locator("img")).toHaveCount(Math.min(count, 4));
    await expect.poll(() => card.locator("img").evaluateAll((images) => images.every((image) =>
      image.complete && image.naturalWidth > 0 && getComputedStyle(image).objectFit === "cover",
    ))).toBe(true);
  }
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await card.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const boxes = await card.locator("img").evaluateAll((images) => images.map((image) => {
      const { width, height } = image.getBoundingClientRect();
      return { width, height };
    }));
    expect(boxes.every((box) => box.width > 0 && box.height > 0)).toBe(true);
  }
  await page.screenshot({ path: "artifacts/collection-covers-desktop.png", fullPage: true });
  await card.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tropa Time");
  await page.getByRole("button", { name: "Choose cover" }).click();
  await page.getByRole("button", { name: "Set as Collection Cover: photo 5", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/");
  await expect(card.locator("img")).toHaveCount(1);
  await page.reload();
  await expect(card.locator("img")).toHaveCount(1);
  await card.click();
  await page.getByRole("button", { name: "Choose cover" }).click();
  await expect(page.getByRole("button", { name: "Set as Collection Cover: photo 5", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Use automatic collage" }).click();
  await page.goto("/");
  await expect(card.locator("img")).toHaveCount(4);

  // Moving a memory removes its photos from the old collection immediately.
  await editor.locator(".memory-card h3 button").filter({ hasText: "Photo memory 5" }).click();
  await editor.getByRole("link", { name: "Edit memory" }).click();
  await chooseOption(editor, "Add to a collection", "");
  await editor.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(card).toContainText("4 memories");
  for (const count of [4, 3, 2, 1]) {
    await editor.goto("/timeline");
    await editor.locator(".memory-card h3 button").filter({ hasText: `Photo memory ${count}` }).click();
    await editor.getByRole("button", { name: "Delete", exact: true }).click();
    await editor.getByRole("button", { name: "Delete memory", exact: true }).click();
    await expect(card.locator("img")).toHaveCount(count - 1);
  }
  await expect(card.locator(".album-photo-grid")).toHaveCount(0);
});
