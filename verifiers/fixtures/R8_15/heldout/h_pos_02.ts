import { RetryPolicy } from "../src/retry";

class FakeClock {
  now = 0;
  advance(ms: number) { this.now += ms; }
}

export class TestRetryPolicy {
  testBackoffDoubles(): boolean {
    const policy = new RetryPolicy({ base: 100, clock: new FakeClock() });
    return policy.delay(2) === 2 * policy.delay(1);
  }

  testGivesUpAfterMax(): boolean {
    return new RetryPolicy({ max: 3 }).shouldRetry(4) === false;
  }
}
