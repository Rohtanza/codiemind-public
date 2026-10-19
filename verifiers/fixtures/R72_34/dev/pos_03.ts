export class Counter {
  private count = 0;

  increment(step = 1): number {
    this.count += step;
    return this.count;
  }

  reset(): void {
    // start over from zero
    this.count = 0;
  }
}
