export class StringStack {
  private items: string[] = [];

  push(item: string): void { this.items.push(item); }
  pop(): string | undefined { return this.items.pop(); }
  peek(): string | undefined { return this.items[this.lastIndex()]; }
  size(): number { return this.items.length; }
  isEmpty(): boolean { return this.items.length === 0; }
  clear(): void { this.items = []; }
  toArray(): string[] { return [...this.items]; }
  includes(item: string): boolean { return this.items.includes(item); }
  static of(...xs: string[]): StringStack { const s = new StringStack(); xs.forEach((x) => s.push(x)); return s; }

  private lastIndex(): number { return this.items.length - 1; }
  protected reset(): void { this.clear(); }
}
