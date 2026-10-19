import { choiceItem, numberItem, plainNumber, retry, texNumber, type GeneratorFn } from "./build";

const OBJECTS = [
  { one: "quaderno", many: "quaderni" },
  { one: "penna", many: "penne" },
  { one: "biglietto", many: "biglietti" },
  { one: "panino", many: "panini" },
  { one: "gelato", many: "gelati" },
];

const DISCOUNT_ITEMS = ["un paio di scarpe", "una felpa", "una bici", "un videogioco", "uno zaino"];

export const percent: GeneratorFn = (random, difficulty) => {
  if (difficulty === 3) {
    const whole = random.int(1, 20) * 20;
    const p = random.int(1, 19) * 5;
    const part = (p * whole) / 100;
    return numberItem({
      prompt: `In una scuola ci sono ${whole} alunni e ${part} vanno a scuola a piedi. Che percentuale degli alunni va a piedi?`,
      value: p,
      suffix: "%",
      errors: [
        { value: part, tag: "percent_inverse", message: `${part} è il numero di alunni, non la percentuale.` },
        { value: part / whole, tag: "percent_not_scaled", message: "Il rapporto va moltiplicato per 100 per avere la percentuale." },
        { value: (whole / part) * 100, tag: "percent_inverted_ratio", message: "Si divide la parte per il totale, non il totale per la parte." },
      ],
      solution: [`Rapporto: $${part} : ${whole} = ${texNumber(part / whole)}$`, `Per avere la percentuale moltiplico per 100: $${texNumber(part / whole)} \\times 100 = ${p}$`],
    });
  }
  const p = difficulty === 1 ? random.pick([10, 20, 25, 50]) : random.int(1, 19) * 5;
  const whole = random.int(1, difficulty === 1 ? 15 : 25) * 20;
  const value = (p * whole) / 100;
  return numberItem({
    prompt: `Calcola il ${p}% di ${whole}.`,
    value,
    errors: [
      { value: whole - p, tag: "percent_subtract", message: `Il ${p}% non vuol dire togliere ${p}: è una parte su 100.` },
      { value: whole * p, tag: "percent_concept", message: "Dopo aver moltiplicato per la percentuale, va diviso per 100." },
      { value: whole / p, tag: "percent_divide", message: `Si divide per 100 e si moltiplica per ${p}, non si divide per ${p}.` },
    ],
    solution: [`$${p}\\% = \\frac{${p}}{100}$`, `$${whole} : 100 \\times ${p} = ${plainNumber(value).replace(",", "{,}")}$`],
  });
};

export const proportions: GeneratorFn = (random, difficulty) => {
  if (difficulty === 3) {
    const { a, b, x } = retry(
      random,
      (r) => {
        const mean = r.int(4, 20);
        const square = mean * mean;
        const divisors = Array.from({ length: mean - 1 }, (_, index) => index + 1).filter((value) => square % value === 0 && value > 1);
        if (divisors.length === 0) return null;
        const first = r.pick(divisors);
        return { a: first, b: square / first, x: mean };
      },
      { a: 4, b: 9, x: 6 },
    );
    return numberItem({
      prompt: `Trova il medio proporzionale $x$: $${a} : x = x : ${b}$`,
      label: "$x =$",
      value: x,
      errors: [
        { value: (a + b) / 2, tag: "proportion_mean_average", message: "Il medio proporzionale non è la media: $x \\times x = a \\times b$." },
        { value: a * b, tag: "proportion_mean_no_root", message: "Hai trovato $x^2$: manca la radice quadrata." },
      ],
      solution: [`Prodotto dei medi = prodotto degli estremi: $x \\times x = ${a} \\times ${b} = ${a * b}$`, `$x = \\sqrt{${a * b}} = ${x}$`],
    });
  }

  const a = random.int(2, 9);
  const b = retry(random, (r) => {
    const value = r.int(2, 12);
    return value === a ? null : value;
  }, a + 1);
  const m = random.int(2, 6);
  const values = [a, b, a * m, b * m];
  const position = difficulty === 1 ? 3 : random.int(0, 3);
  const unknown = values[position];
  const shown = values.map((value, index) => (index === position ? "x" : String(value)));
  const [p0, p1, p2, p3] = values;
  const means = position === 1 || position === 2;
  const known = means ? (position === 1 ? [p0, p3, p2] : [p0, p3, p1]) : position === 0 ? [p1, p2, p3] : [p1, p2, p0];
  const [k1, k2, divisor] = known;
  return numberItem({
    prompt: `Trova $x$ nella proporzione $${shown[0]} : ${shown[1]} = ${shown[2]} : ${shown[3]}$`,
    label: "$x =$",
    value: unknown,
    errors: [
      { value: (divisor * k2) / k1, tag: "proportion_property", message: "Il prodotto dei medi è uguale al prodotto degli estremi: scrivi l'uguaglianza e poi dividi." },
      { value: (divisor * k1) / k2, tag: "proportion_property", message: "Il prodotto dei medi è uguale al prodotto degli estremi: scrivi l'uguaglianza e poi dividi." },
    ],
    solution: [
      means
        ? `Prodotto dei medi = prodotto degli estremi: $${shown[1]} \\times ${shown[2]} = ${p0} \\times ${p3}$`
        : `Prodotto degli estremi = prodotto dei medi: $${shown[0]} \\times ${shown[3]} = ${p1} \\times ${p2}$`,
      `$x = ${k1} \\times ${k2} : ${divisor} = ${unknown}$`,
    ],
  });
};

export const percentProblems: GeneratorFn = (random, difficulty) => {
  const item = random.pick(DISCOUNT_ITEMS);
  if (difficulty === 1) {
    const p = random.pick([10, 20, 25, 30, 50]);
    const price = random.int(2, 15) * 20;
    const discount = (price * p) / 100;
    return numberItem({
      prompt: `Il prezzo di ${item} è ${price} €. Oggi c'è lo sconto del ${p}%. Quanto si paga?`,
      value: price - discount,
      suffix: "€",
      errors: [
        { value: discount, tag: "discount_stop_early", message: `${plainNumber(discount)} € è lo sconto: va ancora tolto dal prezzo.` },
        { value: price - p, tag: "discount_subtract_percent", message: `Lo sconto non è ${p} €, ma il ${p}% di ${price} €.` },
        { value: price + discount, tag: "discount_added", message: "Lo sconto va tolto, non aggiunto." },
      ],
      solution: [`Sconto: il ${p}% di ${price} = $${price} : 100 \\times ${p} = ${texNumber(discount)}$ €`, `Prezzo finale: $${price} - ${texNumber(discount)} = ${texNumber(price - discount)}$ €`],
    });
  }
  if (difficulty === 2) {
    const p = random.pick([5, 10, 15, 20, 25]);
    const price = random.int(2, 20) * 20;
    const increase = (price * p) / 100;
    return numberItem({
      prompt: `Un abbonamento costava ${price} €. Quest'anno il prezzo è aumentato del ${p}%. Quanto costa adesso?`,
      value: price + increase,
      suffix: "€",
      errors: [
        { value: increase, tag: "increase_stop_early", message: `${plainNumber(increase)} € è l'aumento: va ancora aggiunto al prezzo.` },
        { value: price + p, tag: "increase_add_percent", message: `L'aumento non è ${p} €, ma il ${p}% di ${price} €.` },
        { value: price - increase, tag: "increase_subtracted", message: "L'aumento va aggiunto, non tolto." },
      ],
      solution: [`Aumento: $${price} : 100 \\times ${p} = ${texNumber(increase)}$ €`, `Nuovo prezzo: $${price} + ${texNumber(increase)} = ${texNumber(price + increase)}$ €`],
    });
  }
  const p = random.pick([10, 20, 25, 50]);
  const original = random.int(2, 15) * 20;
  const final = original * (1 - p / 100);
  return numberItem({
    prompt: `Con lo sconto del ${p}%, ${item} costa ${plainNumber(final)} €. Quanto costava prima dello sconto?`,
    value: original,
    suffix: "€",
    errors: [
      { value: final + (final * p) / 100, tag: "percent_reverse", message: "Lo sconto era calcolato sul prezzo iniziale, non su quello finale." },
      { value: final + p, tag: "discount_subtract_percent", message: `Lo sconto non è ${p} €.` },
    ],
    solution: [
      `Con lo sconto si paga il ${100 - p}% del prezzo iniziale.`,
      `Il ${100 - p}% vale ${plainNumber(final)} €: l'1% vale $${texNumber(final)} : ${100 - p} = ${texNumber(original / 100)}$ €`,
      `Prezzo iniziale (100%): $${texNumber(original / 100)} \\times 100 = ${original}$ €`,
    ],
  });
};

export const directProportionality: GeneratorFn = (random, difficulty) => {
  if (difficulty === 3) {
    const scale = random.pick([25_000, 50_000, 100_000, 200_000]);
    const cm = random.int(2, 12);
    const km = (cm * scale) / 100_000;
    return numberItem({
      prompt: `Su una carta in scala 1 : ${scale.toLocaleString("it-IT")}, due paesi distano ${cm} cm. Quanti km sono nella realtà?`,
      value: km,
      suffix: "km",
      errors: [
        { value: cm * scale, tag: "scale_units", message: "Il risultato è in centimetri: per avere i km dividi per 100 000." },
        { value: (cm * scale) / 1000, tag: "scale_units", message: "1 km = 100 000 cm: controlla la conversione." },
      ],
      solution: [`1 cm sulla carta = ${scale.toLocaleString("it-IT")} cm nella realtà.`, `$${cm} \\times ${scale} = ${cm * scale}$ cm`, `In km: $${cm * scale} : 100\\,000 = ${texNumber(km)}$ km`],
    });
  }
  const object = random.pick(OBJECTS);
  const unit = difficulty === 1 ? random.int(2, 9) : random.pick([0.5, 1.5, 2.5, 0.8, 1.2]);
  const a = random.int(2, 6);
  const c = retry(random, (r) => {
    const value = r.int(2, 12);
    return value === a ? null : value;
  }, a + 2);
  const total = a * unit;
  return numberItem({
    prompt: `${a} ${object.many} costano ${plainNumber(total)} €. Quanto costano ${c} ${object.many}?`,
    value: c * unit,
    suffix: "€",
    errors: [
      { value: (a * total) / c, tag: "direct_as_inverse", message: `Più ${object.many} costano di più: è proporzionalità diretta.` },
      { value: total + (c - a), tag: "proportion_additive", message: "Non si aggiunge la differenza: trova prima il prezzo di uno." },
    ],
    solution: [`Prezzo di un ${object.one}: $${texNumber(total)} : ${a} = ${texNumber(unit)}$ €`, `Prezzo di ${c}: $${texNumber(unit)} \\times ${c} = ${texNumber(c * unit)}$ €`],
  });
};

function tableTex(xs: number[], ys: number[]): string {
  return `\\begin{array}{c|${xs.map(() => "c").join("|")}} x & ${xs.join(" & ")} \\\\ \\hline y & ${ys.join(" & ")} \\end{array}`;
}

export const inverseProportionality: GeneratorFn = (random, difficulty) => {
  if (difficulty === 3) {
    const kind = random.pick(["direct", "inverse", "none"] as const);
    const xs = random.pick([
      [1, 2, 4],
      [2, 3, 6],
      [1, 3, 6],
      [2, 4, 8],
    ]);
    const lcmXs = xs.reduce((total, value) => (total * value) / gcdSmall(total, value), 1);
    const factor = random.int(2, 5);
    const shift = random.int(2, 6);
    const product = lcmXs * random.int(1, 3);
    const ys =
      kind === "direct" ? xs.map((value) => value * factor) : kind === "inverse" ? xs.map((value) => product / value) : xs.map((value) => value + shift);
    const options = [
      { id: "direct", text: "Proporzionalità diretta" },
      { id: "inverse", text: "Proporzionalità inversa" },
      { id: "none", text: "Nessuna delle due" },
    ];
    const ratioTex = xs.map((value, index) => `${ys[index]} : ${value}`).join(",\\; ");
    const productTex = xs.map((value, index) => `${value} \\times ${ys[index]}`).join(",\\; ");
    return choiceItem({
      prompt: `Che tipo di legame c'è tra $x$ e $y$? $${tableTex(xs, ys)}$`,
      options,
      correct: kind,
      errors: [
        { option: "direct", tag: "inverse_as_direct", message: "Nella diretta il rapporto y : x resta sempre uguale. Controlla i rapporti." },
        { option: "inverse", tag: "direct_as_inverse", message: "Nell'inversa il prodotto x · y resta sempre uguale. Controlla i prodotti." },
        { option: "none", tag: "proportionality_check", message: "Controlla rapporti e prodotti: uno dei due resta costante." },
      ],
      solution: [
        `Rapporti y : x: $${ratioTex}$`,
        `Prodotti x · y: $${productTex}$`,
        kind === "direct"
          ? "I rapporti sono uguali: proporzionalità diretta."
          : kind === "inverse"
            ? "I prodotti sono uguali: proporzionalità inversa."
            : "Né i rapporti né i prodotti sono uguali: nessuna delle due.",
      ],
    });
  }
  if (difficulty === 1) {
    const { workers, days, other } = retry(
      random,
      (r) => {
        const values = { workers: r.int(2, 8), days: r.int(2, 12), other: r.int(2, 12) };
        const total = values.workers * values.days;
        return values.other !== values.workers && total % values.other === 0 ? values : null;
      },
      { workers: 4, days: 6, other: 3 },
    );
    const value = (workers * days) / other;
    return numberItem({
      prompt: `${workers} operai finiscono un lavoro in ${days} giorni. In quanti giorni lo finiscono ${other} operai, lavorando allo stesso modo?`,
      value,
      suffix: "giorni",
      errors: [{ value: (days * other) / workers, tag: "inverse_as_direct", message: `Più operai ci mettono meno giorni: è proporzionalità inversa (${workers} × ${days} = ${other} × ?).` }],
      solution: [`Il lavoro totale è $${workers} \\times ${days} = ${workers * days}$ giornate di lavoro.`, `Con ${other} operai: $${workers * days} : ${other} = ${value}$ giorni`],
    });
  }
  const { speed, hours, other } = retry(
    random,
    (r) => {
      const values = { speed: r.int(4, 12) * 10, hours: r.int(2, 6), other: r.int(4, 12) * 10 };
      const distance = values.speed * values.hours;
      return values.other !== values.speed && distance % values.other === 0 ? values : null;
    },
    { speed: 60, hours: 4, other: 80 },
  );
  const distance = speed * hours;
  const value = distance / other;
  return numberItem({
    prompt: `Andando a ${speed} km/h un'auto impiega ${hours} ore per un viaggio. Quante ore impiega andando a ${other} km/h?`,
    value,
    suffix: "ore",
    errors: [{ value: (hours * other) / speed, tag: "inverse_as_direct", message: "Più veloce vuol dire meno tempo: è proporzionalità inversa." }],
    solution: [`Distanza: $${speed} \\times ${hours} = ${distance}$ km`, `Tempo a ${other} km/h: $${distance} : ${other} = ${texNumber(value)}$ ore`],
  });
};

function gcdSmall(a: number, b: number): number {
  return b === 0 ? a : gcdSmall(b, a % b);
}
