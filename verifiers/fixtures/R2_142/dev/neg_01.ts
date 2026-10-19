export type Product = {
  sku: string;
  price: number;
  inStock: boolean;
};

export function total(items: Product[]): number {
  return items.reduce((sum, p) => sum + p.price, 0);
}
