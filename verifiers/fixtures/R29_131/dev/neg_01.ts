interface CartItem {
  price: number;
  quantity: number;
}

export function cartTotal(items: CartItem[]): number {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  console.log("cart total", total);
  return Math.round(total * 100) / 100;
}
