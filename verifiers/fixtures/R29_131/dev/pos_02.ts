export function parsePort(value: string | undefined, fallback = 3000): number {
  if (value === undefined) {
    return fallback;
  }
  const port = Number.parseInt(value, 10);
  if (Number.isNaN(port) || port <= 0 || port > 65535) {
    console.warn(`Invalid PORT "${value}", falling back to ${fallback}`);
    return fallback;
  }
  return port;
}
