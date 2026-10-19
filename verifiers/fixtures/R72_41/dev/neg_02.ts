type Item = { price: number; qty: number };

export const priceSummary = (items: Item[]) => {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  return { subtotal, tax: subtotal * 0.2 };
};

export const formatCurrency = (value: number): string =>
  `$${value.toFixed(2)}`;
