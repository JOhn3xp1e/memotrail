import type { Page } from '@playwright/test';
export async function closeMimoChat(page: Page) {
  await page.getByRole('dialog', { name: 'A little help from Mimo' }).waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Chat with Mimo' }).waitFor();
}
