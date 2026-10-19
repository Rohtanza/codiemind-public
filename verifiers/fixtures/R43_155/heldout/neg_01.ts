export class Cache {
  private store = new Map<string, string>();

  get(key: string): string | undefined {
    try {
      return this.store.get(key);
    } catch (error: unknown) {
      return undefined;
    }
  }

  restore(snapshot: string): void {
    try {
      const entries = JSON.parse(snapshot) as [string, string][];
      this.store = new Map(entries);
    } catch {
      this.store.clear();
    }
  }
}
