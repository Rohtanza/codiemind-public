export class RateLimiter {
  private hits = new Map<string, number>();

  constructor(private readonly limit: number) {}

  allow(clientId: string): boolean {
    const count = this.hits.get(clientId) ?? 0;

    if (count >= this.limit) {
      return false;
    }
    this.hits.set(clientId, count + 1);
    return true;
  }
}
