interface Config {
  retries: number;
  timeoutMs: number;
}

export function applyOverride(config: Config, key: string, value: number): Config {
  const copy = { ...config };
  (copy as any)[key] = value;
  return copy;
}
