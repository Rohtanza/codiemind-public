export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export function sumLineItems(items: { price: number; qty: number }[]): number {
  return items.reduce((total, item) => total + item.price * item.qty, 0);
}
