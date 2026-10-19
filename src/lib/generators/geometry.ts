import { multiChoiceItem, multiNumberItem, numberItem, plainNumber, retry, shuffle, type GeneratorFn } from "./build";

const cm = (value: number) => `${plainNumber(value)} cm`;

export const angles: GeneratorFn = (random, difficulty) => {
  if (difficulty === 1) {
    const { a, b } = retry(
      random,
      (r) => {
        const values = { a: r.int(20, 100), b: r.int(20, 100) };
        return values.a + values.b <= 160 ? values : null;
      },
      { a: 50, b: 70 },
    );
    const c = 180 - a - b;
    return numberItem({
      prompt: `Un triangolo ha due angoli di ${a}° e ${b}°. Quanto misura il terzo angolo?`,
      figure: { shape: "triangle-angles", a: `${a}°`, b: `${b}°`, c: "?" },
      value: c,
      suffix: "°",
      errors: [
        { value: a + b, tag: "triangle_angle_sum", message: "La somma degli angoli interni di un triangolo è 180°: togli i due angoli da 180°." },
        { value: 360 - a - b, tag: "angle_sum_quadrilateral", message: "360° è la somma degli angoli di un quadrilatero; per il triangolo è 180°." },
      ],
      solution: [`La somma degli angoli di un triangolo è 180°.`, `$180 - ${a} - ${b} = ${c}$°`],
    });
  }
  if (difficulty === 2) {
    if (random.chance(0.5)) {
      const vertex = random.int(10, 80) * 2;
      const base = (180 - vertex) / 2;
      return numberItem({
        prompt: `In un triangolo isoscele l'angolo al vertice misura ${vertex}°. Quanto misura ciascun angolo alla base?`,
        figure: { shape: "triangle-angles", a: "?", b: "?", c: `${vertex}°` },
        value: base,
        suffix: "°",
        errors: [
          { value: 180 - vertex, tag: "isosceles_base_angles", message: "Gli angoli alla base sono due e sono uguali: dividi per 2." },
          { value: vertex, tag: "isosceles_base_angles", message: "Gli angoli alla base sono uguali tra loro, non all'angolo al vertice." },
        ],
        solution: [`Ai due angoli alla base restano $180 - ${vertex} = ${180 - vertex}$°`, `Sono uguali: $${180 - vertex} : 2 = ${base}$°`],
      });
    }
    const acute = random.int(15, 75);
    return numberItem({
      prompt: `Un triangolo rettangolo ha un angolo acuto di ${acute}°. Quanto misura l'altro angolo acuto?`,
      figure: { shape: "triangle-angles", a: "90°", b: `${acute}°`, c: "?" },
      value: 90 - acute,
      suffix: "°",
      errors: [
        { value: 180 - acute, tag: "right_angle_forgotten", message: "Non dimenticare l'angolo retto: $180 - 90 - " + acute + "$." },
        { value: 180 - 90 + acute, tag: "triangle_angle_sum", message: "Gli angoli vanno tolti da 180°." },
      ],
      solution: [`Un angolo è retto: 90°.`, `$180 - 90 - ${acute} = ${90 - acute}$°`],
    });
  }
  if (random.chance(0.5)) {
    const { a, b, c } = retry(
      random,
      (r) => {
        const values = { a: r.int(60, 130), b: r.int(60, 130), c: r.int(60, 130) };
        const rest = 360 - values.a - values.b - values.c;
        return rest >= 40 && rest <= 160 ? values : null;
      },
      { a: 90, b: 80, c: 100 },
    );
    const d = 360 - a - b - c;
    return numberItem({
      prompt: `Un quadrilatero ha tre angoli di ${a}°, ${b}° e ${c}°. Quanto misura il quarto angolo?`,
      value: d,
      suffix: "°",
      errors: [{ value: 180 - a - b - c + 360, tag: "angle_sum_quadrilateral", message: "La somma degli angoli di un quadrilatero è 360°." }],
      solution: [`La somma degli angoli di un quadrilatero è 360°.`, `$360 - ${a} - ${b} - ${c} = ${d}$°`],
    });
  }
  const sides = random.int(5, 8);
  const names: Record<number, string> = { 5: "pentagono", 6: "esagono", 7: "ettagono", 8: "ottagono" };
  const value = (sides - 2) * 180;
  return numberItem({
    prompt: `Quanto vale la somma degli angoli interni di un ${names[sides]}?`,
    value,
    suffix: "°",
    errors: [
      { value: sides * 180, tag: "polygon_sum", message: "La somma degli angoli interni è (lati − 2) × 180°." },
      { value: 360, tag: "polygon_sum", message: "360° vale per i quadrilateri: per gli altri poligoni usa (lati − 2) × 180°." },
    ],
    solution: [`Un poligono di ${sides} lati si divide in ${sides - 2} triangoli.`, `$(${sides} - 2) \\times 180 = ${value}$°`],
  });
};

export const rectangleSquare: GeneratorFn = (random, difficulty) => {
  if (difficulty === 1) {
    const base = random.int(3, 20);
    const height = retry(random, (r) => {
      const value = r.int(2, 15);
      return value === base ? null : value;
    }, base + 1);
    const perimeter = 2 * (base + height);
    const area = base * height;
    if (random.chance(0.5)) {
      return numberItem({
        prompt: `Un rettangolo ha la base di ${cm(base)} e l'altezza di ${cm(height)}. Calcola il perimetro.`,
        figure: { shape: "rectangle", base: cm(base), height: cm(height) },
        label: "Perimetro",
        value: perimeter,
        unit: "cm",
        errors: [
          { value: base + height, tag: "perimeter_half", message: "Il perimetro è la somma di tutti e 4 i lati." },
          { value: area, tag: "perimeter_area_confusion", message: "Questa è l'area. Il perimetro è la somma dei lati." },
        ],
        solution: [`Perimetro = somma dei 4 lati = $2 \\times (b + h)$`, `$2 \\times (${base} + ${height}) = ${perimeter}$ cm`],
      });
    }
    return numberItem({
      prompt: `Un rettangolo ha la base di ${cm(base)} e l'altezza di ${cm(height)}. Calcola l'area.`,
      figure: { shape: "rectangle", base: cm(base), height: cm(height) },
      label: "Area",
      value: area,
      unit: "cm²",
      errors: [
        { value: perimeter, tag: "perimeter_area_confusion", message: "Questo è il perimetro. L'area è base × altezza." },
        { value: base + height, tag: "area_as_sum", message: "L'area si calcola moltiplicando base e altezza." },
      ],
      solution: [`Area = base × altezza`, `$${base} \\times ${height} = ${area}$ cm²`],
    });
  }
  if (difficulty === 2) {
    const side = random.int(3, 15);
    if (random.chance(0.5)) {
      return numberItem({
        prompt: `Un quadrato ha il perimetro di ${cm(4 * side)}. Calcola l'area.`,
        figure: { shape: "square", side: "?" },
        label: "Area",
        value: side * side,
        unit: "cm²",
        errors: [
          { value: 16 * side * side, tag: "square_from_perimeter", message: "Prima trova il lato: perimetro : 4." },
          { value: 4 * side, tag: "perimeter_area_confusion", message: "Questo è il perimetro: l'area è lato × lato." },
        ],
        solution: [`Lato: $${4 * side} : 4 = ${side}$ cm`, `Area: $${side} \\times ${side} = ${side * side}$ cm²`],
      });
    }
    return numberItem({
      prompt: `Un quadrato ha l'area di ${side * side} cm². Calcola il perimetro.`,
      figure: { shape: "square", side: "?" },
      label: "Perimetro",
      value: 4 * side,
      unit: "cm",
      errors: [
        { value: (side * side) / 4, tag: "square_area_side", message: "Il lato si trova con la radice quadrata dell'area, non dividendo per 4." },
        { value: side, tag: "perimeter_missing_step", message: `${side} cm è il lato: il perimetro è 4 × lato.` },
      ],
      solution: [`Lato: $\\sqrt{${side * side}} = ${side}$ cm`, `Perimetro: $4 \\times ${side} = ${4 * side}$ cm`],
    });
  }
  const height = random.int(2, 10);
  const k = random.int(2, 4);
  const base = k * height;
  const perimeter = 2 * (base + height);
  return numberItem({
    prompt: `In un rettangolo la base è ${k === 2 ? "il doppio" : k === 3 ? "il triplo" : "il quadruplo"} dell'altezza e il perimetro misura ${cm(perimeter)}. Calcola l'area.`,
    figure: { shape: "rectangle", base: `${k} × h`, height: "h" },
    label: "Area",
    value: base * height,
    unit: "cm²",
    errors: [
      { value: (perimeter / 4) ** 2, tag: "rectangle_as_square", message: "Non è un quadrato: base e altezza sono diverse." },
      { value: (perimeter / 2 / (k + 1)) * (perimeter / 2), tag: "semiperimeter", message: "Usa il semiperimetro: base + altezza = perimetro : 2." },
    ],
    solution: [
      `Semiperimetro: $${perimeter} : 2 = ${perimeter / 2}$ cm = base + altezza = ${k + 1} parti uguali`,
      `Altezza: $${perimeter / 2} : ${k + 1} = ${height}$ cm, base: $${height} \\times ${k} = ${base}$ cm`,
      `Area: $${base} \\times ${height} = ${base * height}$ cm²`,
    ],
  });
};

export const triangleArea: GeneratorFn = (random, difficulty) => {
  if (difficulty === 1) {
    const { base, height } = retry(
      random,
      (r) => {
        const values = { base: r.int(4, 20), height: r.int(3, 16) };
        return (values.base * values.height) % 2 === 0 ? values : null;
      },
      { base: 10, height: 6 },
    );
    const area = (base * height) / 2;
    return numberItem({
      prompt: `Un triangolo ha la base di ${cm(base)} e l'altezza di ${cm(height)}. Calcola l'area.`,
      figure: { shape: "triangle", base: cm(base), height: cm(height) },
      label: "Area",
      value: area,
      unit: "cm²",
      errors: [
        { value: base * height, tag: "triangle_area_no_half", message: "L'area del triangolo è base × altezza diviso 2." },
        { value: base + height, tag: "area_as_sum", message: "Base e altezza si moltiplicano, poi si divide per 2." },
      ],
      solution: [`Area = base × altezza : 2`, `$${base} \\times ${height} : 2 = ${area}$ cm²`],
    });
  }
  if (difficulty === 2) {
    const base = random.int(4, 20);
    const height = random.int(3, 16);
    const area = (base * height) / 2;
    return numberItem({
      prompt: `Un triangolo ha l'area di ${plainNumber(area)} cm² e la base di ${cm(base)}. Calcola l'altezza.`,
      figure: { shape: "triangle", base: cm(base), height: "?" },
      label: "Altezza",
      value: height,
      unit: "cm",
      errors: [
        { value: area / base, tag: "triangle_inverse_half", message: "Dalla formula A = b × h : 2 si ricava h = 2 × A : b." },
        { value: area * base, tag: "inverse_formula", message: "Per trovare l'altezza si divide, non si moltiplica." },
      ],
      solution: [`Formula inversa: altezza = 2 × area : base`, `$2 \\times ${plainNumber(area).replace(",", "{,}")} : ${base} = ${height}$ cm`],
    });
  }
  const legA = random.int(3, 15);
  const legB = random.int(4, 18);
  const area = (legA * legB) / 2;
  return numberItem({
    prompt: `Un triangolo rettangolo ha i cateti di ${cm(legA)} e ${cm(legB)}. Calcola l'area.`,
    figure: { shape: "right-triangle", legA: cm(legA), legB: cm(legB) },
    label: "Area",
    value: area,
    unit: "cm²",
    errors: [{ value: legA * legB, tag: "triangle_area_no_half", message: "Nel triangolo rettangolo i cateti fanno da base e altezza: poi si divide per 2." }],
    solution: [`I due cateti sono base e altezza.`, `Area: $${legA} \\times ${legB} : 2 = ${plainNumber(area).replace(",", "{,}")}$ cm²`],
  });
};

export const quadrilateralArea: GeneratorFn = (random, difficulty) => {
  if (difficulty === 1) {
    const { d1, d2 } = retry(
      random,
      (r) => {
        const values = { d1: r.int(4, 24), d2: r.int(3, 18) };
        return (values.d1 * values.d2) % 2 === 0 && values.d1 !== values.d2 ? values : null;
      },
      { d1: 10, d2: 6 },
    );
    return numberItem({
      prompt: `Un rombo ha le diagonali di ${cm(d1)} e ${cm(d2)}. Calcola l'area.`,
      figure: { shape: "rhombus", d1: cm(d1), d2: cm(d2) },
      label: "Area",
      value: (d1 * d2) / 2,
      unit: "cm²",
      errors: [
        { value: d1 * d2, tag: "rhombus_no_half", message: "Area del rombo: diagonale × diagonale : 2." },
        { value: d1 + d2, tag: "area_as_sum", message: "Le diagonali si moltiplicano, poi si divide per 2." },
      ],
      solution: [`Area del rombo = $d_1 \\times d_2 : 2$`, `$${d1} \\times ${d2} : 2 = ${(d1 * d2) / 2}$ cm²`],
    });
  }
  if (difficulty === 2) {
    const { big, small, height } = retry(
      random,
      (r) => {
        const values = { big: r.int(8, 24), small: r.int(3, 16), height: r.int(3, 12) };
        return values.small < values.big && ((values.big + values.small) * values.height) % 2 === 0 ? values : null;
      },
      { big: 12, small: 8, height: 5 },
    );
    const area = ((big + small) * height) / 2;
    return numberItem({
      prompt: `Un trapezio ha le basi di ${cm(big)} e ${cm(small)} e l'altezza di ${cm(height)}. Calcola l'area.`,
      figure: { shape: "trapezoid", bottom: cm(big), top: cm(small), height: cm(height) },
      label: "Area",
      value: area,
      unit: "cm²",
      errors: [
        { value: (big + small) * height, tag: "trapezoid_no_half", message: "Area del trapezio: (base maggiore + base minore) × altezza : 2." },
        { value: (big * small * height) / 2, tag: "trapezoid_formula", message: "Le basi si sommano, non si moltiplicano." },
      ],
      solution: [`Area = (B + b) × h : 2`, `$(${big} + ${small}) \\times ${height} : 2 = ${big + small} \\times ${height} : 2 = ${area}$ cm²`],
    });
  }
  const { big, small, height } = retry(
    random,
    (r) => {
      const values = { big: r.int(8, 24), small: r.int(3, 16), height: r.int(3, 12) };
      return values.small < values.big && ((values.big + values.small) * values.height) % 2 === 0 ? values : null;
    },
    { big: 14, small: 6, height: 5 },
  );
  const area = ((big + small) * height) / 2;
  return numberItem({
    prompt: `Un trapezio ha l'area di ${area} cm² e le basi di ${cm(big)} e ${cm(small)}. Calcola l'altezza.`,
    figure: { shape: "trapezoid", bottom: cm(big), top: cm(small), height: "?" },
    label: "Altezza",
    value: height,
    unit: "cm",
    errors: [
      { value: area / (big + small), tag: "inverse_half", message: "Dalla formula si ricava h = 2 × A : (B + b)." },
      { value: (2 * area) / (big * small), tag: "trapezoid_formula", message: "Le basi si sommano, non si moltiplicano." },
    ],
    solution: [`Formula inversa: h = 2 × A : (B + b)`, `$2 \\times ${area} : (${big} + ${small}) = ${2 * area} : ${big + small} = ${height}$ cm`],
  });
};

export const inverseFormulas: GeneratorFn = (random, difficulty) => {
  const base = random.int(3, 16);
  const height = retry(random, (r) => {
    const value = r.int(2, 14);
    return value === base ? null : value;
  }, base + 1);
  const area = base * height;
  if (difficulty === 1) {
    return numberItem({
      prompt: `Un rettangolo ha l'area di ${area} cm² e la base di ${cm(base)}. Calcola l'altezza.`,
      figure: { shape: "rectangle", base: cm(base), height: "?" },
      label: "Altezza",
      value: height,
      unit: "cm",
      errors: [
        { value: area * base, tag: "inverse_formula", message: "Per trovare l'altezza si divide l'area per la base." },
        { value: area - base, tag: "inverse_formula", message: "Area = base × altezza: l'altezza si trova dividendo." },
      ],
      solution: [`Area = base × altezza, quindi altezza = area : base`, `$${area} : ${base} = ${height}$ cm`],
    });
  }
  if (difficulty === 2) {
    return numberItem({
      prompt: `Un rettangolo ha l'area di ${area} cm² e la base di ${cm(base)}. Calcola il perimetro.`,
      figure: { shape: "rectangle", base: cm(base), height: "?" },
      label: "Perimetro",
      value: 2 * (base + height),
      unit: "cm",
      errors: [
        { value: height, tag: "perimeter_missing_step", message: `${height} cm è l'altezza: manca il perimetro, 2 × (base + altezza).` },
        { value: area * base, tag: "inverse_formula", message: "Per trovare l'altezza si divide l'area per la base." },
      ],
      solution: [`Altezza: $${area} : ${base} = ${height}$ cm`, `Perimetro: $2 \\times (${base} + ${height}) = ${2 * (base + height)}$ cm`],
    });
  }
  const side = random.int(3, 15);
  return multiNumberItem({
    prompt: `Un quadrato ha l'area di ${side * side} cm². Calcola il lato e il perimetro.`,
    figure: { shape: "square", side: "?" },
    fields: [
      {
        id: "side",
        label: "Lato",
        value: side,
        unit: "cm",
        errors: [{ value: (side * side) / 4, tag: "square_area_side", message: "Il lato si trova con la radice quadrata dell'area." }],
      },
      {
        id: "perimeter",
        label: "Perimetro",
        value: 4 * side,
        unit: "cm",
        errors: [{ value: side * side, tag: "perimeter_area_confusion", message: "Il perimetro è 4 × lato." }],
      },
    ],
    solution: [`Lato: $\\sqrt{${side * side}} = ${side}$ cm`, `Perimetro: $4 \\times ${side} = ${4 * side}$ cm`],
  });
};

const TRIPLES: Array<[number, number, number]> = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
];

function triple(random: Parameters<GeneratorFn>[0], maxScale: number) {
  const [a, b, c] = random.pick(TRIPLES.slice(0, maxScale > 2 ? 3 : 2));
  const k = random.int(1, maxScale);
  return [a * k, b * k, c * k] as const;
}

export const pythagorasTheorem: GeneratorFn = (random, difficulty) => {
  if (difficulty === 1) {
    const [a, b, c] = triple(random, 4);
    return numberItem({
      prompt: `Un triangolo rettangolo ha i cateti di ${cm(a)} e ${cm(b)}. Calcola l'ipotenusa.`,
      figure: { shape: "right-triangle", legA: cm(a), legB: cm(b), hypotenuse: "?" },
      label: "Ipotenusa",
      value: c,
      unit: "cm",
      errors: [
        { value: a + b, tag: "pythagoras_sum_legs", message: "L'ipotenusa non è la somma dei cateti: somma i loro quadrati e fai la radice." },
        { value: a * a + b * b, tag: "pythagoras_no_root", message: "Hai trovato il quadrato dell'ipotenusa: manca la radice quadrata." },
      ],
      solution: [`$i = \\sqrt{c_1^2 + c_2^2}$`, `$\\sqrt{${a}^2 + ${b}^2} = \\sqrt{${a * a} + ${b * b}} = \\sqrt{${c * c}} = ${c}$ cm`],
    });
  }
  if (difficulty === 2) {
    const [a, b, c] = triple(random, 4);
    return numberItem({
      prompt: `Un triangolo rettangolo ha l'ipotenusa di ${cm(c)} e un cateto di ${cm(a)}. Calcola l'altro cateto.`,
      figure: { shape: "right-triangle", legA: cm(a), legB: "?", hypotenuse: cm(c) },
      label: "Cateto",
      value: b,
      unit: "cm",
      errors: [
        { value: Math.sqrt(c * c + a * a), tag: "pythagoras_add_instead_subtract", message: "Per trovare un cateto si sottrae: $\\sqrt{i^2 - c^2}$." },
        { value: c - a, tag: "pythagoras_difference", message: "Non si sottraggono i lati: si sottraggono i loro quadrati." },
        { value: c * c - a * a, tag: "pythagoras_no_root", message: "Manca la radice quadrata." },
      ],
      solution: [`$c = \\sqrt{i^2 - c_1^2}$`, `$\\sqrt{${c}^2 - ${a}^2} = \\sqrt{${c * c} - ${a * a}} = \\sqrt{${b * b}} = ${b}$ cm`],
    });
  }
  const [a0, b0, c0] = random.pick(TRIPLES);
  const half = random.chance(0.4);
  const [a, b, c] = half ? [a0 * 0.5, b0 * 0.5, c0 * 0.5] : [a0, b0, c0];
  if (random.chance(0.5)) {
    return numberItem({
      prompt: `Un triangolo rettangolo ha i cateti di ${cm(a)} e ${cm(b)}. Calcola l'ipotenusa.`,
      figure: { shape: "right-triangle", legA: cm(a), legB: cm(b), hypotenuse: "?" },
      label: "Ipotenusa",
      value: c,
      unit: "cm",
      errors: [{ value: a + b, tag: "pythagoras_sum_legs", message: "L'ipotenusa non è la somma dei cateti." }],
      solution: [`$\\sqrt{${plainNumber(a).replace(",", "{,}")}^2 + ${plainNumber(b).replace(",", "{,}")}^2} = \\sqrt{${plainNumber(c * c).replace(",", "{,}")}} = ${plainNumber(c).replace(",", "{,}")}$ cm`],
    });
  }
  return numberItem({
    prompt: `Un triangolo rettangolo ha l'ipotenusa di ${cm(c)} e un cateto di ${cm(b)}. Calcola l'altro cateto.`,
    figure: { shape: "right-triangle", legA: "?", legB: cm(b), hypotenuse: cm(c) },
    label: "Cateto",
    value: a,
    unit: "cm",
    errors: [{ value: c - b, tag: "pythagoras_difference", message: "Non si sottraggono i lati: si sottraggono i loro quadrati." }],
    solution: [`$\\sqrt{${plainNumber(c).replace(",", "{,}")}^2 - ${plainNumber(b).replace(",", "{,}")}^2} = \\sqrt{${plainNumber(a * a).replace(",", "{,}")}} = ${plainNumber(a).replace(",", "{,}")}$ cm`],
  });
};

export const pythagoreanTriples: GeneratorFn = (random, difficulty) => {
  if (difficulty === 3) {
    const [a, b, c] = triple(random, 4);
    if (random.chance(0.5)) {
      return numberItem({
        prompt: `Completa la terna pitagorica: ${a}, ${b}, ?`,
        value: c,
        errors: [{ value: a + b, tag: "pythagoras_sum_legs", message: `Verifica: $${a}^2 + ${b}^2$ deve essere il quadrato del numero mancante.` }],
        solution: [`$${a}^2 + ${b}^2 = ${a * a} + ${b * b} = ${c * c}$`, `$\\sqrt{${c * c}} = ${c}$`],
      });
    }
    return numberItem({
      prompt: `Completa la terna pitagorica: ${a}, ?, ${c}`,
      value: b,
      errors: [{ value: c - a, tag: "pythagoras_difference", message: "Si sottraggono i quadrati, non i numeri." }],
      solution: [`$${c}^2 - ${a}^2 = ${c * c} - ${a * a} = ${b * b}$`, `$\\sqrt{${b * b}} = ${b}$`],
    });
  }
  const correct = retry(
    random,
    (r) => {
      const first = triple(r, difficulty === 1 ? 2 : 4);
      const second = triple(r, difficulty === 1 ? 2 : 4);
      return first.join() === second.join() ? null : [first, second];
    },
    [
      [3, 4, 5],
      [5, 12, 13],
    ] as const,
  );
  const wrong = correct.map(([a, b, c]) => [a, b, c + 1] as const);
  const ids = ["a", "b", "c", "d"];
  const options = shuffle(random, [...correct, ...wrong]).map((values, position) => ({ id: ids[position], text: values.join(", ") }));
  const correctIds = options.filter((option) => correct.some((t) => t.join(", ") === option.text)).map((option) => option.id);
  return multiChoiceItem({
    prompt: "Quali di queste sono terne pitagoriche? Puoi sceglierne più di una.",
    options,
    correct: correctIds,
    errors: options
      .filter((option) => !correctIds.includes(option.id))
      .map((option) => ({
        includes: option.id,
        tag: "pythagorean_triple_check",
        message: "Verifica sempre: il quadrato del numero più grande deve essere la somma dei quadrati degli altri due.",
      })),
    solution: correct.map(([a, b, c]) => `$${a}^2 + ${b}^2 = ${a * a + b * b} = ${c}^2$ ✓`).concat(wrong.map(([a, b, c]) => `$${a}^2 + ${b}^2 = ${a * a + b * b}$, ma $${c}^2 = ${c * c}$ ✗`)),
  });
};

export const pythagorasInFigures: GeneratorFn = (random, difficulty) => {
  const [a, b, c] = triple(random, 3);
  if (difficulty === 1) {
    return numberItem({
      prompt: `Un rettangolo ha i lati di ${cm(a)} e ${cm(b)}. Calcola la diagonale.`,
      figure: { shape: "rectangle", base: cm(b), height: cm(a), diagonal: "?" },
      label: "Diagonale",
      value: c,
      unit: "cm",
      errors: [{ value: a + b, tag: "pythagoras_sum_legs", message: "La diagonale divide il rettangolo in due triangoli rettangoli: usa il teorema di Pitagora." }],
      solution: [`La diagonale è l'ipotenusa di un triangolo rettangolo con cateti ${a} e ${b}.`, `$\\sqrt{${a}^2 + ${b}^2} = \\sqrt{${c * c}} = ${c}$ cm`],
    });
  }
  if (difficulty === 2) {
    const base = 2 * a;
    const area = a * b;
    return multiNumberItem({
      prompt: `Un triangolo isoscele ha la base di ${cm(base)} e i lati obliqui di ${cm(c)}. Calcola l'altezza e l'area.`,
      figure: { shape: "triangle", base: cm(base), left: cm(c), right: cm(c), height: "?" },
      fields: [
        {
          id: "height",
          label: "Altezza",
          value: b,
          unit: "cm",
          errors: c > base ? [{ value: Math.sqrt(c * c - base * base), tag: "isosceles_full_base", message: `L'altezza divide la base a metà: il cateto è ${a} cm, non ${base} cm.` }] : [],
        },
        {
          id: "area",
          label: "Area",
          value: area,
          unit: "cm²",
          errors: [{ value: base * b, tag: "triangle_area_no_half", message: "Area del triangolo: base × altezza : 2." }],
        },
      ],
      solution: [
        `L'altezza divide la base a metà: $${base} : 2 = ${a}$ cm`,
        `Altezza: $\\sqrt{${c}^2 - ${a}^2} = \\sqrt{${c * c - a * a}} = ${b}$ cm`,
        `Area: $${base} \\times ${b} : 2 = ${area}$ cm²`,
      ],
    });
  }
  const d1 = 2 * b;
  const d2 = 2 * a;
  return multiNumberItem({
    prompt: `Un rombo ha le diagonali di ${cm(d1)} e ${cm(d2)}. Calcola il lato e il perimetro.`,
    figure: { shape: "rhombus", d1: cm(d1), d2: cm(d2), side: "?" },
    fields: [
      {
        id: "side",
        label: "Lato",
        value: c,
        unit: "cm",
        errors: [{ value: Math.sqrt(d1 * d1 + d2 * d2), tag: "rhombus_full_diagonals", message: "Usa le metà delle diagonali: formano un triangolo rettangolo con il lato." }],
      },
      {
        id: "perimeter",
        label: "Perimetro",
        value: 4 * c,
        unit: "cm",
        errors: [{ value: 2 * (d1 + d2), tag: "rhombus_perimeter_diagonals", message: "Il perimetro è 4 × lato, non la somma delle diagonali." }],
      },
    ],
    solution: [
      `Le diagonali si tagliano a metà: ${b} cm e ${a} cm`,
      `Lato: $\\sqrt{${b}^2 + ${a}^2} = \\sqrt{${c * c}} = ${c}$ cm`,
      `Perimetro: $4 \\times ${c} = ${4 * c}$ cm`,
    ],
  });
};
