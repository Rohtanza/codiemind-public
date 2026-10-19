export class Registry<T = any> {
  private items = new Map<string, T>();

  register(name: string, item: T): void {
    this.items.set(name, item);
  }

  lookup(name: string): T | undefined {
    return this.items.get(name);
  }
}
