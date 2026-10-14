import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";

// Native installation is owned by the OS. These controlled browser events
// exercise the app UI without claiming a headless test installed a real app.
async function offerInstall(page: import("@playwright/test").Page, mode: "accepted" | "dismissed" | "failed" | "pending") {
  await page.evaluate((outcome) => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: () => outcome === "failed" ? Promise.reject(new Error("Prompt unavailable")) : Promise.resolve(),
      userChoice: outcome === "pending" ? new Promise(() => {}) : Promise.resolve({ outcome }),
    });
    window.dispatchEvent(event);
  }, mode);
  await page.getByRole("button", { name: "Install MemoTrail", exact: true }).click();
}

test("accepted install shows app progress, stays honest, then handles browser completion", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.locator(".install-status")).toContainText("Ready for offline adventures");
  await offerInstall(page, "accepted");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Your request is with the browser");
  await expect(dialog.getByRole("progressbar")).toBeVisible();
  await expect(dialog.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow");
  await expect(page.getByText("Already at home on this device")).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await dialog.getByRole("button", { name: "Keep using MemoTrail" }).click();
  await page.getByRole("button", { name: "View installation progress" }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(dialog).toContainText("Your browser accepted MemoTrail");
  await expect(dialog).toContainText("system may still be finishing installation");
  await dialog.getByRole("button", { name: "Back to my journal" }).click();
  await expect(page.getByText("Already at home on this device")).toBeVisible();
});

for (const mode of ["dismissed", "failed"] as const) {
  test(`install ${mode} stops progress and leaves journal usable`, async ({ page }) => {
    await page.goto("/settings"); await offerInstall(page, mode);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(mode === "dismissed" ? "Whenever you’re ready" : "Let’s try another way");
    await expect(dialog.locator(".install-progress-track")).not.toHaveClass(/is-waiting/);
    await dialog.getByRole("button", { name: "Keep using MemoTrail" }).click();
    await page.getByRole("button", { name: "How to install" }).click();
    await expect(page.getByRole("dialog")).toContainText("On Android");
  });
}

test("stalled install has a bounded wait and recovers on a late browser event", async ({ page }) => {
  await page.goto("/settings"); await page.clock.install();
  await offerInstall(page, "pending");
  await expect(page.getByRole("dialog")).toContainText("Confirm Install");
  await page.clock.fastForward(46_000);
  await expect(page.getByRole("dialog")).toContainText("Taking a little longer");
  await expect(page.locator(".install-progress-track")).not.toHaveClass(/is-waiting/);
  await expect(page.getByRole("dialog")).toContainText("don’t clear browser or site data");
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(page.getByRole("dialog")).toContainText("Your browser accepted MemoTrail");
});

test("mobile progress fits and respects reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/settings"); await offerInstall(page, "accepted");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight;
  })).toBe(true);
  await expect(dialog.locator(".install-progress-track > span")).toHaveCSS("animation-name", "none");
  expect(await dialog.getByRole("button", { name: "Keep using MemoTrail" }).evaluate((element) => element.getBoundingClientRect().bottom <= innerHeight)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: "artifacts/install-progress-mobile.png" });
});

test("production manifest, icons and Chrome installability diagnostics are valid", async ({ request }, testInfo) => {
  // Normal Playwright contexts are incognito, where Chrome rejects native
  // installation. Use a separate disposable profile, never the user's one.
  const context = await chromium.launchPersistentContext(testInfo.outputPath("install-profile"), {
    channel: "chrome", headless: true, baseURL: "http://127.0.0.1:4173",
  });
  try {
  const page = await context.newPage();
  await test.step("Load and finish the introduction", async () => {
    await page.goto("/");
    await page.getByRole("button", { name: "Skip introduction", exact: true }).click();
    await expect(page.locator(".app-shell")).toBeVisible();
  });
  const session = await context.newCDPSession(page);
  const manifest = await test.step("Read Chrome's manifest", () => session.send("Page.getAppManifest"));
  expect(manifest.errors).toEqual([]);
  const data = JSON.parse(manifest.data!);
  expect(data.display).toBe("standalone"); expect(data.start_url).toBe("/"); expect(data.id).toBe("/");
  for (const icon of data.icons) {
    const response = await request.get(icon.src);
    expect(response.ok()).toBe(true); expect(response.headers()["content-type"]).toContain("image/png");
    const bytes = await response.body(); expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`).toBe(icon.sizes);
  }
  const diagnostics = await test.step("Read Chrome's installability errors", () => session.send("Page.getInstallabilityErrors"));
  expect(diagnostics.installabilityErrors).toEqual([]);
  } finally { await context.close(); }
});
