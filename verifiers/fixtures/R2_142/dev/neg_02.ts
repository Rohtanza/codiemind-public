interface Order {
  id: string;
  items: string[];
}

type Shipment = {
  orderId: string;
  carrier: string;
};

export function ship(order: Order): Shipment {
  return { orderId: order.id, carrier: "UPS" };
}
