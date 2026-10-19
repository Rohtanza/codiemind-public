export class ShoppingCart {
  private items: string[] = [];

  addItem(name: string): void {
    this.items.push(name);
  }

  cartItems(): string[] {
    return [...this.items];
  }
}
