const DECIMAL_PATTERN = /^-?(?:\d+(?:,\d*)?|,\d+)$/;
const INTEGER_PATTERN = /^-?\d+$/;

function normalize(input: string): string {
  return input.trim().replace(/\s+/g, "").replace(/−/g, "-").replace(/\./g, ",").replace(/^\+/, "");
}

export function parseDecimal(input: string): number | null {
  const normalized = normalize(input);
  if (!DECIMAL_PATTERN.test(normalized)) return null;
  return Number(normalized.replace(",", "."));
}

export function parseInteger(input: string): number | null {
  const normalized = normalize(input);
  if (!INTEGER_PATTERN.test(normalized)) return null;
  return Number(normalized);
}

export function sameNumber(a: number, b: number, tolerance = 0): boolean {
  return Math.abs(a - b) <= tolerance + 1e-9;
}

export function formatDecimal(value: number): string {
  return String(value).replace(".", ",").replace("-", "−");
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    [x, y] = [y, x % y];
  }
  return x;
}

export type Fraction = { numerator: number; denominator: number };

export function normalizeFraction(numerator: number, denominator: number): Fraction | null {
  if (denominator === 0) return null;
  const sign = denominator < 0 ? -1 : 1;
  return { numerator: numerator * sign, denominator: denominator * sign };
}

export function equivalentFractions(a: Fraction, b: Fraction): boolean {
  return a.numerator * b.denominator === b.numerator * a.denominator;
}

export function isReduced(fraction: Fraction): boolean {
  return gcd(fraction.numerator, fraction.denominator) === 1;
}
