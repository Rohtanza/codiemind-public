type Order = { id: string; total: number; coupon?: string };

export function buildInvoice(order: Order | null) {
  if (order) {
    const invoice = { orderId: order.id, amount: order.total };
    if (order.coupon) {
      invoice.amount = Math.max(0, invoice.amount - 5);
    }
    return invoice;
  }
  return null;
}
