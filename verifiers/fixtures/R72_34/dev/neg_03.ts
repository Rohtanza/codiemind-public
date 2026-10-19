export class TodoStore {
  private items: string[] = [];

  add(item: string): void {
    this.items.push(item);
  }

  remove(item: string): void {
    const index = this.items.indexOf(item);

    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }
}
