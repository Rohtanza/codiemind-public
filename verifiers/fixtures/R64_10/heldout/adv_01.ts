interface Order {
  id: string;
  total: number;
}

export function orderIds(orders: Order[]): string[] {
  return orders.map((order) => order.id);
}

export function grandTotal(orders: Order[]): number {
  return orders.reduce((sum, order) => sum + order.total, 0);
}
