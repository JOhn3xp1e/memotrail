import type { Page } from "@playwright/test";
export async function chooseOption(page: Page, label: string, choice: string | { label: string }) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  const list = page.locator(".memo-option-list:visible").last();
  if (typeof choice === "string") await list.locator(`[role="option"][data-value=${JSON.stringify(choice)}]`).click();
  else await list.getByRole("option", { name: choice.label, exact: true }).click();
}
