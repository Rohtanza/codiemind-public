export function sumPrices(items: { price: number; qty: number }[]): number {
  let total = 0;
  for (const item of items) {
    total += item.price * item.qty;
  }
  return total;
}

export function formatTotal(total: number): string {
  const rounded = Math.round(total * 100) / 100;
  return `$${rounded.toFixed(2)}`;
}
