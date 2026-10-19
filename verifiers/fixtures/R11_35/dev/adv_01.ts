import { calculateDiscount } from '../src/pricing';

describe('calculateDiscount', () => {
  it('applies 10% for orders over 100', () => {
    expect(calculateDiscount(200)).toBe(20);
  });

  it('applies nothing for small orders', () => {
    expect(calculateDiscount(50)).toBe(0);
  });
});
