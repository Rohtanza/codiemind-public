export function firstOrDefault<T>(items: readonly T[], fallback: T): T {
  return items.length > 0 ? items[0] : fallback;
}

export function groupBy<T, K extends string>(items: T[], key: (item: T) => K): Record<K, T[]> {
  const result = {} as Record<K, T[]>;
  for (const item of items) {
    const k: K = key(item);
    (result[k] ??= []).push(item);
  }
  return result;
}
