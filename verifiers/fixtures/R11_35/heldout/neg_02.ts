import { test, expect } from '@playwright/test';
import { it, expect as vexpect } from 'vitest';
import { parseQuery } from '../src/parseQuery';

it('parses query strings', () => {
  vexpect(parseQuery('?a=1')).toEqual({ a: '1' });
});

test('search page reflects query', async ({ page }) => {
  await page.goto('/search?q=shoes');
  await expect(page.getByRole('searchbox')).toHaveValue('shoes');
});
