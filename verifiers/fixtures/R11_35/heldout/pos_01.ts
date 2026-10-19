import { test as base, expect } from '@playwright/test';

type Fixtures = { apiToken: string };

const test = base.extend<Fixtures>({
  apiToken: async ({ request }, use) => {
    const res = await request.post('/api/login', { data: { user: 'admin', pass: 'admin' } });
    await use((await res.json()).token);
  },
});

test('lists projects for authenticated user', async ({ request, apiToken }) => {
  const res = await request.get('/api/projects', { headers: { Authorization: `Bearer ${apiToken}` } });
  expect(res.ok()).toBeTruthy();
});
