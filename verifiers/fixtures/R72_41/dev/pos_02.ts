type Order = { id: string; amount: number };

export const fetchOrders = async (baseUrl: string): Promise<Order[]> => {
  const res = await fetch(`${baseUrl}/orders`);
  return res.json();
};

export const computeTotal = (orders: Order[]): number =>
  orders.reduce((sum, o) => sum + o.amount, 0);
