type Item = { sku: string; qty: number };

export function countBackordered(items: Item[] | null, stock: Map<string, number>): number {
  let count = 0;
  if (items) {
    for (const item of items) {
      if ((stock.get(item.sku) ?? 0) < item.qty) {
        count++;
      }
    }
  }
  return count;
}
