export function parseNumber(input: string): number | undefined {
  try {
    const n = Number.parseInt(input, 10);
    if (Number.isNaN(n)) throw new Error("not a number");
    return n;
  } catch {
    return undefined;
  }
}
