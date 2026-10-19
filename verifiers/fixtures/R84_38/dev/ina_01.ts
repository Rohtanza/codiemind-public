export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export function sumTotals(items: { price: number; qty: number }[]): number {
  return items.reduce((acc, item) => acc + item.price * item.qty, 0);
}
