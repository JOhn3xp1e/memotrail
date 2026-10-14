import { test, expect, type Page } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import { helpGuides, screenshotIds } from "../src/data/help";
import { captureMetadata } from "../src/data/help-captures";
import { seedHelpJournal } from "../scripts/help-fixture.mjs";

async function loadedScreenshot(page: Page) {
  const image = page.locator(".help-guide-body .help-shot-open img");
  await image.scrollIntoViewIfNeeded();
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
}
async function journalSnapshot(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve) => { const request = indexedDB.open("memotrail"); request.onsuccess = () => resolve(request.result); });
    const values: Record<string, unknown> = {};
    for (const name of database.objectStoreNames) {
      const rows = await new Promise<Record<string, unknown>[]>((resolve) => { const request = database.transaction(name).objectStore(name).getAll(); request.onsuccess = () => resolve(request.result); });
      values[name] = await Promise.all(rows.map(async (row) => row.blob instanceof Blob ? { ...row, blob: Array.from(new Uint8Array(await row.blob.arrayBuffer())) } : row));
    }
    database.close(); return values;
  });
}

test("all generated help images are real WebP assets with complete annotation mappings", async ({ request }) => {
  expect(captureMetadata).toHaveLength(screenshotIds.length * 3);
  for (const capture of captureMetadata) {
    const response = await request.get(`/help/annotated/${capture.variant}/${capture.id}.webp`);
    expect(response.ok()).toBe(true); expect(response.headers()["content-type"]).toContain("image/webp");
    const bytes = await response.body(); expect(bytes.toString("ascii", 0, 4)).toBe("RIFF"); expect(bytes.toString("ascii", 8, 12)).toBe("WEBP");
    expect(capture.annotations.length).toBeGreaterThan(0);
    for (const box of capture.annotations) {
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(capture.width + 1); expect(box.y + box.height).toBeLessThanOrEqual(capture.height + 1);
    }
  }
});

test("search, device tabs, expansion, real screenshot zoom and related guides work", async ({ page }) => {
  await page.goto("/help?mode=mobile");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("How to Use MemoTrail");
  await expect(page.getByRole("tab", { name: /Mobile Guide/ })).toHaveAttribute("aria-selected", "true");
  await loadedScreenshot(page);
  await page.getByRole("tab", { name: /Web Guide/ }).click();
  await loadedScreenshot(page);
  await expect(page.locator(".help-guide-body .help-shot-open img")).toHaveAttribute("src", /\/desktop\//);
  const search = page.getByRole("textbox", { name: "Search guide topics" });
  await search.fill("upload photos"); await expect(page.locator(".help-guide-toggle")).toHaveCount(1);
  await page.locator(".help-guide-toggle").click(); await loadedScreenshot(page);
  const zoom = page.locator(".help-guide-body").getByRole("button", { name: /Enlarge screenshot/ });
  await zoom.click(); const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Zoom screenshot in" }).click(); await expect(dialog.getByRole("status")).toHaveText("150%");
  await dialog.getByRole("button", { name: "Fit image" }).click(); await expect(dialog.getByRole("status")).toHaveText("100%");
  await page.keyboard.press("Escape"); await expect(zoom).toBeFocused();
  await search.fill("unfindabletopicxyz"); await expect(page.getByText("A different word might find it.")).toBeVisible();
  await page.getByRole("button", { name: "Show all guides" }).click();
  await page.locator(".help-guide-body .help-guide-actions").getByRole("button", { name: "How to Export a ZIP Backup", exact: true }).click();
  await expect(page.locator(".help-guide-card.is-open h2")).toContainText("How to Export a ZIP Backup");
  await page.getByText("Can I recover a deleted memory?", { exact: true }).click();
  await expect(page.locator(".help-faq details[open]")).toContainText("no trash or undo");
});

test("each published guide expands with a decoded screenshot and useful instructions", async ({ page }) => {
  test.setTimeout(120_000);
  for (const guide of helpGuides) {
    await page.goto(`/help?guide=${guide.id}&mode=${guide.mode ?? "mobile"}`);
    await expect(page.locator(".help-guide-card.is-open h2")).toContainText(guide.title);
    await expect(page.locator(".help-guide-body .help-instructions li")).toHaveCount(guide.steps.length);
    await loadedScreenshot(page);
    await expect(page.locator(".help-guide-body .help-shot-legend li").first()).toBeVisible();
  }
});

test("screenshots retry after a temporary image failure", async ({ page }) => {
  let failed = false;
  await page.route("**/help/annotated/mobile-390/restore.webp", async (route) => {
    if (!failed) { failed = true; await route.abort(); } else await route.continue();
  });
  await page.goto("/help?guide=restore&mode=mobile");
  await page.locator(".help-guide-body").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Try loading screenshot again" }).click();
  await loadedScreenshot(page);
});

for (const mobile of [true, false]) test(`tour highlights real controls, supports Back, Skip and Finish (${mobile ? "phone" : "desktop"})`, async ({ page }) => {
  test.setTimeout(90_000);
  if (mobile) await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/help"); await page.getByRole("button", { name: "Take a guided tour" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("A little home for your story");
  await expect(page.locator(".tour-highlight")).toBeVisible();
  await dialog.press("ArrowRight"); await expect(dialog).toContainText("The good bits, lately");
  await dialog.getByRole("button", { name: "Back", exact: true }).click(); await expect(dialog).toContainText("A little home for your story");
  await dialog.getByRole("button", { name: "Skip tour" }).click(); await expect(dialog).toHaveCount(0); await expect(page.locator(".tour-highlight")).toHaveCount(0);
  await page.goto("/help"); await page.getByRole("button", { name: "Take a guided tour" }).click();
  for (let index = 0; index < 5; index++) {
    await expect(dialog).toContainText(`${index + 1} OF 6`);
    const bounds = await dialog.boundingBox(); expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    await dialog.getByRole("button", { name: "Next", exact: true }).click();
  }
  await expect(dialog).toContainText("Keep your stories safe");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await dialog.getByRole("button", { name: "Finish", exact: true }).click(); await expect(dialog).toHaveCount(0);
  await expect(page.locator(".bottom-nav a")).toHaveCount(5);
});

test("help entry points and draft protection keep unsaved work usable", async ({ page }) => {
  await page.goto("/settings"); await page.getByRole("link", { name: "Open Help & Guides" }).click(); await expect(page).toHaveURL(/\/help$/);
  await page.getByRole("link", { name: "Try Adding a Memory" }).click(); await expect(page).toHaveURL(/\/add$/);
  await page.getByLabel("Give this moment a title").fill("An unfinished moment");
  await page.getByRole("link", { name: "Need help?", exact: true }).click();
  await expect(page).toHaveURL(/guide=add-memory/); await expect(page.getByRole("button", { name: "Take a guided tour" })).toBeDisabled();
  await page.getByRole("link", { name: "Return to your draft" }).click(); await expect(page.getByLabel("Give this moment a title")).toHaveValue("An unfinished moment");
  await page.goto("/collections"); await page.getByRole("link", { name: "Learn about collections" }).click(); await expect(page).toHaveURL(/guide=collections/);
  await page.goto("/capsules"); await page.getByRole("link", { name: "How time capsules work" }).click(); await expect(page).toHaveURL(/guide=capsule-create/);
  await page.goto("/settings"); await page.getByRole("link", { name: "How backups work" }).click(); await expect(page).toHaveURL(/guide=backup/);
});

test("all guide text and both screenshot sets work offline without changing the journal", async ({ page, context }) => {
  test.setTimeout(120_000);
  await page.goto("/settings"); await seedHelpJournal(page); await page.reload();
  const original = await journalSnapshot(page);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; }); await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.goto("/help?guide=restore&mode=mobile"); await loadedScreenshot(page);
  await page.getByRole("tab", { name: /Web Guide/ }).click(); await loadedScreenshot(page);
  await page.getByRole("textbox", { name: "Search guide topics" }).fill("offline"); await expect(page.locator(".help-guide-toggle")).not.toHaveCount(0);
  await page.goto("/help?guide=photos&mode=desktop"); await loadedScreenshot(page);
  expect(await journalSnapshot(page)).toEqual(original);
});

test("responsive help, both themes, screenshot zoom, landscape and PWA layout", async ({ page }) => {
  test.setTimeout(150_000);
  for (const theme of ["light", "dark"]) {
    await page.goto("/settings");
    await page.getByRole("button", { name: theme === "dark" ? /After hours/ : /A little light/ }).click();
    for (const width of [360, 375, 390, 412, 430, 768, 1440]) {
      await page.setViewportSize({ width, height: width > 430 ? 900 : 844 });
      await page.goto(`/help?guide=add-memory&mode=${width > 430 ? "desktop" : "mobile"}`);
      await loadedScreenshot(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect((await new AxeBuilder({ page }).include(".help-center").analyze()).violations).toEqual([]);
      if (theme === "dark" && [390, 1440].includes(width)) { await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: `artifacts/help-${width}.png`, fullPage: false }); }
    }
  }
  await page.setViewportSize({ width: 844, height: 390 }); await page.goto("/help?guide=photos&mode=mobile"); await loadedScreenshot(page);
  await page.locator(".help-guide-body").getByRole("button", { name: /Enlarge screenshot/ }).click(); await expect(page.getByRole("dialog")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
