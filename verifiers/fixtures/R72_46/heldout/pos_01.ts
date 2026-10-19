export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export const tokenUtils = {
  hasExpired(exp: number, now: number): boolean {
    return exp <= now;
  },
  parse(token: string): string[] {
    return token.split(".");
  },
};
