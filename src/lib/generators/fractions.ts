import {
  add,
  compare,
  div,
  gcd,
  lcm,
  mul,
  rational,
  sub,
  texFraction,
  texRational,
  toNumber,
  type Rational,
} from "@/lib/math/rational";
import {
  choiceItem,
  fractionItem,
  numberItem,
  retry,
  texNumber,
  type FractionError,
  type GeneratedItem,
  type GeneratorFn,
} from "./build";
import type { Random } from "./random";

function properFraction(random: Random, minDen: number, maxDen: number, minNumerator = 1): Rational {
  return retry(
    random,
    (r) => {
      const d = r.int(Math.max(minDen, minNumerator + 1), maxDen);
      const n = r.int(minNumerator, d - 1);
      return gcd(n, d) === 1 ? { n, d } : null;
    },
    { n: minNumerator, d: minNumerator + 1 },
  );
}

function simplifyStep(numerator: number, denominator: number): string[] {
  const value = rational(numerator, denominator);
  if (value.n === numerator && value.d === denominator) return [];
  return [`Semplifico: $${texFraction(numerator, denominator)} = ${texRational(value)}$`];
}

export const fractionSimplify: GeneratorFn = (random, difficulty) => {
  const base =
    difficulty === 3
      ? retry(
          random,
          (r) => {
            const d = r.int(2, 9);
            const n = r.int(d + 1, 3 * d);
            return gcd(n, d) === 1 ? { n, d } : null;
          },
          { n: 5, d: 3 },
        )
      : properFraction(random, 2, difficulty === 1 ? 9 : 12);
  const k = difficulty === 1 ? random.int(2, 5) : difficulty === 2 ? random.pick([6, 8, 9, 10, 12, 14, 15]) : random.int(6, 15);
  const numerator = k * base.n;
  const denominator = k * base.d;
  const oneSide = "Devi dividere per lo stesso numero sia il numeratore sia il denominatore.";
  return fractionItem({
    prompt: `Semplifica fino in fondo: $${texFraction(numerator, denominator)}$`,
    value: base,
    simplified: "required",
    errors: [
      { n: base.n, d: denominator, tag: "simplify_one_side", message: oneSide },
      { n: numerator, d: base.d, tag: "simplify_one_side", message: oneSide },
    ],
    solution: [
      `Cerco il MCD tra ${numerator} e ${denominator}: MCD = ${k}`,
      ...(difficulty > 1 ? ["Se non lo trovi subito, semplifica a passi: per 2, per 3, per 5…"] : []),
      `Divido sopra e sotto per ${k}: $${texFraction(numerator, denominator)} = ${texFraction(base.n, base.d)}$`,
    ],
  });
};

function compareSolution(left: Rational, right: Rational): string[] {
  const m = lcm(left.d, right.d);
  const leftN = left.n * (m / left.d);
  const rightN = right.n * (m / right.d);
  const order = compare(left, right);
  const conclusion =
    order === 0
      ? "Quindi sono uguali."
      : `Quindi è maggiore $${texFraction(order > 0 ? left.n : right.n, order > 0 ? left.d : right.d)}$.`;
  return [
    `Porto allo stesso denominatore: mcm(${left.d}, ${right.d}) = ${m}`,
    `$${texFraction(left.n, left.d)} = ${texFraction(leftN, m)}$ e $${texFraction(right.n, right.d)} = ${texFraction(rightN, m)}$`,
    `Confronto i numeratori: ${leftN} e ${rightN}. ${conclusion}`,
  ];
}

function compareItem(left: Rational, right: Rational, solution: string[], trapTag?: string): GeneratedItem {
  const order = compare(left, right);
  const correct = order === 0 ? "equal" : order > 0 ? "left" : "right";
  const wrong = order > 0 ? "right" : "left";
  const wrongFraction = wrong === "left" ? left : right;
  const otherFraction = wrong === "left" ? right : left;
  const numeratorTrap = wrongFraction.n > otherFraction.n;
  const errors =
    correct === "equal"
      ? [
          { option: "left", tag: "equivalent_fractions", message: "Semplifica le due frazioni: sono equivalenti." },
          { option: "right", tag: "equivalent_fractions", message: "Semplifica le due frazioni: sono equivalenti." },
        ]
      : [
          trapTag === "compare_denominators"
            ? {
                option: wrong,
                tag: "compare_denominators",
                message: "Con lo stesso numeratore vince il denominatore più piccolo: i pezzi sono più grandi.",
              }
            : numeratorTrap
              ? {
                  option: wrong,
                  tag: "compare_numerators_only",
                  message: "Non basta guardare i numeratori: porta le frazioni allo stesso denominatore.",
                }
              : {
                  option: wrong,
                  tag: "compare_fractions",
                  message: "Porta le frazioni allo stesso denominatore e confronta i numeratori.",
                },
          { option: "equal", tag: "compare_fractions", message: "Le due frazioni non valgono lo stesso: prova a portarle allo stesso denominatore." },
        ];
  return choiceItem({
    prompt: "Quale frazione è maggiore?",
    options: [
      { id: "left", text: `$${texFraction(left.n, left.d)}$` },
      { id: "right", text: `$${texFraction(right.n, right.d)}$` },
      { id: "equal", text: "Sono uguali" },
    ],
    correct,
    errors,
    solution,
  });
}

export const fractionCompare: GeneratorFn = (random, difficulty) => {
  if (difficulty === 1) {
    if (random.chance(0.5)) {
      const d = random.int(3, 12);
      const a = random.int(1, d - 1);
      const b = retry(random, (r) => {
        const value = r.int(1, d - 1);
        return value === a ? null : value;
      }, a === 1 ? 2 : 1);
      const left = { n: a, d };
      const right = { n: b, d };
      return compareItem(left, right, [
        "Hanno lo stesso denominatore: confronto i numeratori.",
        `È maggiore quella con il numeratore più grande: $${texFraction(Math.max(a, b), d)}$.`,
      ]);
    }
    const n = random.int(1, 5);
    const a = random.int(n + 1, 12);
    const b = retry(random, (r) => {
      const value = r.int(n + 1, 12);
      return value === a ? null : value;
    }, a === 12 ? 11 : 12);
    return compareItem(
      { n, d: a },
      { n, d: b },
      [
        "Hanno lo stesso numeratore: vince il denominatore più piccolo, perché i pezzi sono più grandi.",
        `È maggiore $${texFraction(n, Math.min(a, b))}$.`,
      ],
      "compare_denominators",
    );
  }

  if (difficulty === 3 && random.chance(0.35)) {
    const base = properFraction(random, 2, 7);
    const k1 = random.int(2, 5);
    const k2 = retry(random, (r) => {
      const value = r.int(2, 6);
      return value === k1 ? null : value;
    }, k1 + 1);
    const left = { n: base.n * k1, d: base.d * k1 };
    const right = { n: base.n * k2, d: base.d * k2 };
    return compareItem(left, right, [
      `Semplifico la prima: $${texFraction(left.n, left.d)} = ${texFraction(base.n, base.d)}$`,
      `Semplifico la seconda: $${texFraction(right.n, right.d)} = ${texFraction(base.n, base.d)}$`,
      "Sono frazioni equivalenti: valgono lo stesso.",
    ]);
  }

  const pair = retry(
    random,
    (r) => {
      const left = difficulty === 3 && r.chance(0.5) ? { n: r.int(4, 20), d: r.int(2, 9) } : properFraction(r, 2, 10);
      const right = properFraction(r, 2, 10);
      if (left.d === right.d || compare(left, right) === 0) return null;
      return { left, right };
    },
    { left: { n: 3, d: 5 }, right: { n: 2, d: 3 } },
  );
  return compareItem(pair.left, pair.right, compareSolution(pair.left, pair.right));
};

const OF_NUMBER_CONTEXTS = [
  {
    text: (total: number, fraction: string) =>
      `In una scuola ci sono ${total} studenti. I ${fraction} fanno sport. Quanti studenti non fanno sport?`,
    suffix: "studenti",
    partLabel: "fanno sport",
  },
  {
    text: (total: number, fraction: string) => `Un libro ha ${total} pagine. Sara ne ha letto i ${fraction}. Quante pagine le mancano?`,
    suffix: "pagine",
    partLabel: "sono già lette",
  },
  {
    text: (total: number, fraction: string) =>
      `Un sentiero è lungo ${total} km. Luca ne ha già percorso i ${fraction}. Quanti km gli mancano?`,
    suffix: "km",
    partLabel: "sono già percorsi",
  },
];

export const fractionOfNumber: GeneratorFn = (random, difficulty) => {
  if (difficulty === 1) {
    const q = random.int(2, 10);
    const m = random.int(2, 12);
    const total = q * m;
    return numberItem({
      prompt: `Calcola $${texFraction(1, q)}$ di ${total}.`,
      value: m,
      errors: [
        {
          value: total * q,
          tag: "fraction_of_number_multiply",
          message: `Per trovare $${texFraction(1, q)}$ di un numero si divide per ${q}, non si moltiplica.`,
        },
      ],
      solution: [
        `$${texFraction(1, q)}$ di ${total} vuol dire dividere ${total} in ${q} parti uguali.`,
        `$${total} : ${q} = ${m}$`,
      ],
    });
  }

  const fraction = properFraction(random, 3, difficulty === 2 ? 10 : 8, 2);
  const m = random.int(difficulty === 2 ? 2 : 3, difficulty === 2 ? 12 : 15);
  const total = fraction.d * m;
  const part = fraction.n * m;
  const tex = `$${texFraction(fraction.n, fraction.d)}$`;
  const steps = [
    `Divido per il denominatore: $${total} : ${fraction.d} = ${m}$`,
    `Moltiplico per il numeratore: $${m} \\times ${fraction.n} = ${part}$`,
  ];

  if (difficulty === 2) {
    return numberItem({
      prompt: `Calcola i ${tex} di ${total}.`,
      value: part,
      errors: [
        {
          value: (total / fraction.n) * fraction.d,
          tag: "fraction_inverted",
          message: "Hai usato la frazione al contrario: si divide per il denominatore e si moltiplica per il numeratore.",
        },
        {
          value: m,
          tag: "fraction_of_number_incomplete",
          message: `${m} è solo $${texFraction(1, fraction.d)}$ di ${total}: manca la moltiplicazione per ${fraction.n}.`,
        },
      ],
      solution: steps,
    });
  }

  const context = random.pick(OF_NUMBER_CONTEXTS);
  return numberItem({
    prompt: context.text(total, tex),
    value: total - part,
    suffix: context.suffix,
    errors: [
      {
        value: part,
        tag: "complement_missing",
        message: `${part} ${context.partLabel}: la domanda chiede quelli che restano, ${total} − ${part}.`,
      },
      {
        value: m,
        tag: "fraction_of_number_incomplete",
        message: `${m} è solo $${texFraction(1, fraction.d)}$ del totale.`,
      },
    ],
    solution: [...steps, `Tolgo dal totale: $${total} - ${part} = ${total - part}$`],
  });
};

export const fractionAddSub: GeneratorFn = (random, difficulty) => {
  const plus = random.chance(0.5);
  const sign = plus ? "+" : "-";
  const verb = plus ? "sommo" : "sottraggo";

  if (difficulty === 1) {
    const { d, a, b } = retry(
      random,
      (r) => {
        const den = r.int(3, 12);
        const first = plus ? r.int(1, den - 1) : r.int(2, den - 1);
        const second = plus ? r.int(1, den - 1) : r.int(1, first - 1);
        const result = plus ? first + second : first - second;
        return result % den === 0 ? null : { d: den, a: first, b: second };
      },
      { d: 5, a: 1, b: plus ? 2 : 0 },
    );
    const resultN = plus ? a + b : a - b;
    const errors: FractionError[] = plus
      ? [
          {
            n: a + b,
            d: 2 * d,
            tag: "fraction_add_denominators",
            message: `Con lo stesso denominatore si sommano solo i numeratori: il denominatore resta ${d}.`,
          },
        ]
      : [];
    return fractionItem({
      prompt: `Calcola: $${texFraction(a, d)} ${sign} ${texFraction(b, d)}$`,
      value: rational(resultN, d),
      errors,
      solution: [
        `Stesso denominatore: ${verb} solo i numeratori, $${a} ${sign} ${b} = ${resultN}$`,
        `$${texFraction(resultN, d)}$`,
        ...simplifyStep(resultN, d),
      ],
    });
  }

  const pair = retry(
    random,
    (r) => {
      let left: Rational;
      let right: Rational;
      if (difficulty === 2) {
        const b = r.int(2, 6);
        const d = b * r.int(2, 4);
        left = { n: r.int(1, b - 1), d: b };
        right = { n: r.int(1, d - 1), d };
        if (r.chance(0.5)) [left, right] = [right, left];
      } else {
        const b = r.int(2, 10);
        const d = r.int(2, 10);
        if (b === d || b % d === 0 || d % b === 0) return null;
        left = { n: r.int(1, b - 1), d: b };
        right = { n: r.int(1, d - 1), d };
      }
      if (gcd(left.n, left.d) !== 1 || gcd(right.n, right.d) !== 1) return null;
      if (!plus && compare(left, right) <= 0) [left, right] = [right, left];
      if (!plus && compare(left, right) === 0) return null;
      const result = plus ? add(left, right) : sub(left, right);
      if (result.d === 1) return null;
      return { left, right };
    },
    { left: { n: 1, d: 2 }, right: { n: 1, d: 3 } },
  );

  const { left, right } = pair;
  const m = lcm(left.d, right.d);
  const leftN = left.n * (m / left.d);
  const rightN = right.n * (m / right.d);
  const resultN = plus ? leftN + rightN : leftN - rightN;
  const value = plus ? add(left, right) : sub(left, right);
  const errors: FractionError[] = [
    {
      n: plus ? left.n + right.n : left.n - right.n,
      d: plus ? left.d + right.d : left.d - right.d,
      tag: plus ? "fraction_add_num_den" : "fraction_sub_num_den",
      message: `Non si ${plus ? "sommano" : "sottraggono"} numeratori e denominatori: prima porta tutto allo stesso denominatore (${m}).`,
    },
    {
      n: plus ? left.n + right.n : left.n - right.n,
      d: m,
      tag: "fraction_common_denominator",
      message: "Quando cambi il denominatore devi cambiare anche il numeratore, moltiplicandolo per lo stesso numero.",
    },
  ];
  return fractionItem({
    prompt: `Calcola: $${texFraction(left.n, left.d)} ${sign} ${texFraction(right.n, right.d)}$`,
    value,
    errors,
    solution: [
      `Denominatore comune: mcm(${left.d}, ${right.d}) = ${m}`,
      `$${texFraction(left.n, left.d)} = ${texFraction(leftN, m)}$ e $${texFraction(right.n, right.d)} = ${texFraction(rightN, m)}$`,
      `$${texFraction(leftN, m)} ${sign} ${texFraction(rightN, m)} = ${texFraction(resultN, m)}$`,
      ...simplifyStep(resultN, m),
    ],
  });
};

export const fractionMulDiv: GeneratorFn = (random, difficulty) => {
  if (difficulty === 3) {
    const { a, b, c, d } = retry(
      random,
      (r) => {
        const values = { a: r.int(1, 9), b: r.int(2, 9), c: r.int(1, 9), d: r.int(2, 9) };
        if (values.a === values.b || values.c === values.d) return null;
        if (div({ n: values.a, d: values.b }, { n: values.c, d: values.d }).d === 1) return null;
        return values;
      },
      { a: 3, b: 4, c: 2, d: 5 },
    );
    const numerator = a * d;
    const denominator = b * c;
    return fractionItem({
      prompt: `Calcola: $${texFraction(a, b)} : ${texFraction(c, d)}$`,
      value: div({ n: a, d: b }, { n: c, d }),
      errors: [
        {
          n: a * c,
          d: b * d,
          tag: "fraction_div_no_reciprocal",
          message: `Nella divisione si moltiplica per l'inversa della seconda frazione: $${texFraction(a, b)} \\times ${texFraction(d, c)}$.`,
        },
        {
          n: b * c,
          d: a * d,
          tag: "fraction_div_wrong_reciprocal",
          message: "Si capovolge solo la seconda frazione, non la prima.",
        },
      ],
      solution: [
        `Dividere è come moltiplicare per l'inversa: $${texFraction(a, b)} \\times ${texFraction(d, c)}$`,
        `$= ${texFraction(numerator, denominator)}$`,
        ...simplifyStep(numerator, denominator),
      ],
    });
  }

  let a: number;
  let b: number;
  let c: number;
  let d: number;
  const intro: string[] = [];
  if (difficulty === 1) {
    ({ a, b, c, d } = retry(
      random,
      (r) => {
        const values = { a: r.int(1, 5), b: r.int(2, 7), c: r.int(1, 5), d: r.int(2, 7) };
        if (values.a === values.b || values.c === values.d) return null;
        if (mul({ n: values.a, d: values.b }, { n: values.c, d: values.d }).d === 1) return null;
        return values;
      },
      { a: 2, b: 3, c: 1, d: 5 },
    ));
  } else {
    const { g1, g2, x, y, z, w } = retry(
      random,
      (r) => {
        const values = { g1: r.int(2, 5), g2: r.int(2, 5), x: r.int(1, 5), y: r.int(1, 5), z: r.int(1, 5), w: r.int(1, 5) };
        if (values.g1 * values.x === values.g2 * values.y || values.g2 * values.z === values.g1 * values.w) return null;
        if (mul({ n: values.x, d: values.y }, { n: values.z, d: values.w }).d === 1) return null;
        return values;
      },
      { g1: 3, g2: 4, x: 3, y: 4, z: 3, w: 2 },
    );
    a = g1 * x;
    d = g1 * w;
    c = g2 * z;
    b = g2 * y;
    intro.push(
      `Semplifico in croce: ${a} e ${d} si dividono per ${g1}, ${c} e ${b} si dividono per ${g2}`,
      `Restano $${texFraction(x, y)} \\times ${texFraction(z, w)}$`,
    );
  }
  const numerator = a * c;
  const denominator = b * d;
  return fractionItem({
    prompt: `Calcola: $${texFraction(a, b)} \\times ${texFraction(c, d)}$`,
    value: mul({ n: a, d: b }, { n: c, d }),
    errors: [
      {
        n: a * d,
        d: b * c,
        tag: "fraction_mul_cross",
        message: "Nella moltiplicazione si moltiplicano i numeratori tra loro e i denominatori tra loro.",
      },
      {
        n: a + c,
        d: b + d,
        tag: "fraction_mul_as_add",
        message: "Moltiplicare non è sommare: numeratore per numeratore, denominatore per denominatore.",
      },
    ],
    solution: [
      ...intro,
      `Numeratore per numeratore e denominatore per denominatore: $${texFraction(numerator, denominator)}$`,
      ...simplifyStep(numerator, denominator),
    ],
  });
};

const DECIMAL_FRACTIONS: Rational[] = [
  { n: 1, d: 2 },
  { n: 1, d: 4 },
  { n: 3, d: 4 },
  { n: 1, d: 5 },
  { n: 2, d: 5 },
  { n: 3, d: 5 },
  { n: 4, d: 5 },
  { n: 1, d: 10 },
  { n: 3, d: 10 },
  { n: 7, d: 10 },
  { n: 9, d: 10 },
  { n: 3, d: 20 },
  { n: 7, d: 20 },
];

function decimalPlaces(value: number): number {
  const text = String(value);
  return text.includes(".") ? text.split(".")[1].length : 0;
}

function decimalToFraction(fraction: Rational): GeneratedItem {
  const value = toNumber(fraction);
  const places = decimalPlaces(value);
  const power = 10 ** places;
  const digits = Math.round(value * power);
  const wrongPower = places >= 2 ? power / 10 : power * 10;
  return fractionItem({
    prompt: `Scrivi $${texNumber(value)}$ come frazione.`,
    value: fraction,
    errors: [
      {
        n: digits,
        d: wrongPower,
        tag: "place_value",
        message: `Conta le cifre dopo la virgola: ${places === 1 ? "una cifra → si divide per 10" : `${places} cifre → si divide per ${power}`}.`,
      },
    ],
    solution: [
      `${places === 1 ? "Una cifra" : `${places} cifre`} dopo la virgola: $${texNumber(value)} = ${texFraction(digits, power)}$`,
      ...simplifyStep(digits, power),
    ],
  });
}

function fractionToDecimal(fraction: Rational): GeneratedItem {
  const value = toNumber(fraction);
  return numberItem({
    prompt: `Scrivi $${texFraction(fraction.n, fraction.d)}$ come numero decimale.`,
    value,
    errors: [
      {
        value: Number(`${fraction.n}.${fraction.d}`),
        tag: "fraction_as_division",
        message: `Una frazione è una divisione: $${fraction.n} : ${fraction.d}$.`,
      },
      {
        value: fraction.d / fraction.n,
        tag: "division_inverted",
        message: "Si divide il numeratore per il denominatore, non il contrario.",
      },
    ],
    solution: [`Una frazione è una divisione: $${fraction.n} : ${fraction.d}$`, `$${fraction.n} : ${fraction.d} = ${texNumber(value)}$`],
  });
}

export const fractionDecimals: GeneratorFn = (random, difficulty) => {
  if (difficulty === 1) return decimalToFraction(random.pick(DECIMAL_FRACTIONS));
  if (difficulty === 2) {
    const fraction = retry(
      random,
      (r) => {
        const d = r.pick([2, 4, 5, 8, 20, 25]);
        const n = r.int(1, d - 1);
        return gcd(n, d) === 1 ? { n, d } : null;
      },
      { n: 3, d: 8 },
    );
    return fractionToDecimal(fraction);
  }
  const fraction = retry(
    random,
    (r) => {
      const d = r.pick([2, 4, 5, 8]);
      const n = r.int(d + 1, 3 * d);
      return gcd(n, d) === 1 ? { n, d } : null;
    },
    { n: 5, d: 4 },
  );
  return random.chance(0.5) ? decimalToFraction(fraction) : fractionToDecimal(fraction);
};

function smallFraction(random: Random): Rational {
  return properFraction(random, 2, 6);
}

function reasonable(value: Rational): boolean {
  return value.n > 0 && value.d > 1 && value.d <= 72 && value.n <= 150;
}

export const fractionExpressions: GeneratorFn = (random, difficulty) => {
  const tex = texRational;
  if (difficulty === 1) {
    return retry(
      random,
      (r) => {
        const x = smallFraction(r);
        const y = smallFraction(r);
        const z = smallFraction(r);
        const product = mul(y, z);
        const value = add(x, product);
        if (!reasonable(value)) return null;
        return fractionItem({
          prompt: `Calcola: $${tex(x)} + ${tex(y)} \\times ${tex(z)}$`,
          value,
          errors: [
            {
              ...asError(mul(add(x, y), z)),
              tag: "order_of_operations",
              message: "Prima la moltiplicazione, poi l'addizione.",
            },
          ],
          solution: [
            `Prima la moltiplicazione: $${tex(y)} \\times ${tex(z)} = ${tex(product)}$`,
            `Poi l'addizione: $${tex(x)} + ${tex(product)} = ${tex(value)}$`,
          ],
        });
      },
      fallbackExpression(),
    );
  }

  if (difficulty === 2) {
    return retry(
      random,
      (r) => {
        const plus = r.chance(0.5);
        const x = smallFraction(r);
        const y = smallFraction(r);
        const z = smallFraction(r);
        if (!plus && compare(x, y) <= 0) return null;
        const inner = plus ? add(x, y) : sub(x, y);
        const value = mul(inner, z);
        if (!reasonable(value)) return null;
        const sign = plus ? "+" : "-";
        const ignored = plus ? add(x, mul(y, z)) : sub(x, mul(y, z));
        return fractionItem({
          prompt: `Calcola: $\\left(${tex(x)} ${sign} ${tex(y)}\\right) \\times ${tex(z)}$`,
          value,
          errors: [{ ...asError(ignored), tag: "ignores_parentheses", message: "Prima si calcola la parentesi, poi la moltiplicazione." }],
          solution: [
            `Prima la parentesi: $${tex(x)} ${sign} ${tex(y)} = ${tex(inner)}$`,
            `Poi la moltiplicazione: $${tex(inner)} \\times ${tex(z)} = ${tex(value)}$`,
          ],
        });
      },
      fallbackExpression(),
    );
  }

  return retry(
    random,
    (r) => {
      const x = smallFraction(r);
      const y = smallFraction(r);
      const z = smallFraction(r);
      const w = smallFraction(r);
      if (compare(x, y) <= 0) return null;
      const inner = sub(x, y);
      const quotient = div(inner, z);
      const value = add(quotient, w);
      if (!reasonable(value) || !reasonable(quotient)) return null;
      return fractionItem({
        prompt: `Calcola: $\\left(${tex(x)} - ${tex(y)}\\right) : ${tex(z)} + ${tex(w)}$`,
        value,
        errors: [
          {
            ...asError(add(mul(inner, z), w)),
            tag: "fraction_div_no_reciprocal",
            message: "Dividere per una frazione vuol dire moltiplicare per la sua inversa.",
          },
          {
            ...asError(div(inner, add(z, w))),
            tag: "order_of_operations",
            message: "La divisione va fatta prima dell'addizione.",
          },
        ],
        solution: [
          `Prima la parentesi: $${tex(x)} - ${tex(y)} = ${tex(inner)}$`,
          `Poi la divisione, moltiplicando per l'inversa: $${tex(inner)} \\times ${texFraction(z.d, z.n)} = ${tex(quotient)}$`,
          `Infine l'addizione: $${tex(quotient)} + ${tex(w)} = ${tex(value)}$`,
        ],
      });
    },
    fallbackExpression(),
  );
};

function asError(value: Rational) {
  return { n: value.n, d: value.d };
}

function fallbackExpression(): GeneratedItem {
  return fractionItem({
    prompt: "Calcola: $\\frac{1}{2} + \\frac{1}{3} \\times \\frac{3}{4}$",
    value: { n: 3, d: 4 },
    errors: [{ n: 5, d: 8, tag: "order_of_operations", message: "Prima la moltiplicazione, poi l'addizione." }],
    solution: [
      "Prima la moltiplicazione: $\\frac{1}{3} \\times \\frac{3}{4} = \\frac{1}{4}$",
      "Poi l'addizione: $\\frac{1}{2} + \\frac{1}{4} = \\frac{3}{4}$",
    ],
  });
}

const REMAINING_CONTEXTS = [
  {
    text: (fraction: string, rest: number) =>
      `Hai speso i ${fraction} dei tuoi risparmi e ti restano ${rest} €. Quanto avevi all'inizio?`,
    suffix: "€",
  },
  {
    text: (fraction: string, rest: number) => `Hai letto i ${fraction} di un libro e ti mancano ${rest} pagine. Quante pagine ha il libro?`,
    suffix: "pagine",
  },
  {
    text: (fraction: string, rest: number) => `Hai percorso i ${fraction} di un sentiero e ti mancano ${rest} km. Quanto è lungo il sentiero?`,
    suffix: "km",
  },
];

export const fractionInverse: GeneratorFn = (random, difficulty) => {
  if (difficulty === 1) {
    const fraction = properFraction(random, 3, 9);
    const fixedFraction = fraction.n === 1 ? { n: 2, d: fraction.d % 2 === 0 ? fraction.d + 1 : fraction.d } : fraction;
    const { n: p, d: q } = fixedFraction;
    const m = random.int(2, 12);
    const part = p * m;
    const tex = `$${texFraction(p, q)}$`;
    return numberItem({
      prompt: `I ${tex} di un numero sono ${part}. Qual è il numero?`,
      value: q * m,
      errors: [
        {
          value: (part * p) / q,
          tag: "fraction_inverse_multiply",
          message: `${part} è già una parte: non devi calcolarne i ${tex}. Dividi per ${p} e moltiplica per ${q}.`,
        },
        {
          value: m,
          tag: "fraction_inverse_incomplete",
          message: `${m} è solo $${texFraction(1, q)}$ del numero: manca la moltiplicazione per ${q}.`,
        },
      ],
      solution: [
        `${part} corrisponde a ${p} parti su ${q}.`,
        `Una parte vale $${part} : ${p} = ${m}$`,
        `Il numero intero vale $${m} \\times ${q} = ${q * m}$`,
      ],
    });
  }

  if (difficulty === 2) {
    const fraction = properFraction(random, 3, 9);
    const { n: p, d: q } = fraction;
    const r = q - p;
    const m = random.int(2, 12);
    const rest = r * m;
    const total = q * m;
    const context = random.pick(REMAINING_CONTEXTS);
    const tex = `$${texFraction(p, q)}$`;
    return numberItem({
      prompt: context.text(tex, rest),
      value: total,
      suffix: context.suffix,
      errors: [
        {
          value: (rest / p) * q,
          tag: "fraction_part_confusion",
          message: `${rest} è la parte che resta, cioè i $${texFraction(r, q)}$, non i ${tex}.`,
        },
        {
          value: rest + (rest * p) / q,
          tag: "fraction_of_remaining",
          message: "La frazione si riferisce al totale, non a quello che resta.",
        },
      ],
      solution: [
        `Resta $1 - ${texFraction(p, q)} = ${texFraction(r, q)}$ del totale.`,
        `$${texFraction(r, q)}$ valgono ${rest}: una parte vale $${rest} : ${r} = ${m}$`,
        `Il totale è $${m} \\times ${q} = ${total}$`,
      ],
    });
  }

  return retry(
    random,
    (rnd) => {
      const x = properFraction(rnd, 2, 6);
      const y = properFraction(rnd, 2, 8);
      const read = add(x, y);
      if (compare(read, rational(1)) >= 0) return null;
      const remaining = sub(rational(1), read);
      const base = lcm(x.d, y.d);
      const total = base * rnd.int(1, 6);
      const rest = (total * remaining.n) / remaining.d;
      if (!Number.isInteger(rest) || rest > 500 || rest < 10) return null;
      const onePart = total / remaining.d;
      return numberItem({
        prompt: `Il primo giorno Marco legge i $${texFraction(x.n, x.d)}$ di un libro, il secondo giorno i $${texFraction(y.n, y.d)}$. Gli restano ${rest} pagine. Quante pagine ha il libro?`,
        value: total,
        suffix: "pagine",
        errors: [
          {
            value: rest / toNumber(read),
            tag: "fraction_part_confusion",
            message: `${rest} pagine sono la parte che resta, non quella letta.`,
          },
          {
            value: rest + rest * toNumber(read),
            tag: "fraction_of_remaining",
            message: "Le frazioni si riferiscono a tutto il libro, non alle pagine che restano.",
          },
        ],
        solution: [
          `Letto in tutto: $${texFraction(x.n, x.d)} + ${texFraction(y.n, y.d)} = ${texRational(read)}$`,
          `Resta $1 - ${texRational(read)} = ${texRational(remaining)}$ del libro`,
          `$${texRational(remaining)}$ valgono ${rest} pagine: una parte vale $${rest} : ${remaining.n} = ${onePart}$`,
          `Il libro ha $${onePart} \\times ${remaining.d} = ${total}$ pagine`,
        ],
      });
    },
    numberItem({
      prompt:
        "Il primo giorno Marco legge i $\\frac{1}{3}$ di un libro, il secondo giorno i $\\frac{1}{4}$. Gli restano 50 pagine. Quante pagine ha il libro?",
      value: 120,
      suffix: "pagine",
      errors: [{ value: 85.714286, tag: "fraction_part_confusion", message: "50 pagine sono la parte che resta, non quella letta." }],
      solution: [
        "Letto in tutto: $\\frac{1}{3} + \\frac{1}{4} = \\frac{7}{12}$",
        "Resta $\\frac{5}{12}$ del libro",
        "$\\frac{5}{12}$ valgono 50 pagine: una parte vale $50 : 5 = 10$",
        "Il libro ha $10 \\times 12 = 120$ pagine",
      ],
    }),
  );
};
