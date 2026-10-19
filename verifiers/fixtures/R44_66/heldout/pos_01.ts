export * from "./dates";
export { parseQuery, buildQuery } from "./query";
export type { QueryParams } from "./query";

export class LruCache<K, V> {
  private store = new Map<K, V>();
  constructor(private readonly limit: number) {}

  get(key: K): V | undefined {
    const value = this.store.get(key);
    if (value !== undefined) {
      this.store.delete(key);
      this.store.set(key, value);
    }
    return value;
  }
}
