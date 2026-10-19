export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export const DEFAULT_PAGE_SIZE = 20;
