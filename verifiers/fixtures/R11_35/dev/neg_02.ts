import { describe, test, expect, vi } from 'vitest';
import { fetchUser } from '../src/api';

describe('fetchUser', () => {
  test('returns parsed user', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 1, name: 'Ada' })),
    );
    await expect(fetchUser(1)).resolves.toEqual({ id: 1, name: 'Ada' });
    spy.mockRestore();
  });
});
