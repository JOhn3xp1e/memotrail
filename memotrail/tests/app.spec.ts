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

test("sample search, filters, albums, favorites, and jar remain demo-only", async ({
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
      name: "Unfavorite memory: A little closer to nature",
    })
    .click();
  await expect(page.locator(".memory-card")).toHaveCount(3);
  await page.getByRole("button", { name: "All moments" }).click();
  await page
    .getByRole("textbox", { name: "Search memories by title or description" })
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
  expect(databases.some((database) => database.name === "memotrail")).toBe(true);
  const storedMemoryCount = await page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const request = indexedDB.open("memotrail");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const transaction = request.result.transaction("memories", "readonly");
          const count = transaction.objectStore("memories").count();
          count.onsuccess = () => resolve(count.result);
          count.onerror = () => reject(count.error);
        };
      }),
  );
  expect(storedMemoryCount).toBe(0);
});

test("personalization and personal memory persistence work independently of samples", async ({
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
    .getByRole("button", { name: "Preview", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Our lovely afternoon");
  await expect(page.getByRole("dialog")).toContainText(
    "not saved until you choose Save memory",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Save memory" }).click();
  await expect(page).toHaveURL(/\/timeline$/);
  await expect(page.locator(".memory-card")).toContainText(
    "Our lovely afternoon",
  );
  await page.reload();
  await expect(page.locator(".memory-card")).toContainText(
    "Our lovely afternoon",
  );
  const storage = await page.evaluate(() =>
    Object.values(localStorage).join(" "),
  );
  expect(storage).not.toContain("Our lovely afternoon");
  expect(
    (await page.evaluate(() => indexedDB.databases())).some(
      (database) => database.name === "memotrail",
    ),
  ).toBe(true);
});

test("collections, memory editing, filters, favorites, and confirmed deletion work", async ({
  page,
  context,
}) => {
  await page.goto("/collections");
  await page.getByRole("button", { name: "New collection" }).click();
  await page.getByLabel("Collection name").fill("Summer walks");
  await page
    .getByLabel("A little description")
    .fill("Slow afternoons by the water.");
  await page.getByRole("button", { name: "Create collection" }).click();
  await expect(page.locator(".collection-card")).toContainText("Summer walks");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Collection name").fill("Summer walk collection");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".collection-card")).toContainText(
    "Summer walk collection",
  );

  await page.goto("/add");
  await page.getByLabel("Give this moment a title").fill("The blue lake");
  await page
    .getByLabel("What made it special?")
    .fill("A long walk beside the lake.");
  await page.getByLabel("Where were you?").fill("Lake Louise");
  await page.getByRole("button", { name: "Create a collection" }).click();
  await page.getByLabel("Collection name").fill("Lake chapters");
  await page
    .getByLabel("A little description")
    .fill("Quiet moments by the water.");
  await page.getByRole("button", { name: "Create collection" }).click();
  await expect(page.getByLabel("Give this moment a title")).toHaveValue(
    "The blue lake",
  );
  await page.getByLabel("Add to a collection").selectOption({
    label: "Lake chapters",
  });
  await page.getByRole("button", { name: /Happy/ }).click();
  await page.locator("input[type=file]").setInputFiles([
    path.resolve("public/photos/lake-weekend.jpg"),
    path.resolve("public/photos/wildflowers.jpg"),
  ]);
  await expect(page.locator(".uploaded-photo")).toHaveCount(2);
  await page.getByRole("button", { name: "Save memory" }).click();
  await expect(page).toHaveURL(/\/timeline$/);
  await expect(page.locator(".memory-card")).toContainText("The blue lake");

  await page
    .getByRole("button", { name: "Favorite memory: The blue lake" })
    .click();
  await expect(
    page.getByRole("button", { name: "Unfavorite memory: The blue lake" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Filter by mood").selectOption("happy");
  await page
    .getByLabel("Filter by collection")
    .selectOption({ label: "Lake chapters" });
  await page.getByLabel("Filter from date").fill("2025-01-01");
  await page.getByLabel("Filter to date").fill("2026-12-31");
  await expect(page.locator(".memory-card")).toHaveCount(1);
  await page.getByLabel("Filter by mood").selectOption("");
  await page.getByLabel("Filter by collection").selectOption("");
  await page.getByLabel("Filter from date").fill("");
  await page.getByLabel("Filter to date").fill("");

  await page
    .locator(".memory-card h3 button")
    .filter({ hasText: "The blue lake" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "A long walk beside the lake.",
  );
  await page.getByRole("link", { name: "Edit memory" }).click();
  await expect(page.getByLabel("Give this moment a title")).toHaveValue(
    "The blue lake",
  );
  await page.getByLabel("Give this moment a title").fill("The quiet blue lake");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Memory changes saved privately on this device.",
  );
  await page.goto("/timeline");
  await expect(page.locator(".memory-card")).toContainText(
    "The quiet blue lake",
  );
  await page.reload();
  await expect(page.locator(".memory-card")).toContainText(
    "The quiet blue lake",
  );
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(() => !!navigator.serviceWorker.controller),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".memory-card")).toContainText(
    "The quiet blue lake",
  );
  await context.setOffline(false);

  await page
    .locator(".memory-card h3 button")
    .filter({ hasText: "The quiet blue lake" })
    .click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete memory" }).click();
  await expect(page.locator(".memory-card")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Your story is just beginning" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/timeline$/);
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
