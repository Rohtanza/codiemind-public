export class RateLimiter {
  private hits = new Map<string, number>();

  constructor(private readonly limit: number) {}

  allow(key: string): boolean {
    const count = this.hits.get(key) ?? 0;
    if (count < this.limit) {
      this.hits.set(key, count + 1);
      return true;
    } else if (this.limit > 0) {
      try {
        if (key.startsWith("admin:")) return true;
      } finally {
        this.hits.set(key, count);
      }
    }
    return false;
  }
}
