export class RateLimiter {
  private count = 0;

  constructor(private readonly limit: number) {}

  tryAcquire(): boolean {
    if (this.count >= this.limit) {
      return false;
    }
    this.count += 1;
    return true;
  }

  reset(): void {
    this.count = 0;
  }
}
