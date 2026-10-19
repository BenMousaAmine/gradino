import { texFraction } from "@/lib/math/rational";
import { choiceItem, distinctOptions, fractionItem, numberItem, retry, texNumber, type GeneratorFn } from "./build";

export const powerBasics: GeneratorFn = (random, difficulty) => {
  if (difficulty === 1) {
    if (random.chance(0.3)) {
      const base = random.int(2, 12);
      if (random.chance(0.5)) {
        return numberItem({
          prompt: `Calcola: $${base}^0$`,
          value: 1,
          errors: [
            { value: 0, tag: "power_zero", message: "Ogni numero diverso da 0 elevato alla 0 fa 1." },
            { value: base, tag: "power_zero", message: "Ogni numero diverso da 0 elevato alla 0 fa 1." },
          ],
          solution: [`Regola: qualsiasi numero (diverso da 0) elevato alla 0 vale 1.`, `$${base}^0 = 1$`],
        });
      }
      return numberItem({
        prompt: `Calcola: $${base}^1$`,
        value: base,
        errors: [{ value: 1, tag: "power_one", message: "Un numero elevato alla 1 resta uguale a se stesso." }],
        solution: [`Regola: un numero elevato alla 1 resta se stesso.`, `$${base}^1 = ${base}$`],
      });
    }
    const base = random.int(2, 10);
    const exponent = random.int(2, 3);
    const value = base ** exponent;
    return numberItem({
      prompt: `Calcola: $${base}^${exponent}$`,
      value,
      errors: [
        { value: base * exponent, tag: "power_as_product", message: `La potenza non è base × esponente: $${base}^${exponent}$ vuol dire ${base} moltiplicato per se stesso ${exponent} volte.` },
      ],
      solution: [
        `$${base}^${exponent} = ${Array.from({ length: exponent }, () => base).join(" \\times ")}$`,
        `$= ${value}$`,
      ],
    });
  }

  if (difficulty === 2) {
    if (random.chance(0.5)) {
      const [base, exponent] = random.pick([
        [2, 4],
        [2, 5],
        [2, 6],
        [3, 3],
        [3, 4],
        [4, 3],
        [5, 3],
        [10, 4],
        [10, 5],
      ] as const);
      const value = base ** exponent;
      return numberItem({
        prompt: `Calcola: $${base}^${exponent}$`,
        value,
        errors: [{ value: base * exponent, tag: "power_as_product", message: `$${base}^${exponent}$ vuol dire ${base} moltiplicato per se stesso ${exponent} volte.` }],
        solution: [`$${base}^${exponent} = ${Array.from({ length: exponent }, () => base).join(" \\times ")} = ${value}$`],
      });
    }
    const a = random.int(2, 9);
    const b = random.int(2, 5);
    const value = a * a + b ** 3;
    return numberItem({
      prompt: `Calcola: $${a}^2 + ${b}^3$`,
      value,
      errors: [{ value: 2 * a + 3 * b, tag: "power_as_product", message: `$${a}^2 = ${a} \\times ${a}$ e $${b}^3 = ${b} \\times ${b} \\times ${b}$.` }],
      solution: [`$${a}^2 = ${a * a}$`, `$${b}^3 = ${b ** 3}$`, `$${a * a} + ${b ** 3} = ${value}$`],
    });
  }

  if (random.chance(0.5)) {
    const { n, d, exponent } = retry(
      random,
      (r) => {
        const numerator = r.int(1, 5);
        const denominator = r.int(2, 7);
        if (numerator === denominator || numerator % denominator === 0) return null;
        return { n: numerator, d: denominator, exponent: r.chance(0.7) ? 2 : 3 };
      },
      { n: 2, d: 3, exponent: 2 },
    );
    const value = { n: n ** exponent, d: d ** exponent };
    return fractionItem({
      prompt: `Calcola: $\\left(${texFraction(n, d)}\\right)^${exponent}$`,
      value,
      errors: [
        { n: n ** exponent, d, tag: "power_fraction", message: "La potenza vale sia per il numeratore sia per il denominatore." },
        { n: n * exponent, d: d * exponent, tag: "power_as_product", message: "Elevare non vuol dire moltiplicare per l'esponente." },
      ],
      solution: [
        `Elevo numeratore e denominatore: $\\left(${texFraction(n, d)}\\right)^${exponent} = ${texFraction(n ** exponent, d ** exponent)}$`,
      ],
    });
  }
  const digit = random.int(2, 9);
  const base = digit / 10;
  const value = (digit * digit) / 100;
  return numberItem({
    prompt: `Calcola: $${texNumber(base)}^2$`,
    value,
    errors: [
      { value: (digit * digit) / 10, tag: "decimal_power", message: `$${texNumber(base)} \\times ${texNumber(base)}$: le cifre dopo la virgola si sommano, 1 + 1 = 2.` },
      { value: base * 2, tag: "power_as_product", message: "Elevare al quadrato vuol dire moltiplicare il numero per se stesso." },
    ],
    solution: [`$${texNumber(base)}^2 = ${texNumber(base)} \\times ${texNumber(base)}$`, `$${digit} \\times ${digit} = ${digit * digit}$ e due cifre decimali: $${texNumber(value)}$`],
  });
};

function powerOptions(random: Parameters<GeneratorFn>[0], correct: string, wrong: Array<[string, string, string]>) {
  const { options, correctId, idOf } = distinctOptions(random, correct, wrong.map(([text]) => text));
  return {
    options,
    correctId,
    errors: wrong.map(([text, tag, message]) => ({ option: idOf(text), tag, message })),
  };
}

export const powerProperties: GeneratorFn = (random, difficulty) => {
  const base = random.int(2, 9);
  if (difficulty === 1) {
    const { m, n } = retry(
      random,
      (r) => {
        const values = { m: r.int(2, 7), n: r.int(2, 6) };
        return values.m + values.n === values.m * values.n ? null : values;
      },
      { m: 4, n: 3 },
    );
    const { options, correctId, errors } = powerOptions(random, `$${base}^{${m + n}}$`, [
      [`$${base}^{${m * n}}$`, "power_product_multiply_exponents", "Nel prodotto di potenze con la stessa base gli esponenti si sommano, non si moltiplicano."],
      [`$${base * base}^{${m + n}}$`, "power_product_multiply_bases", "La base resta la stessa: si sommano solo gli esponenti."],
      [`$${base * base}^{${m * n}}$`, "power_product_multiply_bases", "La base resta la stessa e gli esponenti si sommano."],
    ]);
    return choiceItem({
      prompt: `Scrivi come un'unica potenza: $${base}^{${m}} \\times ${base}^{${n}}$`,
      options,
      correct: correctId,
      errors,
      solution: [`Stessa base: si tiene la base e si sommano gli esponenti.`, `$${base}^{${m}} \\times ${base}^{${n}} = ${base}^{${m} + ${n}} = ${base}^{${m + n}}$`],
    });
  }

  if (difficulty === 2) {
    if (random.chance(0.5)) {
      const n = random.int(2, 5);
      const m = n + random.int(2, 6);
      const { options, correctId, errors } = powerOptions(random, `$${base}^{${m - n}}$`, [
        [`$${base}^{${m + n}}$`, "power_quotient_add", "Nella divisione di potenze con la stessa base gli esponenti si sottraggono."],
        [`$1^{${m - n}}$`, "power_quotient_bases", "La base resta la stessa: si sottraggono solo gli esponenti."],
        [`$${base}^{${m * n}}$`, "power_quotient_multiply", "Nella divisione gli esponenti si sottraggono, non si moltiplicano."],
      ]);
      return choiceItem({
        prompt: `Scrivi come un'unica potenza: $${base}^{${m}} : ${base}^{${n}}$`,
        options,
        correct: correctId,
        errors,
        solution: [`Stessa base: si tiene la base e si sottraggono gli esponenti.`, `$${base}^{${m}} : ${base}^{${n}} = ${base}^{${m} - ${n}} = ${base}^{${m - n}}$`],
      });
    }
    const { m, n } = retry(
      random,
      (r) => {
        const values = { m: r.int(2, 6), n: r.int(2, 5) };
        return values.m + values.n === values.m * values.n ? null : values;
      },
      { m: 3, n: 4 },
    );
    const { options, correctId, errors } = powerOptions(random, `$${base}^{${m * n}}$`, [
      [`$${base}^{${m + n}}$`, "power_of_power_add_exponents", "Nella potenza di potenza gli esponenti si moltiplicano."],
      [`$${base * n}^{${m}}$`, "power_of_power_base", "La base non cambia: si moltiplicano gli esponenti."],
      [`$${base}^{${m ** n}}$`, "power_of_power_power", "Gli esponenti si moltiplicano, non si elevano."],
    ]);
    return choiceItem({
      prompt: `Scrivi come un'unica potenza: $(${base}^{${m}})^{${n}}$`,
      options,
      correct: correctId,
      errors,
      solution: [`Potenza di potenza: si moltiplicano gli esponenti.`, `$(${base}^{${m}})^{${n}} = ${base}^{${m} \\times ${n}} = ${base}^{${m * n}}$`],
    });
  }

  if (random.chance(0.5)) {
    const m = random.int(3, 8);
    const n = random.int(2, 6);
    const p = random.int(2, m + n - 1);
    const value = m + n - p;
    const { options, correctId, errors } = powerOptions(random, `$${base}^{${value}}$`, [
      [`$${base}^{${m * n - p}}$`, "power_product_multiply_exponents", "Nel prodotto gli esponenti si sommano, non si moltiplicano."],
      [`$${base}^{${m + n + p}}$`, "power_quotient_add", "Nella divisione gli esponenti si sottraggono."],
      [`$${base}^{${m + n}}$`, "power_quotient_missing", `Manca la divisione: dopo il prodotto togli l'esponente ${p}.`],
    ]);
    return choiceItem({
      prompt: `Scrivi come un'unica potenza: $${base}^{${m}} \\times ${base}^{${n}} : ${base}^{${p}}$`,
      options,
      correct: correctId,
      errors,
      solution: [
        `Prodotto: $${base}^{${m}} \\times ${base}^{${n}} = ${base}^{${m + n}}$`,
        `Divisione: $${base}^{${m + n}} : ${base}^{${p}} = ${base}^{${value}}$`,
      ],
    });
  }
  const other = random.int(2, 6);
  const n = random.int(2, 5);
  const { options, correctId, errors } = powerOptions(random, `$${base * other}^{${n}}$`, [
    [`$${base * other}^{${2 * n}}$`, "power_same_exponent", "Con lo stesso esponente si moltiplicano le basi e l'esponente resta uguale."],
    [`$${base + other}^{${n}}$`, "power_same_exponent_sum", "Le basi si moltiplicano, non si sommano."],
    [`$${base * other}^{${n * n}}$`, "power_same_exponent", "L'esponente resta uguale."],
  ]);
  return choiceItem({
    prompt: `Scrivi come un'unica potenza: $${base}^{${n}} \\times ${other}^{${n}}$`,
    options,
    correct: correctId,
    errors,
    solution: [`Stesso esponente: si moltiplicano le basi e si tiene l'esponente.`, `$${base}^{${n}} \\times ${other}^{${n}} = (${base} \\times ${other})^{${n}} = ${base * other}^{${n}}$`],
  });
};

const TRIPLES: Array<[number, number, number]> = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
  [8, 15, 17],
  [9, 12, 15],
];

export const squareRoot: GeneratorFn = (random, difficulty) => {
  if (difficulty === 1) {
    const n = random.int(2, 12);
    return numberItem({
      prompt: `Calcola: $\\sqrt{${n * n}}$`,
      value: n,
      errors: [{ value: (n * n) / 2, tag: "root_as_half", message: `La radice quadrata non è la metà: cerca il numero che moltiplicato per se stesso dà ${n * n}.` }],
      solution: [`Cerco il numero che moltiplicato per se stesso dà ${n * n}.`, `$${n} \\times ${n} = ${n * n}$, quindi $\\sqrt{${n * n}} = ${n}$`],
    });
  }
  if (difficulty === 2) {
    if (random.chance(0.5)) {
      const a = random.int(2, 5);
      const b = random.int(2, 6);
      return numberItem({
        prompt: `Calcola: $\\sqrt{${a * a} \\times ${b * b}}$`,
        value: a * b,
        errors: [{ value: (a * a * b * b) / 2, tag: "root_as_half", message: "La radice quadrata non è la metà." }],
        solution: [`La radice di un prodotto è il prodotto delle radici: $\\sqrt{${a * a}} \\times \\sqrt{${b * b}}$`, `$= ${a} \\times ${b} = ${a * b}$`],
      });
    }
    const digit = random.int(2, 9);
    const square = (digit * digit) / 100;
    return numberItem({
      prompt: `Calcola: $\\sqrt{${texNumber(square)}}$`,
      value: digit / 10,
      errors: [
        { value: digit / 100, tag: "decimal_root", message: `$${texNumber(digit / 10)} \\times ${texNumber(digit / 10)} = ${texNumber(square)}$: controlla le cifre decimali.` },
        { value: square / 2, tag: "root_as_half", message: "La radice quadrata non è la metà." },
      ],
      solution: [`Cerco il numero che moltiplicato per se stesso dà ${texNumber(square)}.`, `$${texNumber(digit / 10)} \\times ${texNumber(digit / 10)} = ${texNumber(square)}$`],
    });
  }
  const [a, b, c] = random.pick(TRIPLES);
  const k = random.int(1, 3);
  const [x, y, z] = [a * k, b * k, c * k];
  return numberItem({
    prompt: `Calcola: $\\sqrt{${x}^2 + ${y}^2}$`,
    value: z,
    errors: [
      { value: x + y, tag: "root_of_sum", message: "La radice di una somma non è la somma delle radici: prima calcola i quadrati e sommali." },
      { value: x * x + y * y, tag: "root_missing", message: "Hai calcolato il numero sotto radice: manca la radice quadrata." },
    ],
    solution: [`$${x}^2 + ${y}^2 = ${x * x} + ${y * y} = ${z * z}$`, `$\\sqrt{${z * z}} = ${z}$`],
  });
};

export const rootEstimate: GeneratorFn = (random, difficulty) => {
  const range = difficulty === 1 ? [5, 50] : difficulty === 2 ? [51, 150] : [151, 400];
  const value = retry(
    random,
    (r) => {
      const candidate = r.int(range[0], range[1]);
      return Number.isInteger(Math.sqrt(candidate)) ? null : candidate;
    },
    range[0] + 1,
  );
  const k = Math.floor(Math.sqrt(value));
  const correct = `${k} e ${k + 1}`;
  const lower = `${k - 1} e ${k}`;
  const upper = `${k + 1} e ${k + 2}`;
  const half = `${Math.floor(value / 2)} e ${Math.floor(value / 2) + 1}`;
  const { options, correctId, idOf } = distinctOptions(random, correct, [lower, upper, half]);
  return choiceItem({
    prompt: `Tra quali numeri interi consecutivi si trova $\\sqrt{${value}}$?`,
    options,
    correct: correctId,
    errors: [
      { option: idOf(half), tag: "root_as_half", message: `La radice non è la metà: $${k}^2 = ${k * k}$ e $${k + 1}^2 = ${(k + 1) ** 2}$.` },
      { option: idOf(lower), tag: "root_estimate", message: `Cerca i quadrati vicini a ${value}: $${k}^2 = ${k * k}$ e $${k + 1}^2 = ${(k + 1) ** 2}$.` },
      { option: idOf(upper), tag: "root_estimate", message: `Cerca i quadrati vicini a ${value}: $${k}^2 = ${k * k}$ e $${k + 1}^2 = ${(k + 1) ** 2}$.` },
    ],
    solution: [`$${k}^2 = ${k * k}$ e $${k + 1}^2 = ${(k + 1) ** 2}$`, `${value} sta tra ${k * k} e ${(k + 1) ** 2}, quindi $\\sqrt{${value}}$ sta tra ${k} e ${k + 1}.`],
  });
};
