type Item = { price: number; quantity: number };

export const computeTotal = (items: Item[], tax_rate: number): number => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return subtotal * (1 + tax_rate);
};
