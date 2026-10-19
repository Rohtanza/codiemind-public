export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export const DEFAULT_LOCALE = "en-US";
