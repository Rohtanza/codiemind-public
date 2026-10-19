export function calculateTotal(price, quantity, taxRate) {
  const subtotal = price * quantity;
  return subtotal + subtotal * taxRate;
}
