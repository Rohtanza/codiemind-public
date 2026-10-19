import { test, expect } from '@playwright/experimental-ct-react';
import { Counter } from '../src/Counter';

test('increments on click', async ({ mount }) => {
  const component = await mount(<Counter initial={0} />);
  await component.getByRole('button', { name: '+' }).click();
  await expect(component.getByTestId('count')).toHaveText('1');
});
