export function retry<T>(fn: () => T, attempts = 3): T {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return fn();
    } catch (e: unknown) {
      last = e;
      try {
        console.debug(`attempt ${i + 1} failed`);
      } catch (inner: unknown) {
        void inner;
      }
    }
  }
  throw last;
}
