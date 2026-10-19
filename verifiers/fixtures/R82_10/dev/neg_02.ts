export function parsePort(value: string | undefined): number {
  if (value === undefined) {
    return 3000;
  } else {
    const port = Number(value);
    if (Number.isNaN(port)) {
      return 3000;
    }
    return port;
  }
}
