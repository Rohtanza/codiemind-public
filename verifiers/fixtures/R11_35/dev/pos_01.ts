import { test, expect } from '@playwright/test';

test('homepage has title', async ({ page }) => {
  await page.goto('https://example.com/');
  await expect(page).toHaveTitle(/Example/);
});

test('get started link navigates', async ({ page }) => {
  await page.goto('https://example.com/');
  await page.getByRole('link', { name: 'More information' }).click();
  await expect(page).toHaveURL(/iana/);
});
