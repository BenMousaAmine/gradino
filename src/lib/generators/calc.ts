import { numberItem, plainNumber, retry, texNumber, type GeneratorFn } from "./build";

const ORDER_MESSAGE = "Hai fatto le operazioni da sinistra a destra: moltiplicazioni e divisioni vanno fatte prima di addizioni e sottrazioni.";

export const timesTable: GeneratorFn = (random, difficulty) => {
  if (difficulty === 1) {
    const a = random.int(2, 9);
    const b = random.int(2, 9);
    const product = a * b;
    const neighbor = `Sei finito sulla riga vicina della tabellina del ${a}.`;
    return numberItem({
      prompt: `Calcola: $${a} \\times ${b}$`,
      value: product,
      errors: [
        { value: a * (b - 1), tag: "times_table_neighbor", message: neighbor },
        { value: a * (b + 1), tag: "times_table_neighbor", message: neighbor },
        {
          value: a + b,
          tag: "times_as_sum",
          message: `La moltiplicazione non è un'addizione: $${a} \\times ${b}$ vuol dire ${a} preso ${b} volte.`,
        },
      ],
      solution: [`$${a} \\times ${b}$ vuol dire ${a} preso ${b} volte.`, `$${a} \\times ${b} = ${product}$`],
    });
  }

  if (difficulty === 2) {
    const a = random.int(2, 10);
    const b = random.int(2, 10);
    const product = a * b;
    return numberItem({
      prompt: `Completa: $${a} \\times \\square = ${product}$`,
      value: b,
      label: "$\\square =$",
      errors: [
        {
          value: product - a,
          tag: "missing_factor_subtract",
          message: `Cerca il numero che moltiplicato per ${a} dà ${product}: ripassa la tabellina del ${a}.`,
        },
      ],
      solution: [
        `Ripeti la tabellina del ${a} fino ad arrivare a ${product}.`,
        `$${a} \\times ${b} = ${product}$, quindi il numero mancante è ${b}.`,
      ],
    });
  }

  const a = random.int(3, 12);
  const b = random.int(3, 12);
  const product = a * b;
  return numberItem({
    prompt: `Calcola: $${product} : ${a}$`,
    value: b,
    errors: [
      {
        value: product - a,
        tag: "division_as_subtraction",
        message: `La divisione non è una sottrazione: quale numero moltiplicato per ${a} dà ${product}?`,
      },
    ],
    solution: [
      `La divisione è il contrario della moltiplicazione: quale numero per ${a} fa ${product}?`,
      `$${a} \\times ${b} = ${product}$, quindi $${product} : ${a} = ${b}$`,
    ],
  });
};

export const orderOfOperations: GeneratorFn = (random, difficulty) => {
  if (difficulty === 1) {
    const a = random.int(2, 20);
    const b = random.int(2, 9);
    const c = random.int(2, 9);
    const bc = b * c;
    const variant = random.int(0, 2);
    if (variant === 0) {
      return numberItem({
        prompt: `Calcola: $${a} + ${b} \\times ${c}$`,
        value: a + bc,
        errors: [{ value: (a + b) * c, tag: "order_of_operations", message: ORDER_MESSAGE }],
        solution: [
          `Prima la moltiplicazione: $${b} \\times ${c} = ${bc}$`,
          `Poi l'addizione: $${a} + ${bc} = ${a + bc}$`,
        ],
      });
    }
    if (variant === 1) {
      return numberItem({
        prompt: `Calcola: $${b} \\times ${c} + ${a}$`,
        value: bc + a,
        errors: [
          {
            value: b * (c + a),
            tag: "order_of_operations",
            message: `Prima si fa la moltiplicazione $${b} \\times ${c}$, poi si aggiunge ${a}.`,
          },
        ],
        solution: [
          `Prima la moltiplicazione: $${b} \\times ${c} = ${bc}$`,
          `Poi l'addizione: $${bc} + ${a} = ${bc + a}$`,
        ],
      });
    }
    const start = bc + random.int(1, 20);
    return numberItem({
      prompt: `Calcola: $${start} - ${b} \\times ${c}$`,
      value: start - bc,
      errors: [{ value: (start - b) * c, tag: "order_of_operations", message: ORDER_MESSAGE }],
      solution: [
        `Prima la moltiplicazione: $${b} \\times ${c} = ${bc}$`,
        `Poi la sottrazione: $${start} - ${bc} = ${start - bc}$`,
      ],
    });
  }

  if (difficulty === 2) {
    if (random.chance(0.5)) {
      const a = random.int(2, 6);
      const b = random.int(1, 9);
      const c = random.int(1, 9);
      const sum = b + c;
      const product = a * sum;
      const d = random.int(1, product - 1);
      return numberItem({
        prompt: `Calcola: $${a} \\times (${b} + ${c}) - ${d}$`,
        value: product - d,
        errors: [
          {
            value: a * b + c - d,
            tag: "ignores_parentheses",
            message: `Le parentesi si calcolano per prime: prima $${b} + ${c} = ${sum}$.`,
          },
        ],
        solution: [
          `Prima la parentesi: $${b} + ${c} = ${sum}$`,
          `Poi la moltiplicazione: $${a} \\times ${sum} = ${product}$`,
          `Infine la sottrazione: $${product} - ${d} = ${product - d}$`,
        ],
      });
    }
    return retry(
      random,
      (r) => {
        const a = r.int(1, 9);
        const b = r.int(1, 9);
        const c = r.int(2, 5);
        const d = r.int(2, 9);
        const e = r.int(2, 5);
        const left = (a + b) * c;
        const right = d * e;
        if (left - right <= 0) return null;
        return numberItem({
          prompt: `Calcola: $(${a} + ${b}) \\times ${c} - ${d} \\times ${e}$`,
          value: left - right,
          errors: [
            {
              value: (left - d) * e,
              tag: "order_of_operations",
              message: "Anche dopo la parentesi, le moltiplicazioni vengono prima della sottrazione.",
            },
          ],
          solution: [
            `Prima la parentesi: $${a} + ${b} = ${a + b}$`,
            `Poi le moltiplicazioni: $${a + b} \\times ${c} = ${left}$ e $${d} \\times ${e} = ${right}$`,
            `Infine la sottrazione: $${left} - ${right} = ${left - right}$`,
          ],
        });
      },
      numberItem({
        prompt: "Calcola: $(4 + 5) \\times 3 - 2 \\times 4$",
        value: 19,
        errors: [{ value: 100, tag: "order_of_operations", message: ORDER_MESSAGE }],
        solution: ["Prima la parentesi: $4 + 5 = 9$", "Poi le moltiplicazioni: $27$ e $8$", "Infine: $27 - 8 = 19$"],
      }),
    );
  }

  if (random.chance(0.5)) {
    const c = random.int(2, 5);
    const q = random.int(2, 6);
    const b = random.int(1, 9);
    const a = b + c * q;
    const d = random.int(1, 5);
    const e = random.int(2, 4);
    const inner = q + d;
    const product = inner * e;
    const f = random.int(1, product - 1);
    return numberItem({
      prompt: `Calcola: $[(${a} - ${b}) : ${c} + ${d}] \\times ${e} - ${f}$`,
      value: product - f,
      errors: [
        {
          value: q + d * e - f,
          tag: "brackets_scope",
          message: `La moltiplicazione per ${e} vale per tutta la parentesi quadra: prima calcola tutto ciò che c'è dentro.`,
        },
      ],
      solution: [
        `Parentesi tonda: $${a} - ${b} = ${c * q}$`,
        `Dentro la quadra: $${c * q} : ${c} + ${d} = ${q} + ${d} = ${inner}$`,
        `Moltiplicazione: $${inner} \\times ${e} = ${product}$`,
        `Sottrazione: $${product} - ${f} = ${product - f}$`,
      ],
    });
  }

  const a = random.int(5, 9);
  const b = random.int(1, 4);
  const c = random.int(1, 4);
  const d = random.int(2, 3);
  const square = a * a;
  const product = (b + c) * d;
  return numberItem({
    prompt: `Calcola: $${a}^2 - (${b} + ${c}) \\times ${d}$`,
    value: square - product,
    errors: [
      {
        value: 2 * a - product,
        tag: "power_as_product",
        message: `$${a}^2$ vuol dire $${a} \\times ${a}$, non $${a} \\times 2$.`,
      },
      { value: (square - (b + c)) * d, tag: "order_of_operations", message: ORDER_MESSAGE },
    ],
    solution: [
      `Potenza: $${a}^2 = ${square}$`,
      `Parentesi: $${b} + ${c} = ${b + c}$`,
      `Moltiplicazione: $${b + c} \\times ${d} = ${product}$`,
      `Sottrazione: $${square} - ${product} = ${square - product}$`,
    ],
  });
};

type Decimal = { int: number; scale: number };

const decimalValue = (decimal: Decimal) => decimal.int / 10 ** decimal.scale;

function nonRoundInt(value: number): number {
  return value % 10 === 0 ? value + 1 : value;
}

function fixed(intValue: number, scale: number): string {
  return (intValue / 10 ** scale).toFixed(scale).replace(".", "{,}");
}

const DIVISORS: Decimal[] = [
  { int: 2, scale: 1 },
  { int: 4, scale: 1 },
  { int: 5, scale: 1 },
  { int: 25, scale: 2 },
  { int: 75, scale: 2 },
  { int: 15, scale: 1 },
  { int: 25, scale: 1 },
  { int: 5, scale: 2 },
  { int: 12, scale: 2 },
];

export const decimals: GeneratorFn = (random, difficulty) => {
  if (difficulty === 1) {
    const sx = random.pick([1, 2]);
    const sy = sx === 1 ? 2 : 1;
    let x: Decimal = { int: nonRoundInt(random.int(11, 999)), scale: sx };
    let y: Decimal = { int: nonRoundInt(random.int(11, 999)), scale: sy };
    const subtract = random.chance(0.5);
    if (subtract && decimalValue(x) < decimalValue(y)) [x, y] = [y, x];
    const big = { x: x.int * 10 ** (2 - x.scale), y: y.int * 10 ** (2 - y.scale) };
    const resultInt = subtract ? big.x - big.y : big.x + big.y;
    const misaligned = subtract ? x.int - y.int : x.int + y.int;
    const op = subtract ? "-" : "+";
    return numberItem({
      prompt: `Calcola: $${texNumber(decimalValue(x))} ${op} ${texNumber(decimalValue(y))}$`,
      value: resultInt / 100,
      errors: [
        {
          value: misaligned / 100,
          tag: "decimal_alignment",
          message: "Incolonna le virgole una sotto l'altra: aggiungi uno zero se serve (es. 12,5 = 12,50).",
        },
      ],
      solution: [
        `Scrivo i numeri con le stesse cifre dopo la virgola: $${fixed(big.x, 2)} ${op} ${fixed(big.y, 2)}$`,
        `Incolonno le virgole e calcolo: $${texNumber(resultInt / 100)}$`,
      ],
    });
  }

  if (difficulty === 2) {
    const sx = random.pick([1, 1, 2]);
    const x: Decimal = { int: nonRoundInt(random.int(2, 99)), scale: sx };
    const y: Decimal = random.chance(0.5)
      ? { int: random.int(2, 9), scale: 1 }
      : { int: nonRoundInt(random.int(11, 49)), scale: 1 };
    const productInt = x.int * y.int;
    const places = x.scale + y.scale;
    const value = productInt / 10 ** places;
    return numberItem({
      prompt: `Calcola: $${texNumber(decimalValue(x))} \\times ${texNumber(decimalValue(y))}$`,
      value,
      errors: [
        {
          value: productInt / 10 ** Math.max(x.scale, y.scale),
          tag: "decimal_point_product",
          message: `Nel prodotto le cifre dopo la virgola si sommano: ${x.scale} + ${y.scale} = ${places}.`,
        },
      ],
      solution: [
        `Moltiplico senza virgole: $${x.int} \\times ${y.int} = ${productInt}$`,
        `Cifre dopo la virgola in tutto: $${x.scale} + ${y.scale} = ${places}$`,
        `Risultato: $${texNumber(value)}$`,
      ],
    });
  }

  const divisor = random.pick(DIVISORS);
  const quotient = random.int(2, 30);
  const dividendInt = quotient * divisor.int;
  const dividend = dividendInt / 10 ** divisor.scale;
  const factor = 10 ** divisor.scale;
  return numberItem({
    prompt: `Calcola: $${texNumber(dividend)} : ${texNumber(decimalValue(divisor))}$`,
    value: quotient,
    errors: [
      {
        value: quotient / 10,
        tag: "decimal_division",
        message: "Moltiplica dividendo e divisore per lo stesso numero (10, 100…) per togliere la virgola dal divisore.",
      },
      {
        value: quotient * 10,
        tag: "decimal_division",
        message: "Moltiplica dividendo e divisore per lo stesso numero (10, 100…) per togliere la virgola dal divisore.",
      },
    ],
    solution: [
      `Moltiplico entrambi per ${factor}: $${texNumber(dividend)} : ${texNumber(decimalValue(divisor))} = ${dividendInt} : ${divisor.int}$`,
      `$${dividendInt} : ${divisor.int} = ${quotient}$`,
      `Controllo: $${plainNumber(quotient)} \\times ${texNumber(decimalValue(divisor))} = ${texNumber(dividend)}$`,
    ],
  });
};
