import { describe, it, expect } from '@jest/globals';
import { formatPrice } from '../src/formatPrice';

describe('formatPrice', () => {
  it('formats whole numbers', () => {
    expect(formatPrice(5)).toBe('$5.00');
  });

  it('rounds to two decimals', () => {
    expect(formatPrice(1.005)).toBe('$1.01');
  });
});
