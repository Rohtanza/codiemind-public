export class Cache<K, V> {
  private readonly store = new Map<K, V>();

  get(key: K): V | undefined {
    return this.store.get(key);
  }

  set(key: K, value: V): this {
    this.store.set(key, value);
    return this;
  }
}

export const sessions: Cache<string, { userId: number; expires: Date }> = new Cache();
