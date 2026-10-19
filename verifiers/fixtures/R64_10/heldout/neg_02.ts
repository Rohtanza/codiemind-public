export class Cache {
  private store: Map<string, unknown> = new Map();

  get(key: string): unknown {
    return this.store.get(key);
  }

  set(key: string, value: unknown): void {
    this.store.set(key, value);
  }
}

export const handlers = new Map<string, (event: string) => Promise<any>>();
