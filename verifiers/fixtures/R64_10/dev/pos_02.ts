export class Counter {
  private count: number;

  constructor(start: number) {
    this.count = start;
  }

  increment(step: number = 1): number {
    this.count += step;
    return this.count;
  }

  reset(): void {
    this.count = 0;
  }
}
