export function shippingCost(weightKg: number, express: boolean): number {
  if (weightKg <= 0) {
    throw new Error("weight must be positive");
  }
  if (express) return weightKg * 4.5 + 10;

  if (weightKg < 1) {
    return 3;
  } else if (weightKg < 5) {
    return 7;
  } else {
    return 7 + (weightKg - 5) * 1.2;
  }
}
