export interface Money {
  amount: number;
  currency: string;
}

export function formatMoney({ amount, currency }: Money): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export const sumMoney = (items: Money[]): number =>
  items.reduce((total, item) => total + item.amount, 0);
