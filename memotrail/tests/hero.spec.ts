import { chooseOption } from "./helpers/memo-select";
import { test, expect, type Page } from "./fixtures";
import path from "node:path";

async function expectPhoto(page: Page, side: "front" | "back", title: string) {
  // Chrome can pause animation frames in background tabs. Inspect the journal
  // as a user would after returning to it, without navigating or reloading it.
  await page.bringToFront();
  const image = page.locator(`.polaroid-${side} img`);
  await expect(image).toHaveAttribute("alt", title);
  await expect(image).toHaveAttribute("src", /^blob:/);
  await expect.poll(() => image.evaluate((node: HTMLImageElement) =>
    node.complete && node.naturalWidth > 0,
  )).toBe(true);
}

test("hero uses persisted photos, collection memories, favorites, and live edits", async ({ page, context }) => {
  test.setTimeout(120_000);
  await page.goto("/settings");
  await page.getByRole("switch", { name: "Show the sample scrapbook" }).click();
  await page.goto("/");
  await expect(page.locator(".polaroid img")).toHaveCount(0);
  await expect(page.locator(".polaroid-front .polaroid-image svg")).toBeVisible();
  await expect(page.locator(".polaroid-back .polaroid-image svg")).toBeVisible();

  // Keep Home open to check Dexie's cross-tab reactivity without navigating it.
  const editor = await context.newPage();
  await editor.goto("/add");
  await editor.getByLabel("Give this moment a title").fill("First photo");
  await editor.locator("input[type=file]").setInputFiles(path.resolve("public/photos/wildflowers.jpg"));
  await editor.getByRole("button", { name: "Save memory", exact: true }).click();
  await expect(editor).toHaveURL(/\/timeline$/);
  await expectPhoto(page, "front", "First photo");
  await expect(page.locator(".polaroid-back img")).toHaveCount(0);

  await editor.getByRole("button", { name: "Favorite memory: First photo", exact: true }).click();
  await editor.goto("/collections");
  await editor.getByRole("button", { name: "New collection" }).click();
  await editor.getByLabel("Collection name").fill("Hero collection");
  await editor.getByRole("button", { name: "Create collection", exact: true }).click();
  await editor.getByRole("link", { name: "Capture a moment" }).click();
  await editor.getByLabel("Give this moment a title").fill("Collection photo");
  // An older memory date must not override the newer creation timestamp.
  await editor.getByLabel("When was it?", { exact: true }).fill("2000-01-01");
  await chooseOption(editor, "Add to a collection", { label: "Hero collection" });
  await editor.locator("input[type=file]").setInputFiles(path.resolve("public/photos/lake-weekend.jpg"));
  await editor.getByRole("button", { name: "Save memory", exact: true }).click();
  await expect(editor).toHaveURL(/\/timeline$/);
  await expectPhoto(page, "front", "Collection photo");
  await expectPhoto(page, "back", "First photo");

  await editor.goto("/add");
  await editor.getByLabel("Give this moment a title").fill("Latest photo");
  await editor.locator("input[type=file]").setInputFiles(path.resolve("public/photos/italian-summer.jpg"));
  await editor.getByRole("button", { name: "Save memory", exact: true }).click();
  await expect(editor).toHaveURL(/\/timeline$/);
  await expectPhoto(page, "front", "Latest photo");
  await expectPhoto(page, "back", "First photo");
  await editor.getByRole("button", { name: "Unfavorite memory: First photo", exact: true }).click();
  await expectPhoto(page, "back", "Collection photo");

  await page.reload();
  await expectPhoto(page, "front", "Latest photo");
  await expectPhoto(page, "back", "Collection photo");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  const reopened = await context.newPage();
  await reopened.goto("/");
  await expectPhoto(reopened, "front", "Latest photo");
  await expectPhoto(reopened, "back", "Collection photo");
  await reopened.close();
  await context.setOffline(false);

  await editor.locator(".memory-card h3 button").filter({ hasText: "Latest photo" }).click();
  await editor.getByRole("link", { name: "Edit memory" }).click();
  await editor.getByRole("button", { name: "Remove photo 1" }).click();
  await editor.getByRole("button", { name: "Save changes", exact: true }).click();
  await expectPhoto(page, "front", "Collection photo");
  await expectPhoto(page, "back", "First photo");

  for (const title of ["Collection photo", "First photo"]) {
    await editor.goto("/timeline");
    await editor.locator(".memory-card h3 button").filter({ hasText: title }).click();
    await editor.getByRole("button", { name: "Delete", exact: true }).click();
    await editor.getByRole("button", { name: "Delete memory", exact: true }).click();
    await expect(page.locator(".polaroid img")).toHaveCount(title === "Collection photo" ? 1 : 0);
  }
});

test("two photos in one memory fill both frames even with sample mode enabled", async ({ page }) => {
  await page.goto("/add");
  await page.getByLabel("Give this moment a title").fill("Two moments");
  await page.locator("input[type=file]").setInputFiles([
    path.resolve("public/photos/lake-weekend.jpg"),
    path.resolve("public/photos/wildflowers.jpg"),
  ]);
  await page.getByRole("button", { name: "Save memory", exact: true }).click();
  await expect(page).toHaveURL(/\/timeline$/);
  await page.goto("/settings");
  const sampleSwitch = page.getByRole("switch", { name: "Show the sample scrapbook" });
  if (await sampleSwitch.getAttribute("aria-checked") !== "true") await sampleSwitch.click();
  await page.goto("/");
  await expectPhoto(page, "front", "Two moments");
  await expectPhoto(page, "back", "Two moments");
  const pixels = await page.locator(".polaroid img").evaluateAll(async (images) =>
    Promise.all(images.map(async (image) => {
      const blob = await (await fetch((image as HTMLImageElement).src)).blob();
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    })),
  );
  expect(pixels[0]).not.toEqual(pixels[1]);
});
test("saving waits for photo decoding so attachments cannot be omitted", async ({ page }) => {
  await page.addInitScript(() => {
    const decode = window.createImageBitmap.bind(window);
    let release!: () => void;
    const ready = new Promise<void>((resolve) => { release = resolve; });
    (window as unknown as { finishPhotoPreparation: () => void }).finishPhotoPreparation = release;
    window.createImageBitmap = (async (...args: Parameters<typeof createImageBitmap>) => { await ready; return decode(...args); }) as typeof createImageBitmap;
  });
  await page.goto("/add"); await page.getByLabel("Give this moment a title").fill("Keep the photo too");
  await page.locator("input[type=file]").setInputFiles(path.resolve("public/photos/italian-summer.jpg"));
  await expect(page.getByRole("button", { name: "Preparing photos…", exact: true })).toBeDisabled();
  await page.locator("form.composer-grid").evaluate((form) => (form as HTMLFormElement).requestSubmit());
  await expect(page).toHaveURL(/\/add$/);
  await page.evaluate(() => (window as unknown as { finishPhotoPreparation: () => void }).finishPhotoPreparation());
  await expect(page.locator(".uploaded-photo")).toHaveCount(1);
  await page.getByRole("button", { name: "Save memory", exact: true }).click(); await expect(page).toHaveURL(/\/timeline$/);
  await page.goto("/"); await expectPhoto(page, "front", "Keep the photo too");
});
