declare module "cache-store" {
  interface ICacheEntry<V> {
    value: V;
    expiresAt: number;
  }

  export interface ICacheStore {
    get<V>(key: string): ICacheEntry<V> | undefined;
    set<V>(key: string, value: V, ttlMs: number): void;
  }
}
