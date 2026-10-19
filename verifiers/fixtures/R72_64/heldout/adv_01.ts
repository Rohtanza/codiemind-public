export class SafeMath {
  add(a: number,
      b: number): number { return a + b; }
  sub(a: number,
      b: number): number { return a - b; }
  mul(a: number,
      b: number): number { return a * b; }
  div(a: number,
      b: number): number { return b === 0 ? NaN : a / b; }
  min(a: number,
      b: number): number { return Math.min(a, b); }
  max(a: number,
      b: number): number { return Math.max(a, b); }
  pow(a: number,
      b: number): number { return a ** b; }
  mod(a: number,
      b: number): number { return a % b; }
  avg(a: number,
      b: number): number { return (a + b) / 2; }
  hypot(a: number,
      b: number): number { return Math.hypot(a, b); }
}
