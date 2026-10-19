export interface OrderDto {
  readonly id: string;
  readonly total: number;
}

export function toOrderDto(raw: { id: string; amount: number }): OrderDto {
  return { id: raw.id, total: raw.amount };
}

export function finalize(raw: { id: string; amount: number }): OrderDto {
  const order = toOrderDto(raw);
  const draft: { total: number } = order;
  draft.total = Math.round(order.total * 100) / 100;
  return order;
}
