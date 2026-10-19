import { test, expect } from '@playwright/test';

test.describe('login form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('shows error on bad password', async ({ page }) => {
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('wrong');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toContainText('Invalid credentials');
  });
});
