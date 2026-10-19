/*
Previous implementation, kept for reference:

function legacyTotal(values) {
  return values.reduce((a, b) => a + b, 0);
}
*/

export function calculateTotal(values: number[]): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}
