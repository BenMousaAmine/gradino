export type Rational = { n: number; d: number };

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

export function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

export function rational(n: number, d = 1): Rational {
  if (d === 0) throw new Error("Zero denominator");
  const sign = d < 0 ? -1 : 1;
  const divisor = gcd(n, d) || 1;
  return { n: (sign * n) / divisor, d: (sign * d) / divisor };
}

export const add = (a: Rational, b: Rational) => rational(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a: Rational, b: Rational) => rational(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a: Rational, b: Rational) => rational(a.n * b.n, a.d * b.d);
export const div = (a: Rational, b: Rational) => rational(a.n * b.d, a.d * b.n);
export const compare = (a: Rational, b: Rational) => a.n * b.d - b.n * a.d;
export const toNumber = (a: Rational) => a.n / a.d;

export function texFraction(n: number, d: number): string {
  return `\\frac{${n}}{${d}}`;
}

export function texRational(value: Rational): string {
  return value.d === 1 ? String(value.n) : texFraction(value.n, value.d);
}
