import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import path from "node:path";

const pages = [
  { path: "/", name: "home", title: "Hello, memory keeper" },
  { path: "/timeline", name: "timeline", title: "The days that made you." },
  { path: "/add", name: "add", title: "What would you like to remember?" },
  {
    path: "/collections",
    name: "collections",
    title: "Some things belong together.",
  },
  {
    path: "/settings",
    name: "settings",
    title: "A space that feels like you.",
  },
];

async function waitForVisuals(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images).map((image) => {
        image.loading = "eager";
        return image.decode().catch(() => undefined);
      }),
    );
  });
  await expect(page.locator("main > div").last()).toHaveCSS("opacity", "1");
}

for (const theme of ["light", "dark"]) {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    test(`all screens: ${theme}, ${viewport.width}px, accessibility and layout`, async ({
      page,
    }) => {
      test.setTimeout(120_000);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize(viewport);
      await page.addInitScript((selectedTheme) => {
        localStorage.setItem(
          "memotrail-preferences",
          JSON.stringify({
            state: {
              name: "",
              theme: selectedTheme,
              sampleMode: true,
              reduceMotion: true,
            },
            version: 1,
          }),
        );
      }, theme);
      for (const screen of pages) {
        await page.goto(screen.path);
        await expect(page.getByRole("heading", { level: 1 })).toContainText(
          screen.title,
        );
        await waitForVisuals(page);
        const layout = await page.evaluate(() => ({
          width: innerWidth,
          document: document.documentElement.scrollWidth,
          brokenImages: Array.from(document.images)
            .filter((image) => !image.naturalWidth)
            .map((image) => image.src),
        }));
        expect.soft(
          layout.document,
          `${screen.name} should not scroll horizontally`,
        ).toBeLessThanOrEqual(layout.width);
        expect(layout.brokenImages).toEqual([]);
        await page.screenshot({
          path: `artifacts/${screen.name}-${theme}-${viewport.width}.png`,
          fullPage: true,
          animations: "disabled",
        });
        const a11y = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect.soft(
          a11y.violations.map(({ id, nodes }) => ({
            id,
            elements: nodes.map((node) => ({
              target: node.target,
              summary: node.failureSummary,
            })),
          })),
        ).toEqual([]);
      }
      expect(errors).toEqual([]);
    });
  }
}

test("sample search, filters, albums, favorites, and jar work without a memory database", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Pick a memory" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const dialogAccessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(dialogAccessibility.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("textbox", { name: "Search memories", exact: true })
    .fill("coffee");
  await page
    .getByRole("textbox", { name: "Search memories", exact: true })
    .press("Enter");
  await expect(page.locator(".memory-card")).toHaveCount(1);
  await expect(page.locator(".memory-card")).toContainText(
    "The slowest of Sundays",
  );
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page.locator(".memory-card")).toHaveCount(7);
  await page.getByRole("button", { name: "Favorites", exact: true }).click();
  await expect(page.locator(".memory-card")).toHaveCount(4);
  await page
    .getByRole("button", {
      name: "Unfavorite sample memory: A little closer to nature",
    })
    .click();
  await expect(page.locator(".memory-card")).toHaveCount(3);
  await page.getByRole("button", { name: "All moments" }).click();
  await page
    .getByRole("textbox", { name: "Filter the timeline by keyword" })
    .fill("no-such-memory");
  await expect(page.getByText("No moments found, just yet.")).toBeVisible();
  await page.getByRole("button", { name: "Show all moments" }).click();
  await page.getByRole("button", { name: "Journal list" }).click();
  await expect(page.locator(".timeline-gallery")).toHaveClass(/journal-view/);
  await page.goto("/collections");
  await page.locator(".collection-card").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Little adventures",
  );
  await expect(page.locator(".memory-card")).toHaveCount(3);
  const databases = await page.evaluate(() => indexedDB.databases());
  expect(databases.some((database) => database.name === "memotrail")).toBe(
    false,
  );
});

test("personalization and empty states persist, while the draft stays in memory only", async ({
  page,
}) => {
  await page.goto("/settings");
  await page.getByLabel("What should we call you?").fill("Alex");
  await page.getByRole("button", { name: "Save name" }).click();
  await page.getByRole("switch", { name: "Show the sample scrapbook" }).click();
  await page.getByRole("button", { name: /After hours/ }).click();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Hello, Alex",
  );
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator(".memory-card")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "A beautiful story starts here" }),
  ).toBeVisible();
  await page.goto("/timeline");
  await expect(
    page.getByRole("heading", { name: "Your story is just beginning" }),
  ).toBeVisible();
  await page.goto("/collections");
  await expect(
    page.getByRole("heading", { name: "A little home for every chapter" }),
  ).toBeVisible();
  await page.goto("/add");
  await page
    .getByLabel("Give this moment a title")
    .fill("Our lovely afternoon");
  await page
    .getByLabel("What made it special?")
    .fill("A long walk and a good conversation.");
  await page
    .locator("input[type=file]")
    .setInputFiles(path.resolve("public/photos/wildflowers.jpg"));
  await expect(page.locator(".uploaded-photo")).toHaveCount(1);
  await page.getByRole("button", { name: "Start over", exact: true }).click();
  await page.getByRole("button", { name: "Keep my draft" }).click();
  await expect(page.locator(".uploaded-photo")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Preview memory", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Our lovely afternoon");
  await expect(page.getByRole("dialog")).toContainText(
    "This is a preview, not a saved memory.",
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Home", exact: true })
    .click();
  await page.locator(".sidebar-add").click();
  await expect(page.getByLabel("Give this moment a title")).toHaveValue(
    "Our lovely afternoon",
  );
  await page.reload();
  await expect(page.getByLabel("Give this moment a title")).toHaveValue("");
  await expect(page.locator(".uploaded-photo")).toHaveCount(0);
  const storage = await page.evaluate(() =>
    Object.values(localStorage).join(" "),
  );
  expect(storage).not.toContain("Our lovely afternoon");
  expect(
    (await page.evaluate(() => indexedDB.databases())).some(
      (database) => database.name === "memotrail",
    ),
  ).toBe(false);
});

test("production caches every screen, font, and photograph for offline navigation", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  for (const screen of pages) {
    await page.goto(screen.path);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      screen.title,
    );
    await waitForVisuals(page);
    expect(
      await page.evaluate(() =>
        Array.from(document.images).every(
          (image) => image.complete && image.naturalWidth > 0,
        ),
      ),
    ).toBe(true);
  }
  const response = await page.request.get("/manifest.webmanifest");
  const manifest = await response.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons).toHaveLength(3);
});

test("small and tablet screens, mobile navigation, and unknown routes", async ({
  page,
}) => {
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    for (const screen of pages) {
      await page.goto(screen.path);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        screen.title,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Add Memory" })
    .click();
  await expect(page).toHaveURL("/add");
  await page.goto("/lost-in-the-woods");
  await expect(
    page.getByRole("heading", { name: "This trail leads somewhere else." }),
  ).toBeVisible();
});

test('system theme follows the device and the quick toggle uses the resolved theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/settings');
  await page.getByRole('button', { name: /Go with the flow/ }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.getByRole('button', { name: /Go with the flow/ }).click();
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.getByRole('switch', { name: 'A little less motion' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', '');
});
