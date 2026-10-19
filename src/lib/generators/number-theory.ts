import { gcd, lcm } from "@/lib/math/rational";
import { choiceItem, distinctOptions, numberItem, retry, type GeneratorFn } from "./build";
import type { Random } from "./random";

type Factors = Array<[number, number]>;

function factorize(value: number): Factors {
  const factors: Factors = [];
  let rest = value;
  for (let prime = 2; prime * prime <= rest; prime++) {
    let exponent = 0;
    while (rest % prime === 0) {
      rest /= prime;
      exponent++;
    }
    if (exponent > 0) factors.push([prime, exponent]);
  }
  if (rest > 1) factors.push([rest, 1]);
  return factors;
}

function texFactors(factors: Factors): string {
  return factors.map(([prime, exponent]) => (exponent > 1 ? `${prime}^{${exponent}}` : String(prime))).join(" \\times ");
}

function product(factors: Factors): number {
  return factors.reduce((total, [prime, exponent]) => total * prime ** exponent, 1);
}

function isPrime(value: number): boolean {
  return value > 1 && factorize(value).length === 1 && factorize(value)[0][1] === 1;
}

function buildNumber(random: Random, primes: number[], maxExponent: number, min: number, max: number): number {
  return retry(
    random,
    (r) => {
      const value = primes.reduce((total, prime) => total * prime ** r.int(0, maxExponent), 1);
      const count = factorize(value).reduce((total, [, exponent]) => total + exponent, 0);
      return value >= min && value <= max && count >= 3 ? value : null;
    },
    min <= 60 ? 60 : 360,
  );
}

export const primeFactorization: GeneratorFn = (random, difficulty) => {
  const value =
    difficulty === 1
      ? buildNumber(random, [2, 3, 5], 3, 12, 90)
      : difficulty === 2
        ? buildNumber(random, [2, 3, 5, 7], 3, 60, 300)
        : buildNumber(random, [2, 3, 5, 7, 11], 4, 200, 1500);
  const factors = factorize(value);
  const correct = `$${texFactors(factors)}$`;
  const flat = factors.flatMap(([prime, exponent]) => Array.from({ length: exponent }, () => prime));

  const merged = flat[flat.length - 1] * flat[flat.length - 2];
  const incompleteFactors = factorize(flat.slice(0, -2).reduce((total, prime) => total * prime, 1));
  const incomplete = `$${incompleteFactors.length > 0 ? `${texFactors(incompleteFactors)} \\times ` : ""}${merged}$`;
  const half = value / flat[0];
  const notPrime = `$${flat[0]} \\times ${half}$`;
  const wrongExponent = `$${texFactors(factors.map(([prime, exponent], index) => [prime, index === 0 ? exponent + 1 : exponent]))}$`;
  const missing = factors.length > 1 ? `$${texFactors(factors.slice(1))}$` : `$${texFactors([[factors[0][0], factors[0][1] - 1]])}$`;

  const { options, correctId, idOf } = distinctOptions(random, correct, [incomplete, notPrime, wrongExponent, missing]);
  return choiceItem({
    prompt: `Qual è la scomposizione in fattori primi di ${value}?`,
    options,
    correct: correctId,
    errors: [
      { option: idOf(incomplete), tag: "incomplete_factorization", message: `${merged} non è un numero primo: si può ancora scomporre.` },
      ...(isPrime(half)
        ? []
        : [{ option: idOf(notPrime), tag: "not_prime_factors", message: `${half} non è un numero primo: bisogna continuare a scomporre.` }]),
      { option: idOf(wrongExponent), tag: "factorization_exponent", message: `Moltiplica i fattori: il risultato deve tornare ${value}.` },
      { option: idOf(missing), tag: "factorization_missing", message: `Moltiplica i fattori: il risultato deve tornare ${value}.` },
    ],
    solution: [
      `Divido ${value} per i numeri primi, partendo da 2: ${flat.join(", ")}`,
      `Raccolgo i fattori uguali con le potenze: $${value} = ${texFactors(factors)}$`,
    ],
  });
};

function commonFactors(a: Factors, b: Factors, pick: "min" | "max"): Factors {
  const primes = [...new Set([...a, ...b].map(([prime]) => prime))].sort((x, y) => x - y);
  return primes
    .map((prime): [number, number] => {
      const ea = a.find(([p]) => p === prime)?.[1] ?? 0;
      const eb = b.find(([p]) => p === prime)?.[1] ?? 0;
      return [prime, pick === "min" ? Math.min(ea, eb) : Math.max(ea, eb)];
    })
    .filter(([, exponent]) => exponent > 0);
}

function pair(random: Random, minFactor: number, maxFactor: number, minMultiplier: number, maxMultiplier: number, limit: number) {
  return retry(
    random,
    (r) => {
      const g = r.int(minFactor, maxFactor);
      const x = r.int(minMultiplier, maxMultiplier);
      const y = r.int(minMultiplier, maxMultiplier);
      if (x === y || gcd(x, y) !== 1 || g * Math.max(x, y) > limit) return null;
      return { a: g * x, b: g * y, g };
    },
    { a: 24, b: 36, g: 12 },
  );
}

export const greatestCommonDivisor: GeneratorFn = (random, difficulty) => {
  const { a, b, g } =
    difficulty === 1 ? pair(random, 2, 9, 1, 6, 60) : difficulty === 2 ? pair(random, 4, 15, 2, 9, 150) : pair(random, 4, 18, 2, 7, 120);
  const fa = factorize(a);
  const fb = factorize(b);
  const common = commonFactors(fa, fb, "min");
  const smaller = factorize(g)[0][0];
  const prompt =
    difficulty === 3
      ? `Hai ${a} caramelle e ${b} cioccolatini. Vuoi preparare dei sacchetti tutti uguali, con dentro sia caramelle sia cioccolatini, senza avanzi. Qual è il numero massimo di sacchetti che puoi preparare?`
      : `Calcola il MCD (massimo comun divisore) tra ${a} e ${b}.`;
  return numberItem({
    prompt,
    value: g,
    suffix: difficulty === 3 ? "sacchetti" : undefined,
    errors: [
      { value: lcm(a, b), tag: "gcd_lcm_confusion", message: "Hai calcolato il mcm. Il MCD è il numero più grande che divide entrambi." },
      { value: a * b, tag: "gcd_product", message: "Non si moltiplicano i numeri: cerca il divisore comune più grande." },
      ...(smaller !== g
        ? [{ value: smaller, tag: "gcd_incomplete", message: `${smaller} divide tutti e due, ma c'è un divisore comune più grande.` }]
        : []),
    ],
    solution: [
      `Scompongo: $${a} = ${texFactors(fa)}$ e $${b} = ${texFactors(fb)}$`,
      `Prendo solo i fattori comuni, con l'esponente più piccolo: $${common.length > 0 ? texFactors(common) : "1"} = ${g}$`,
      ...(difficulty === 3 ? [`Si possono preparare al massimo ${g} sacchetti.`] : []),
    ],
  });
};

export const leastCommonMultiple: GeneratorFn = (random, difficulty) => {
  const { a, b } = retry(
    random,
    (r) => {
      const range = difficulty === 1 ? [2, 12] : difficulty === 2 ? [6, 30] : [4, 24];
      const x = r.int(range[0], range[1]);
      const y = r.int(range[0], range[1]);
      const value = lcm(x, y);
      if (x === y || x % y === 0 || y % x === 0 || value > (difficulty === 1 ? 60 : 240)) return null;
      return { a: x, b: y };
    },
    { a: 6, b: 8 },
  );
  const value = lcm(a, b);
  const fa = factorize(a);
  const fb = factorize(b);
  const prompt =
    difficulty === 3
      ? `Due fari si accendono insieme. Il primo lampeggia ogni ${a} secondi, il secondo ogni ${b} secondi. Dopo quanti secondi si accendono di nuovo insieme?`
      : `Calcola il mcm (minimo comune multiplo) tra ${a} e ${b}.`;
  return numberItem({
    prompt,
    value,
    suffix: difficulty === 3 ? "secondi" : undefined,
    errors: [
      { value: a * b, tag: "lcm_product", message: `${a * b} è un multiplo comune, ma non il più piccolo.` },
      { value: gcd(a, b), tag: "gcd_lcm_confusion", message: "Hai calcolato il MCD. Il mcm è il più piccolo numero multiplo di entrambi." },
    ],
    solution: [
      `Scompongo: $${a} = ${texFactors(fa)}$ e $${b} = ${texFactors(fb)}$`,
      `Prendo tutti i fattori, comuni e non comuni, con l'esponente più grande: $${texFactors(commonFactors(fa, fb, "max"))} = ${value}$`,
    ],
  });
};

export { factorize, product, texFactors };
