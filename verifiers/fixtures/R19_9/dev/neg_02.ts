interface Order {
  id: string;
  total: number;
}

export function totalOf(orders: Order[]): number {
  return orders.reduce((sum: number, o: Order) => sum + o.total, 0);
}

export function legacyTotal(raw: unknown): number {
  const orders = raw as any;
  return orders.items.length;
}
