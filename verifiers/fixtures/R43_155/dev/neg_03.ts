export function saveAll(items: string[], store: Map<string, string>): void {
  for (const item of items) {
    try {
      store.set(item, item.toUpperCase());
    } catch (e: unknown) {
      console.warn("set failed", e);
    }
  }
  try {
    console.log(`saved ${store.size} items`);
  } catch (logError) {
    // ignore logging failures
  }
}
