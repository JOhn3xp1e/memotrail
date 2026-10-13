import { test, expect } from "@playwright/test";
import path from "node:path";

test("memory details opens from every entry point and works offline", async ({ page, context }) => {
  test.setTimeout(120_000);
  await page.goto("/collections");
  await page.getByRole("button", { name: "New collection" }).click();
  await page.getByLabel("Collection name").fill("Together");
  await page.getByRole("button", { name: "Create collection", exact: true }).click();
  await expect(page.locator(".collection-card").filter({ hasText: "Together" })).toBeVisible();
  await page.goto("/add");
  await page.getByLabel("Give this moment a title").fill("An afternoon to keep");
  await page.getByLabel("What made it special?").fill("Good friends and golden light.");
  await page.getByLabel("Where were you?").fill("Singapore");
  await page.getByLabel("Add to a collection").selectOption({ label: "Together" });
  await page.locator("input[type=file]").setInputFiles([
    path.resolve("public/photos/wildflowers.jpg"), path.resolve("public/photos/lake-weekend.jpg"),
  ]);
  await page.getByRole("button", { name: "Save memory", exact: true }).click();
  await expect(page).toHaveURL(/\/timeline$/);
  await page.getByRole("button", { name: "Open personal memory: An afternoon to keep" }).click();
  await expect(page).toHaveURL(/\/memories\//);
  const url = page.url();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("An afternoon to keep");
  await expect(page.locator(".details-story")).toContainText("Good friends and golden light.");
  await expect(page.locator(".details-metadata")).toContainText("Singapore");
  await expect(page.locator(".details-metadata")).toContainText("Together");
  await expect(page.locator(".details-viewer-image img")).toHaveCSS("object-fit", "cover");
  const controls = await page.locator(".gallery-control").evaluateAll((buttons) => buttons.map((button) => {
    const bounds = button.getBoundingClientRect();
    const style = getComputedStyle(button);
    return { width: bounds.width, height: bounds.height, background: style.backgroundColor, border: style.borderWidth };
  }));
  expect(controls.every((button) => button.width >= 44 && button.height >= 44 && button.background === "rgba(0, 0, 0, 0)" && button.border === "0px")).toBe(true);
  await page.getByRole("button", { name: "Next photo", exact: true }).click();
  await expect(page.locator(".details-photo-count")).toHaveText("2 / 2");
  await page.getByRole("region", { name: "Memory photos" }).press("ArrowLeft");
  await expect(page.locator(".details-photo-count")).toHaveText("1 / 2");
  await page.getByRole("region", { name: "Memory photos" }).evaluate((target) => {
    target.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [new Touch({ identifier: 1, target, clientX: 220, clientY: 100 })] }));
    target.dispatchEvent(new TouchEvent("touchend", { bubbles: true, changedTouches: [new Touch({ identifier: 1, target, clientX: 80, clientY: 105 })] }));
  });
  await expect(page.locator(".details-photo-count")).toHaveText("2 / 2");
  await page.getByRole("button", { name: "View photos fullscreen" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").locator(".details-viewer-image img")).toHaveCSS("object-fit", "contain");
  const fullscreenViewer = page.getByRole("dialog").getByRole("region", { name: "Memory photos" });
  await fullscreenViewer.evaluate((target) => {
    const point = (identifier: number, clientX: number) => new Touch({ identifier, target, clientX, clientY: 100 });
    target.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [point(1, 100), point(2, 200)] }));
    target.dispatchEvent(new TouchEvent("touchmove", { bubbles: true, touches: [point(1, 50), point(2, 250)] }));
    target.dispatchEvent(new TouchEvent("touchend", { bubbles: true, changedTouches: [point(1, 50), point(2, 250)] }));
  });
  await expect(page.getByRole("button", { name: "Reset photo zoom" })).toBeVisible();
  await expect(fullscreenViewer.locator(".details-photo-surface")).toHaveCSS("transform", "matrix(2, 0, 0, 2, 0, 0)");
  await fullscreenViewer.evaluate((target) => {
    const point = (clientX: number) => new Touch({ identifier: 1, target, clientX, clientY: 100 });
    target.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [point(100)] }));
    target.dispatchEvent(new TouchEvent("touchmove", { bubbles: true, touches: [point(140)] }));
    target.dispatchEvent(new TouchEvent("touchend", { bubbles: true, changedTouches: [point(140)] }));
  });
  await expect(fullscreenViewer.locator(".details-photo-surface")).toHaveCSS("transform", "matrix(2, 0, 0, 2, 40, 0)");
  await page.getByRole("button", { name: "Reset photo zoom" }).click();
  await expect(fullscreenViewer.locator(".details-photo-surface")).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  await page.getByRole("dialog").getByRole("button", { name: "Previous photo" }).click();
  await expect(page.getByRole("dialog").locator(".details-photo-count")).toHaveText("1 / 2");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Favorite memory", exact: true }).click();
  await expect(page.getByRole("button", { name: "Unfavorite memory", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/timeline$/);
  await page.getByRole("button", { name: "Favorites", exact: true }).click();
  await page.getByRole("button", { name: "Open personal memory: An afternoon to keep" }).click();
  await expect(page).toHaveURL(url);
  await page.goto("/");
  for (const selector of [".polaroid-front", ".polaroid-back", ".memory-image-button"]) {
    await page.locator(selector).first().click();
    await expect(page).toHaveURL(url);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
  }
  await page.locator(".collection-card").filter({ hasText: "Together" }).click();
  await page.getByRole("button", { name: "Open personal memory: An afternoon to keep" }).click();
  await expect(page).toHaveURL(url);
  await page.getByRole("link", { name: "Edit memory" }).click();
  await expect(page.getByLabel("Give this moment a title")).toHaveValue("An afternoon to keep");
  await page.goto(url);
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: "artifacts/memory-details-dark.png", fullPage: true });
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  const reopened = await context.newPage();
  await reopened.goto(url);
  await expect(reopened.getByRole("heading", { level: 1 })).toHaveText("An afternoon to keep");
  await expect.poll(() => reopened.locator(".details-viewer-image img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await reopened.close();
  await context.setOffline(false);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Keep memory" }).click();
  await expect(page).toHaveURL(url);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete memory", exact: true }).click();
  await expect(page).toHaveURL(/\/timeline$/);
  await page.goto(url);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This memory isn’t here.");
});

test("sample photos open matching sample details", async ({ page }) => {
  await page.goto("/");
  await page.locator(".polaroid-front").click();
  await expect(page).toHaveURL(/memories\/sample-lake\?sample=1$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("A little closer to nature");
  await expect(page.getByRole("link", { name: "Edit memory" })).toHaveCount(0);
  await page.goto("/");
  await page.locator(".polaroid-back").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Somewhere along the coast");
});
