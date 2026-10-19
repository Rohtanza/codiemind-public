const { test, expect } = require('@playwright/test');

test('todo item can be added', async ({ page }) => {
  await page.goto('/todos');
  await page.getByPlaceholder('What needs to be done?').fill('buy milk');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('todo-item')).toHaveCount(1);
});
