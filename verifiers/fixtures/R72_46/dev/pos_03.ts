export const isEven = (n: number) => n % 2 === 0;

export const shouldRetry = (status: number) => status >= 500 && status !== 501;

export const half = (n: number) => n / 2;
