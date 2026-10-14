import { chromium, expect } from "@playwright/test";
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve, sep } from "node:path";
import { seedHelpJournal } from "./help-fixture.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "public/help");
if (!output.startsWith(resolve(root) + sep)) throw new Error("Screenshot output must stay inside this project.");
const base = new URL(process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4175");
if (!["127.0.0.1", "localhost", "[::1]"].includes(base.hostname) || base.protocol !== "http:" || base.pathname !== "/") throw new Error("Screenshot automation accepts only a local HTTP server, never a production URL.");
let server, browser;
const captures = [], failures = [];
const variants = [
  { name: "mobile-390", width: 390, height: 844, mobile: true },
  { name: "mobile-360", width: 360, height: 800, mobile: true },
  { name: "desktop", width: 1440, height: 900, mobile: false },
];
async function serving() { try { return (await fetch(base, { signal: AbortSignal.timeout(1000) })).ok; } catch { return false; } }
try {
  if (!await serving()) {
    server = spawn(process.execPath, [resolve(root, "node_modules/vite/bin/vite.js"), "--host", base.hostname, "--port", base.port || "80", "--strictPort"], { cwd: root, windowsHide: true, stdio: "pipe" });
    server.on("error", (error) => failures.push(`Local server: ${error.message}`));
    server.stderr.on("data", (chunk) => process.stderr.write(chunk));
    await expect.poll(serving, { timeout: 30_000, message: "Local screenshot server must start" }).toBe(true);
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  for (const variant of variants) {
    const context = await browser.newContext({ baseURL: base.href, viewport: { width: variant.width, height: variant.height }, isMobile: variant.mobile, hasTouch: variant.mobile, deviceScaleFactor: 1, reducedMotion: "reduce", timezoneId: "Asia/Singapore" });
    const page = await context.newPage(); page.setDefaultTimeout(12_000);
    await page.clock.setFixedTime(new Date("2026-10-14T04:00:00Z"));
    await page.goto("/"); await expect(page.getByRole("button", { name: "Skip introduction", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Skip introduction", exact: true }).click(); await expect(page.locator(".app-shell")).toBeVisible();
    await seedHelpJournal(page);
    async function go(path) {
      await page.goto(path); await expect(page.locator(".app-shell")).toBeVisible(); await expect(page.locator("#main-content > div").last()).toHaveCSS("opacity", "1");
      await page.evaluate(() => document.fonts.ready); await expect(page.locator(".page-loading")).toHaveCount(0);
    }
    const button = (name) => page.getByRole("button", { name, exact: true });
    const field = (name) => page.getByLabel(name);
    async function capture(id, annotations) {
      const boxes = [];
      for (const [locator, label] of annotations) {
        const element = locator.first();
        if (!await element.isVisible()) continue;
        const box = await element.boundingBox();
        if (!box || box.x < 0 || box.y < 0 || box.x + box.width > variant.width + 1 || box.y + box.height > variant.height + 1) continue;
        boxes.push({ number: boxes.length + 1, label, ...box });
      }
      if (!boxes.length) throw new Error("No visible annotation targets; capture cannot be published.");
      await page.evaluate(async () => {
        await Promise.all([...document.images].filter((image) => image.getBoundingClientRect().top < innerHeight && image.getBoundingClientRect().bottom > 0).map((image) => image.decode().catch(() => undefined)));
      });
      const raw = await page.screenshot({ animations: "disabled" });
      await page.evaluate((items) => {
        const overlay = document.createElement("div"); overlay.id = "docs-annotations"; overlay.setAttribute("aria-hidden", "true");
        overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none";
        for (const item of items) {
          const highlight = document.createElement("div");
          highlight.style.cssText = `position:absolute;left:${item.x}px;top:${item.y}px;width:${item.width}px;height:${item.height}px;border:2px solid #c8a5ff;border-radius:9px;box-shadow:0 0 0 2px #c8a5ff20;`;
          const marker = document.createElement("span"); marker.textContent = String(item.number);
          marker.style.cssText = `position:absolute;left:${Math.max(3, item.x - 7)}px;top:${Math.max(3, item.y - 16)}px;width:25px;height:25px;border-radius:50%;background:#ddc9fa;color:#2a1c42;border:2px solid #f4ecff;box-shadow:0 2px 8px #0008;display:grid;place-items:center;font:600 13px Arial,sans-serif;`;
          overlay.append(highlight, marker);
        }
        document.body.append(overlay);
      }, boxes);
      let annotated;
      try { annotated = await page.screenshot({ animations: "disabled" }); }
      finally { await page.evaluate(() => document.getElementById("docs-annotations")?.remove()); }
      for (const [kind, buffer] of [["raw", raw], ["annotated", annotated]]) {
        const folder = resolve(output, kind, variant.name); await mkdir(folder, { recursive: true });
        await sharp(buffer).webp({ quality: 72, effort: 6 }).toFile(resolve(folder, `${id}.webp`));
      }
      const bytes = (await readFile(resolve(output, "annotated", variant.name, `${id}.webp`))).length;
      captures.push({ id, variant: variant.name, width: variant.width, height: variant.height, bytes, annotations: boxes });
      console.log(`Captured ${variant.name}/${id} (${boxes.length} real targets)`);
    }
    const cases = [
      ["onboarding", async () => { await page.goto("/introduction"); await expect(page.getByRole("button", { name: "Begin Your Story" })).toBeVisible(); await capture("onboarding", [[button("Begin Your Story"), "Begin your story"], [button("Exit introduction"), "Exit this replay"]]); }],
      ["home", async () => { await go("/"); await expect(page.getByRole("heading", { name: "Recent memories", exact: true })).toBeVisible(); await capture("home", [[page.locator(".home-greeting"), "Your welcome"], [page.locator(".hero-copy .button"), "Add a memory"]]); }],
      ["navigation", async () => { await go("/"); const nav = page.locator(variant.mobile ? ".bottom-nav" : ".desktop-nav"); await capture("navigation", [[nav.locator('a[href="/"]'), "Home"], [nav.locator('a[href="/timeline"]'), "Timeline"], [page.locator(variant.mobile ? '.bottom-nav a[href="/add"]' : ".sidebar-add"), "Add a memory"], [nav.locator('a[href="/collections"]'), "Collections"], [nav.locator('a[href="/settings"]'), "Settings"]]); }],
      ["add-memory", async () => { await go("/add"); await field("Give this moment a title").fill("Weekend by the Sea"); await field("What made it special?").fill("A peaceful afternoon watching the sunset with friends."); await field("Give this moment a title").scrollIntoViewIfNeeded(); await capture("add-memory", [[field("Give this moment a title"), "Memory title"], [field("What made it special?"), "Your story"], [field("When was it?"), "Memory date"]]); }],
      ["photo-upload", async () => { await go("/add"); await field("Choose photos for your memory preview").setInputFiles([resolve(root, "public/photos/golden-hour.jpg"), resolve(root, "public/photos/lake-weekend.jpg")]); await expect(page.locator(".uploaded-photo")).toHaveCount(2); await expect(button("Save memory")).toBeEnabled(); await page.locator(".photo-dropzone").scrollIntoViewIfNeeded(); await capture("photo-upload", [[page.locator(".photo-dropzone"), "Choose photos"], [page.locator(".uploaded-photo").first(), "First photo is the cover"]]); }],
      ["collection-picker", async () => { await go("/add"); await page.getByRole("combobox", { name: "Add to a collection", exact: true }).click(); await expect(page.getByRole("option", { name: "Favorite Adventures", exact: true })).toBeVisible(); await capture("collection-picker", [[page.getByRole("option", { name: "Favorite Adventures", exact: true }), "Choose your album"], [page.getByRole("option", { name: "No collection", exact: true }), "Keep without a collection"]]); }],
      ["memory-details", async () => { await go("/memories/help-sea"); await expect(button("Favorite memory").or(button("Unfavorite memory"))).toBeVisible(); await page.locator(".details-story").scrollIntoViewIfNeeded(); await capture("memory-details", [[page.locator(".details-story h1"), "Your memory"], [page.getByRole("link", { name: "Edit memory" }), "Edit this memory"], [button("Unfavorite memory"), "Favorite control"]]); }],
      ["memory-gallery", async () => { await go("/memories/help-sea"); await button("View photos fullscreen").click(); await expect(page.getByRole("dialog")).toBeVisible(); await capture("memory-gallery", [[page.getByRole("dialog").getByRole("button", { name: "Next photo" }), "Next photo"], [page.getByRole("dialog").getByRole("button", { name: "Previous photo" }), "Previous photo"], [button("Close dialog"), "Close gallery"]]); }],
      ["delete-memory", async () => { await go("/memories/help-sea"); await button("Delete").click(); await expect(page.getByRole("alertdialog")).toBeVisible(); await capture("delete-memory", [[button("Keep memory"), "Cancel deletion"], [button("Delete memory"), "Permanent deletion"]]); }],
      ["collections", async () => { await go("/collections"); await expect(page.locator(".managed-collection")).toHaveCount(1); await capture("collections", [[button("New collection"), "Create an album"], [page.locator(".collection-card"), "Open your album"]]); }],
      ["create-collection", async () => { await go("/collections?new=1"); await field("Collection name").fill("Favorite Adventures"); await capture("create-collection", [[field("Collection name"), "Album name"], [button("Create collection"), "Save your collection"]]); }],
      ["timeline", async () => { await go("/timeline"); await expect(page.locator(".timeline-month").first()).toBeVisible(); await capture("timeline", [[field("Search memories by title or description"), "Search your memories"], [button("Favorites"), "Show favorites"], [button("Photo grid"), "Grid view"], [button("Journal list"), "List view"]]); }],
      ["on-this-day", async () => { await go("/"); await expect(page.locator(".on-this-day .nostalgia-content")).toHaveCount(1); await page.locator(".on-this-day").scrollIntoViewIfNeeded(); await capture("on-this-day", [[page.locator(".nostalgia-content"), "Revisit a past anniversary"]]); }],
      ["memory-jar", async () => { await go("/jar"); await expect(button("Shake the Jar")).toBeEnabled(); await button("Shake the Jar").click(); await expect(page.locator(".jar-reveal-card")).toBeVisible(); await page.locator(".jar-reveal-actions").scrollIntoViewIfNeeded(); await capture("memory-jar", [[page.getByRole("link", { name: "Open Memory" }), "Open the revealed memory"], [button("Pick Another"), "Pick another moment"]]); }],
      ["time-capsules", async () => { await go("/capsules"); await expect(page.locator(".capsule-card").first()).toBeVisible(); await capture("time-capsules", [[page.getByRole("link", { name: "Create Capsule", exact: true }).first(), "Write a letter for later"], [page.locator(".capsule-card").first(), "Open a capsule"]]); }],
      ["capsule-create", async () => { await go("/capsules/new"); await field("Capsule title").fill("For a brighter tomorrow"); await field("Your letter").fill("Dear future me, keep making time for the little things."); await field("Capsule title").scrollIntoViewIfNeeded(); await capture("capsule-create", [[field("Capsule title"), "Name your capsule"], [field("Your letter"), "Write your letter"]]); }],
      ["capsule-open", async () => { await go("/capsules/help-ready"); await button("Open Capsule").click(); await expect(page.locator(".capsule-open-letter")).toBeVisible(); await button("Save as Memory").scrollIntoViewIfNeeded(); await capture("capsule-open", [[button("Save as Memory"), "Keep the opened letter in your journal"]]); }],
      ["rewind", async () => { await go("/rewind"); await expect(page.locator(".rewind-period").first()).toBeVisible(); await capture("rewind", [[button("Monthly Rewind"), "Choose monthly recaps"], [button("Yearly Rewind"), "Choose yearly recaps"], [page.locator(".rewind-period").first(), "Play this chapter"]]); }],
      ["rewind-player", async () => { await go("/rewind?period=2025-06"); await expect(button("Export PNG")).toBeEnabled(); await capture("rewind-player", [[button("Next slide"), "Next slide"], [button("Resume rewind"), "Start playback"], [button("Export PNG"), "Download this slide"]]); }],
      ["settings", async () => { await go("/settings"); await page.locator(".theme-options").scrollIntoViewIfNeeded(); await capture("settings", [[page.locator(".theme-option").first(), "Light theme"], [page.locator(".theme-option").nth(1), "Dark theme"], [field("A little less motion"), "Reduced motion"]]); }],
      ["backup", async () => { await go("/settings"); await page.locator(".backup-actions").first().scrollIntoViewIfNeeded(); await capture("backup", [[button("Export All Data"), "Download a ZIP backup"], [button("Restore Backup"), "Select a backup to validate"]]); }],
      ["restore", async () => { await go("/settings"); const downloadPromise = page.waitForEvent("download"); await button("Export All Data").click(); const download = await downloadPromise; const buffer = await readFile(await download.path()); await button("I saved this backup").click(); await field("Select ZIP backup").setInputFiles({ name: "MemoTrail-help-example.zip", mimeType: "application/zip", buffer }); await expect(page.getByRole("dialog")).toBeVisible(); await capture("restore", [[page.getByRole("radio", { name: /^Merge/ }), "Merge keeps existing data"], [page.getByRole("radio", { name: /^Replace Existing Data/ }), "Replace requires confirmation"], [button("Cancel"), "Leave your journal unchanged"]]); }],
    ];
    for (const [id, run] of cases) {
      try { await run(); }
      catch (error) { failures.push(`${variant.name}/${id}: ${error.message}`); console.error(`FAILED ${variant.name}/${id}: ${error.message}`); }
    }
    await context.close();
  }
  const total = captures.reduce((sum, item) => sum + item.bytes, 0);
  if (total > 4 * 1024 * 1024) failures.push(`Annotated images exceed the 4 MiB offline budget (${total} bytes).`);
  const header = 'import type { ScreenshotId } from "./help";\nexport interface CaptureMetadata { id: ScreenshotId; variant: "mobile-390" | "mobile-360" | "desktop"; width: number; height: number; bytes: number; annotations: { number: number; label: string; x: number; y: number; width: number; height: number }[]; }\n';
  // Never publish an incomplete mapping after a failed run. Existing assets
  // remain available, and the command returns a failure that must be corrected.
  if (!failures.length) await writeFile(resolve(root, "src/data/help-captures.ts"), `${header}// Generated by npm run docs:screenshots using isolated example data.\nexport const captureMetadata: CaptureMetadata[] = ${JSON.stringify(captures, null, 2)};\n`);
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, "capture-report.json"), JSON.stringify({ generatedAt: new Date().toISOString(), captures: captures.length, imageFiles: captures.length * 2, annotatedBytes: total, failures }, null, 2));
  console.log(`${captures.length} real captures, ${captures.length * 2} WebP files; ${(total / 1024 / 1024).toFixed(2)} MiB of annotated images; ${failures.length} failures.`);
  if (failures.length) process.exitCode = 1;
} catch (error) {
  console.error(`Screenshot generation failed: ${error.message}`);
  failures.push(error.message);
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, "capture-report.json"), JSON.stringify({ generatedAt: new Date().toISOString(), captures: captures.length, imageFiles: captures.length * 2, failures }, null, 2));
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (server && !server.killed) server.kill();
}
