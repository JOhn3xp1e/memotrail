import { test as base, expect, type Page } from "@playwright/test";

// Feature regressions exercise the existing journal after genuinely skipping
// the introduction through its UI. Onboarding tests use the unmodified fixture.
export const test = base.extend({
  page: async ({ page }, run) => {
    const navigate = page.goto.bind(page);
    page.goto = async (url: string, options?: Parameters<Page["goto"]>[1]) => {
      let response = await navigate(url, options);
      if (response && !response.headers()["content-type"]?.includes("text/html")) return response;
      await expect(page.locator(".app-shell, .onboarding, .startup-error")).toBeVisible();
      if (await page.locator(".onboarding").count()) {
        await page.getByRole("button", { name: "Skip introduction", exact: true }).click();
        await expect(page.locator(".app-shell")).toBeVisible();
        response = await navigate(url, options);
      }
      return response;
    };
    await run(page);
  },
});
export { expect };
export { devices, type Page } from "@playwright/test";
