import { test, expect, devices } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";
import { chooseOption } from "./helpers/memo-select";

async function createCollection(page: import("@playwright/test").Page, name: string) {
  await page.goto("/collections"); await page.getByRole("button", { name: "New collection" }).click();
  await page.getByLabel("Collection name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Create collection", exact: true }).click();
  await expect(page.locator(".collection-card").filter({ hasText: name })).toBeVisible();
}
test.describe("Android collection sheets", () => {
  test.use({ hasTouch: true, isMobile: true, userAgent: devices["Pixel 7"].userAgent });
  for (const theme of ["light", "dark"]) test(`all requested phone sizes in ${theme}, focus, safe areas and reduced motion`, async ({ page }) => {
    test.setTimeout(120_000);
    await createCollection(page, "Our weekends");
    await page.goto("/settings"); await page.getByRole("button", { name: theme === "dark" ? "After hours" : "A little light" }).click();
    for (const width of [360, 375, 390, 412, 430]) {
      await page.setViewportSize({ width, height: 850 }); await page.goto("/add");
      const trigger = page.getByRole("combobox", { name: "Add to a collection", exact: true });
      await trigger.click(); const sheet = page.getByRole("dialog", { name: "Add to a collection", exact: true });
      await expect(sheet).toBeVisible(); await expect(sheet.getByRole("option", { name: "No collection", exact: true })).toHaveAttribute("aria-selected", "true");
      const bounds = await sheet.boundingBox(); expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.width).toBeLessThanOrEqual(width); expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(851);
      expect(await sheet.evaluate((element) => Number(getComputedStyle(element).zIndex))).toBeGreaterThan(50);
      expect(await sheet.getByRole("option", { name: "Our weekends" }).evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
      expect(await sheet.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await sheet.getByRole("option", { name: "Our weekends" }).click(); await expect(sheet).toHaveCount(0); await expect(trigger).toContainText("Our weekends"); await expect(trigger).toBeFocused();
      await trigger.click(); await page.keyboard.press("Escape"); await expect(sheet).toHaveCount(0); await expect(trigger).toBeFocused();
      await trigger.click(); await page.mouse.click(2, 2); await expect(sheet).toHaveCount(0);
      await page.getByRole("button", { name: "Choose date: When was it?" }).click();
      const calendar = page.getByRole("dialog", { name: "When was it?", exact: true }); await expect(calendar).toBeVisible();
      expect(await calendar.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.keyboard.press("Escape");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width === 390) { await trigger.click(); await page.screenshot({ path: `artifacts/phase8-sheet-${theme}.png` }); await page.keyboard.press("Escape"); }
    }
  });
});
test("desktop keyboard selection, create from picker, edit and safe collection deletion", async ({ page }) => {
  await createCollection(page, "Alpha"); await createCollection(page, "Bravo"); await page.goto("/add");
  await page.getByLabel("Give this moment a title").fill("Preserved memory");
  const trigger = page.getByRole("combobox", { name: "Add to a collection", exact: true });
  await trigger.focus(); await page.keyboard.press("ArrowDown"); await expect(page.locator(".memo-popover")).toBeVisible();
  await page.keyboard.press("b"); await expect(page.getByRole("option", { name: "Bravo", exact: true })).toBeFocused(); await page.keyboard.press("Enter");
  await expect(trigger).toContainText("Bravo"); await expect(trigger).toBeFocused();
  await trigger.click(); await page.locator(".memo-popover").getByRole("button", { name: "Create a collection" }).click();
  await page.getByLabel("Collection name", { exact: true }).fill("Charlie"); await page.getByRole("button", { name: "Create collection", exact: true }).click();
  await expect(trigger).toContainText("Charlie");
  await page.getByRole("button", { name: "Save memory", exact: true }).click(); await expect(page).toHaveURL(/timeline$/);
  await page.getByRole("button", { name: "Open personal memory: Preserved memory" }).click(); await page.getByRole("link", { name: "Edit memory" }).click();
  await expect(trigger).toContainText("Charlie"); await chooseOption(page, "Add to a collection", { label: "Alpha" }); await page.getByRole("button", { name: "Save changes" }).click();
  await page.goto("/collections"); await page.locator(".collection-card").filter({ hasText: "Alpha" }).click();
  const remove = page.getByRole("button", { name: "Delete collection", exact: true }); await remove.click();
  const dialog = page.getByRole("alertdialog", { name: "Let this collection go?" }); await expect(dialog.getByRole("button", { name: "Keep collection" })).toBeFocused();
  await page.keyboard.press("Escape"); await expect(remove).toBeFocused(); await remove.click(); await dialog.getByRole("button", { name: "Confirm Delete Collection" }).click();
  await page.goto("/timeline"); await expect(page.locator(".memory-card")).toContainText("Preserved memory");
  await page.getByRole("button", { name: "Open personal memory: Preserved memory" }).click(); await expect(page.getByRole("heading", { level: 1 })).toHaveText("Preserved memory");
});
test("calendar keyboard, invalid dates and local capsule time selection", async ({ page }) => {
  await page.goto("/add"); await page.getByRole("button", { name: "Choose date: When was it?" }).click();
  const grid = page.getByRole("grid", { name: "Calendar" }); await expect(grid).toBeVisible();
  await page.keyboard.press("ArrowLeft"); await page.keyboard.press("Enter"); await expect(grid).toHaveCount(0);
  await page.getByLabel("Give this moment a title").fill("Invalid date must not save"); await page.getByLabel("When was it?", { exact: true }).fill("2025-02-30");
  await page.getByRole("button", { name: "Save memory", exact: true }).click(); await expect(page).toHaveURL(/\/add$/);
  await page.goto("/capsules/new"); await page.getByLabel("Capsule title").fill("For later"); await page.getByLabel("Your letter").fill("Keep this date and local time.");
  await page.getByRole("button", { name: "Continue", exact: true }).click(); await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Unlock date", { exact: true }).fill("2030-07-02"); await page.getByRole("button", { name: "Choose time: Unlock time (optional)" }).click();
  await chooseOption(page, "Hour", "16"); await chooseOption(page, "Minute", "35"); await page.getByRole("button", { name: "Use this time" }).click();
  await expect(page.getByLabel("Unlock time (optional)", { exact: true })).toHaveValue("16:35");
  await page.getByRole("button", { name: "Continue", exact: true }).click(); await page.getByRole("button", { name: "Seal Capsule", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible(); await expect(page.getByRole("button", { name: "Keep writing" })).toBeFocused();
  await page.getByRole("button", { name: "Confirm and Seal" }).click(); await expect(page).toHaveURL(/capsules\/[a-f0-9-]+$/);
});
test("generated branding dimensions, maskable safe circle and unchanged manifest settings", async ({ page, request }) => {
  for (const [file, size] of [["public/icons/icon-192.png", 192], ["public/icons/icon-512.png", 512], ["public/icons/maskable-512.png", 512], ["public/apple-touch-icon.png", 180], ["public/favicon.png", 64]] as const) {
    const metadata = await sharp(file).metadata(); expect(metadata.width).toBe(size); expect(metadata.height).toBe(size);
  }
  const { data, info } = await sharp("public/icons/maskable-512.png").raw().toBuffer({ resolveWithObject: true });
  let unsafePixels = 0;
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) if (Math.hypot(x - 255.5, y - 255.5) > 204.8) {
    const index = (y * 512 + x) * info.channels; if (data[index] !== 250 || data[index + 1] !== 247 || data[index + 2] !== 242) unsafePixels++;
  }
  expect(unsafePixels).toBe(0);
  const manifest = await (await request.get("/manifest.webmanifest")).json(); expect(manifest).toMatchObject({ short_name: "MemoTrail", theme_color: "#FAF7F2", background_color: "#FAF7F2", display: "standalone" }); expect(manifest.icons).toHaveLength(3);
  await page.goto("/"); await expect(page.locator('.brand-mark').first()).toHaveAttribute("src", "/icons/icon-192.png"); await expect(page.locator('link[rel=icon]')).toHaveAttribute("href", "/favicon.png");
});
test("phone dialogs resize above a simulated on-screen keyboard and nested pickers close correctly", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 }); await page.goto("/add");
  await page.getByRole("combobox", { name: "Add to a collection", exact: true }).click();
  await page.getByRole("dialog", { name: "Add to a collection", exact: true }).getByRole("button", { name: "Create a collection" }).click();
  const form = page.getByRole("dialog", { name: "Name your collection.", exact: true }); await expect(form).toBeVisible();
  await page.evaluate(() => { Object.defineProperty(visualViewport!, "height", { value: 350, configurable: true }); Object.defineProperty(visualViewport!, "offsetTop", { value: 80, configurable: true }); visualViewport!.dispatchEvent(new Event("resize")); });
  await expect.poll(async () => { const bounds = await form.boundingBox(); return bounds!.y + bounds!.height; }).toBeLessThanOrEqual(430);
  await page.getByLabel("Collection name", { exact: true }).fill("Keyboard-safe collection");
  await form.getByRole("button", { name: "Create collection", exact: true }).click(); await expect(form).toHaveCount(0);
  await page.evaluate(() => { delete (visualViewport as unknown as Record<string, unknown>).height; delete (visualViewport as unknown as Record<string, unknown>).offsetTop; visualViewport!.dispatchEvent(new Event("resize")); });
  await page.getByRole("button", { name: "Choose date: When was it?" }).click();
  const calendar = page.getByRole("dialog", { name: "When was it?", exact: true });
  await chooseOption(page, "Calendar month", "1"); await expect(calendar).toBeVisible();
  await page.getByRole("combobox", { name: "Calendar year", exact: true }).click(); await page.keyboard.press("Escape"); await expect(calendar).toBeVisible();
  await page.keyboard.press("Escape"); await expect(calendar).toHaveCount(0);
});
