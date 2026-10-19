const codes: Record<string, number> = { SPRING: 0.1, VIP: 0.25 };

export const discountRate = async (code: string): Promise<number> => {
  return codes[code.toUpperCase()] ?? 0;
};

export async function applyDiscount(price: number, code: string) {
  return price * (1 - (await discountRate(code)));
}
