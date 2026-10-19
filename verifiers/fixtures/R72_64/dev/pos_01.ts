export class TokenBucket {
  private tokens: number;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.tokens = capacity;
  }

  tryTake(): boolean {
    if (this.tokens === 0) return false;
    this.tokens -= 1;
    return true;
  }

  refill(): void {
    this.tokens = this.capacity;
  }
}
