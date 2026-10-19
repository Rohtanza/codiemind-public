function retry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  return fn().catch((err) => {
    if (attempts <= 1) throw err;
    return retry(fn, attempts - 1);
  });
}

export const MAX_ATTEMPTS = 3;

export { retry as default };
