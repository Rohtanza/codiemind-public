import { test } from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

test('dashboard renders heading', async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/dashboard');
  const heading = await page.$eval('h1', (el) => el.textContent);
  assert.equal(heading, 'Dashboard');
  await browser.close();
});
