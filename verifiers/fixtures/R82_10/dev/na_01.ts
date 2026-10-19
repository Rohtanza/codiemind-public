export interface LineItem {
  price: number;
  quantity: number;
}

export const subtotal = (items: LineItem[]): number =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0);

export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
