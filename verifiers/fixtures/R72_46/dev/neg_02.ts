export class Session {
  private expiresAt: number;

  constructor(ttlMs: number) {
    this.expiresAt = Date.now() + ttlMs;
  }

  isExpired(now: number): boolean {
    return now >= this.expiresAt;
  }

  active(now: number): boolean {
    return now < this.expiresAt;
  }
}
