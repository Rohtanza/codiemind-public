// Accept unknown input instead of `any`, then narrow it.
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readPort(config: unknown): number {
  if (isRecord(config) && typeof config.port === "number") {
    return config.port;
  }
  return 3000;
}
