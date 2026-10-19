export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export const double = (n: number): number => n * 2;
