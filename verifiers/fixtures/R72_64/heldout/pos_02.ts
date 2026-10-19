export const LruCache = class<K, V> {
  #map = new Map<K, V>();
  #limit: number;
  hits = 0;
  misses = 0;

  constructor(limit: number) {
    this.#limit = limit;
  }

  get(key: K): V | undefined {
    const value = this.#map.get(key);
    if (value === undefined) { this.misses++; return undefined; }
    this.#map.delete(key);
    this.#map.set(key, value);
    this.hits++;
    return value;
  }

  set(key: K, value: V): void {
    this.#map.delete(key);
    this.#map.set(key, value);
    if (this.#map.size > this.#limit) this.#evict();
  }

  #evict(): void {
    const oldest = this.#map.keys().next().value as K;
    this.#map.delete(oldest);
  }
};
