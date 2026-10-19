export class ShoppingCart {
  private lineItems: { sku: string; qty: number }[] = [];

  addItem(sku: string, qty = 1): void {
    const existingItem = this.lineItems.find((entry) => entry.sku === sku);
    if (existingItem) {
      existingItem.qty += qty;
    } else {
      this.lineItems.push({ sku, qty });
    }
  }

  totalQuantity(): number {
    return this.lineItems.reduce((runningTotal, entry) => runningTotal + entry.qty, 0);
  }
}
