import {
  choiceItem,
  distinctOptions,
  multiNumberItem,
  numberItem,
  orderItem,
  plainNumber,
  retry,
  texNumber,
  type GeneratedItem,
  type GeneratorFn,
} from "./build";
import type { Random } from "./random";

const NAMES = ["Luca", "Sara", "Marco", "Giulia", "Omar", "Elena", "Karim", "Sofia"];

const OPERATION_MESSAGE = "Rileggi la domanda: quale operazione serve davvero?";

function oneStepInteger(random: Random): GeneratedItem {
  const name = random.pick(NAMES);
  const variant = random.int(0, 3);
  if (variant === 0) {
    const total = random.int(30, 150);
    const given = random.int(5, total - 5);
    return numberItem({
      prompt: `${name} ha ${total} figurine e ne regala ${given} a un amico. Quante figurine gli restano?`,
      value: total - given,
      suffix: "figurine",
      errors: [{ value: total + given, tag: "operation_choice", message: "Se ne regala, ne restano di meno: è una sottrazione." }],
      solution: [`Restano: $${total} - ${given} = ${total - given}$ figurine`],
    });
  }
  if (variant === 1) {
    const per = random.int(4, 12);
    const boxes = random.int(3, 15);
    return numberItem({
      prompt: `Ogni scatola contiene ${per} uova. Quante uova ci sono in ${boxes} scatole?`,
      value: per * boxes,
      suffix: "uova",
      errors: [{ value: per + boxes, tag: "operation_choice", message: `Sono ${boxes} scatole da ${per} uova: è una moltiplicazione.` }],
      solution: [`$${per} \\times ${boxes} = ${per * boxes}$ uova`],
    });
  }
  if (variant === 2) {
    const kids = random.int(3, 9);
    const each = random.int(3, 12);
    const total = kids * each;
    return numberItem({
      prompt: `${total} caramelle vengono divise in parti uguali tra ${kids} bambini. Quante caramelle riceve ognuno?`,
      value: each,
      suffix: "caramelle",
      errors: [
        { value: total - kids, tag: "operation_choice", message: "Dividere in parti uguali è una divisione." },
        { value: total * kids, tag: "operation_choice", message: "Dividere in parti uguali è una divisione." },
      ],
      solution: [`$${total} : ${kids} = ${each}$ caramelle a testa`],
    });
  }
  const pages = random.int(80, 300);
  const read = random.int(10, pages - 10);
  return numberItem({
    prompt: `Un libro ha ${pages} pagine. ${name} ne ha già lette ${read}. Quante pagine deve ancora leggere?`,
    value: pages - read,
    suffix: "pagine",
    errors: [{ value: pages + read, tag: "operation_choice", message: OPERATION_MESSAGE }],
    solution: [`$${pages} - ${read} = ${pages - read}$ pagine`],
  });
}

export const oneStepProblems: GeneratorFn = (random, difficulty) => {
  if (difficulty === 1) return oneStepInteger(random);
  if (difficulty === 2) {
    const book = random.int(80, 250) / 10;
    const notebook = random.int(12, 60) / 10;
    return numberItem({
      prompt: `Un libro costa ${plainNumber(book)} € e un quaderno ${plainNumber(notebook)} €. Quanto spendi comprandoli entrambi?`,
      value: book + notebook,
      suffix: "€",
      errors: [
        { value: book - notebook, tag: "operation_choice", message: "Comprando tutti e due, i prezzi si sommano." },
        { value: Math.round(book) + Math.round(notebook), tag: "decimal_alignment", message: "Incolonna le virgole: non arrotondare i prezzi." },
      ],
      solution: [`$${texNumber(book)} + ${texNumber(notebook)} = ${texNumber(book + notebook)}$ €`],
    });
  }
  const liters = random.pick([1, 1.5, 2]);
  const glass = random.pick([200, 250]);
  const glasses = (liters * 1000) / glass;
  return numberItem({
    prompt: `Una bottiglia contiene ${plainNumber(liters)} L d'acqua. Quanti bicchieri da ${glass} mL si riempiono?`,
    value: glasses,
    suffix: "bicchieri",
    errors: [{ value: liters / glass, tag: "unit_conversion", message: `Prima porta tutto alla stessa unità: ${plainNumber(liters)} L = ${liters * 1000} mL.` }],
    solution: [`$${texNumber(liters)}$ L = ${liters * 1000} mL`, `$${liters * 1000} : ${glass} = ${glasses}$ bicchieri`],
  });
};

export const multiStepProblems: GeneratorFn = (random, difficulty) => {
  const name = random.pick(NAMES);
  if (difficulty === 1) {
    const count = random.int(2, 6);
    const price = random.int(2, 6);
    const spent = count * price;
    const bill = spent < 20 ? 20 : 50;
    return numberItem({
      prompt: `${name} compra ${count} quaderni da ${price} € l'uno e paga con ${bill} €. Quanto riceve di resto?`,
      value: bill - spent,
      suffix: "€",
      errors: [
        { value: spent, tag: "stops_early", message: `${spent} € è la spesa: il resto è ${bill} − ${spent}.` },
        { value: bill - price, tag: "missing_data", message: `I quaderni sono ${count}: la spesa è $${count} \\times ${price}$.` },
      ],
      solution: [`Spesa: $${count} \\times ${price} = ${spent}$ €`, `Resto: $${bill} - ${spent} = ${bill - spent}$ €`],
    });
  }
  if (difficulty === 2) {
    const base = random.int(5, 20);
    const height = retry(random, (r) => {
      const value = r.int(3, 15);
      return value === base ? null : value;
    }, base + 2);
    const perimeter = 2 * (base + height);
    return numberItem({
      prompt: `Un rettangolo ha il perimetro di ${perimeter} cm e la base di ${base} cm. Calcola l'area.`,
      figure: { shape: "rectangle", base: `${base} cm`, height: "?" },
      label: "Area",
      value: base * height,
      unit: "cm²",
      errors: [
        { value: base * (perimeter / 2), tag: "semiperimeter", message: `Prima trova l'altezza: (${perimeter} − ${base} − ${base}) : 2.` },
        { value: base * (perimeter - base), tag: "semiperimeter", message: `Prima trova l'altezza: (${perimeter} − ${base} − ${base}) : 2.` },
        { value: height, tag: "stops_early", message: `${height} cm è l'altezza: manca l'area.` },
      ],
      solution: [
        `Semiperimetro: $${perimeter} : 2 = ${perimeter / 2}$ cm`,
        `Altezza: $${perimeter / 2} - ${base} = ${height}$ cm`,
        `Area: $${base} \\times ${height} = ${base * height}$ cm²`,
      ],
    });
  }
  const { bought, cost, sold, price } = retry(
    random,
    (r) => {
      const values = { bought: r.int(10, 40), cost: r.int(3, 9), sold: 0, price: 0 };
      values.sold = r.int(Math.ceil(values.bought / 2), values.bought - 1);
      values.price = values.cost + r.int(3, 8);
      return values.sold * values.price > values.bought * values.cost ? values : null;
    },
    { bought: 20, cost: 5, sold: 18, price: 10 },
  );
  const spent = bought * cost;
  const earned = sold * price;
  return numberItem({
    prompt: `Un negozio compra ${bought} magliette a ${cost} € l'una e le rivende a ${price} € l'una. Ne vende ${sold}. Quanto guadagna in tutto?`,
    value: earned - spent,
    suffix: "€",
    errors: [
      { value: (price - cost) * bought, tag: "missing_data", message: `Non le vende tutte: il guadagno è incasso (${sold} × ${price}) meno spesa (${bought} × ${cost}).` },
      { value: earned, tag: "stops_early", message: `${earned} € è l'incasso: va tolta la spesa.` },
      { value: (price - cost) * sold, tag: "missing_data", message: "Le magliette non vendute sono state pagate comunque: togli tutta la spesa." },
    ],
    solution: [`Spesa: $${bought} \\times ${cost} = ${spent}$ €`, `Incasso: $${sold} \\times ${price} = ${earned}$ €`, `Guadagno: $${earned} - ${spent} = ${earned - spent}$ €`],
  });
};

export const segmentProblems: GeneratorFn = (random, difficulty) => {
  if (difficulty === 1) {
    const small = random.int(5, 60);
    const diff = random.int(2, 30);
    const large = small + diff;
    const sum = small + large;
    return multiNumberItem({
      prompt: `La somma di due numeri è ${sum} e la loro differenza è ${diff}. Trova i due numeri.`,
      fields: [
        { id: "small", label: "Numero più piccolo", value: small, errors: [{ value: sum / 2, tag: "segments_method", message: `Togli prima la differenza: (${sum} − ${diff}) : 2.` }] },
        { id: "large", label: "Numero più grande", value: large, errors: [{ value: sum / 2 + diff, tag: "segments_method", message: "Il più grande è il più piccolo più la differenza." }] },
      ],
      solution: [
        `Disegno due segmenti: il più grande è lungo quanto il più piccolo più ${diff}.`,
        `Tolgo la differenza: $${sum} - ${diff} = ${sum - diff}$, sono due parti uguali`,
        `Più piccolo: $${sum - diff} : 2 = ${small}$; più grande: $${small} + ${diff} = ${large}$`,
      ],
    });
  }
  const k = random.int(2, 5);
  const unit = random.int(3, 25);
  const times = k === 2 ? "il doppio" : k === 3 ? "il triplo" : k === 4 ? "il quadruplo" : "il quintuplo";
  if (difficulty === 2) {
    const sum = unit * (k + 1);
    return multiNumberItem({
      prompt: `La somma di due numeri è ${sum} e uno è ${times} dell'altro. Trova i due numeri.`,
      fields: [
        { id: "small", label: "Numero più piccolo", value: unit, errors: [{ value: sum / k, tag: "segments_parts", message: `Se uno è ${times} dell'altro, in tutto ci sono ${k + 1} parti uguali.` }] },
        { id: "large", label: "Numero più grande", value: unit * k, errors: [{ value: sum - sum / k, tag: "segments_parts", message: `In tutto ci sono ${k + 1} parti uguali: il più grande ne prende ${k}.` }] },
      ],
      solution: [`Il più piccolo è 1 parte, il più grande ${k} parti: in tutto ${k + 1} parti.`, `Una parte: $${sum} : ${k + 1} = ${unit}$`, `Più grande: $${unit} \\times ${k} = ${unit * k}$`],
    });
  }
  const diff = unit * (k - 1);
  return multiNumberItem({
    prompt: `La differenza tra due numeri è ${diff} e uno è ${times} dell'altro. Trova i due numeri.`,
    fields: [
      { id: "small", label: "Numero più piccolo", value: unit, errors: [{ value: diff / k, tag: "segments_parts", message: `La differenza corrisponde a ${k - 1} parti, non a ${k}.` }] },
      { id: "large", label: "Numero più grande", value: unit * k, errors: [{ value: diff * k, tag: "segments_parts", message: "Prima trova una parte: la differenza vale k − 1 parti." }] },
    ],
    solution: [`Il più grande ha ${k - 1} parti in più del piccolo: la differenza vale ${k - 1} parti.`, `Una parte: $${diff} : ${k - 1} = ${unit}$`, `Più grande: $${unit} \\times ${k} = ${unit * k}$`],
  });
};

const PLANS: Array<{ text: (random: Random) => string; steps: string[] }> = [
  {
    text: (r) => {
      const base = r.int(8, 20);
      return `Un giardino rettangolare ha l'area di ${base * r.int(4, 12)} m² e la base di ${base} m. Si vuole recintarlo con una rete che costa ${r.int(3, 9)} € al metro. Quanto si spende?`;
    },
    steps: ["Calcolo l'altezza: area : base", "Calcolo il perimetro: 2 × (base + altezza)", "Calcolo il costo: perimetro × prezzo al metro", "Scrivo la risposta con una frase"],
  },
  {
    text: (r) => `Un rettangolo ha il perimetro di ${r.int(20, 60) * 2} cm e la base di ${r.int(5, 15)} cm. Calcola l'area.`,
    steps: ["Calcolo il semiperimetro: perimetro : 2", "Calcolo l'altezza: semiperimetro − base", "Calcolo l'area: base × altezza", "Scrivo la risposta con l'unità di misura"],
  },
  {
    text: (r) => `Compri ${r.int(2, 6)} quaderni da ${r.int(2, 5)} € e una penna da ${r.int(1, 3)} €. Paghi con 20 €. Quanto ricevi di resto?`,
    steps: ["Calcolo il costo dei quaderni: quantità × prezzo", "Aggiungo il prezzo della penna", "Calcolo il resto: 20 € − spesa", "Scrivo la risposta con una frase"],
  },
  {
    text: (r) => `Una felpa costa ${r.int(2, 8) * 10} € ed è scontata del ${r.pick([10, 20, 25])}%. Quanto si paga?`,
    steps: ["Calcolo lo sconto: prezzo : 100 × percentuale", "Tolgo lo sconto dal prezzo", "Scrivo la risposta con una frase"],
  },
  {
    text: (r) => `Un triangolo isoscele ha il perimetro di ${r.int(20, 50)} cm e la base di ${r.int(6, 12)} cm. Calcola la lunghezza di ciascun lato obliquo.`,
    steps: ["Tolgo la base dal perimetro", "Divido il risultato per 2 (i lati obliqui sono uguali)", "Scrivo la risposta con l'unità di misura"],
  },
];

export const planningProblems: GeneratorFn = (random, difficulty) => {
  const pool = difficulty === 1 ? PLANS.filter((plan) => plan.steps.length === 3) : PLANS.filter((plan) => plan.steps.length === 4);
  const plan = random.pick(pool);
  const ids = ["p1", "p2", "p3", "p4"];
  return orderItem({
    prompt: `Non fare i calcoli: metti in ordine i passi per risolvere il problema. ${plan.text(random)}`,
    steps: plan.steps.map((text, index) => ({ id: ids[index], text })),
    solution: plan.steps.map((text, index) => `${index + 1}. ${text}`),
  });
};

const MISSING = [
  {
    text: (r: Random) => `Un'auto percorre ${r.int(10, 60) * 10} km. Quanti litri di benzina consuma?`,
    missing: "Quanti km fa con un litro di benzina",
    distractors: ["La velocità dell'auto", "Il colore dell'auto", "Quante persone ci sono in auto"],
  },
  {
    text: (r: Random) => `${r.pick(NAMES)} compra ${r.int(2, 9)} quaderni. Quanto spende?`,
    missing: "Il prezzo di un quaderno",
    distractors: ["Il colore dei quaderni", "Quante pagine ha un quaderno", "In che negozio li compra"],
  },
  {
    text: (r: Random) => `Un rettangolo ha la base di ${r.int(4, 20)} cm. Calcola l'area.`,
    missing: "L'altezza del rettangolo",
    distractors: ["La diagonale del rettangolo", "Il colore del rettangolo", "Il perimetro di un quadrato"],
  },
  {
    text: (r: Random) => `Un treno parte alle ${r.int(7, 18)}:00 da Milano. A che ora arriva a Roma?`,
    missing: "Quanto dura il viaggio",
    distractors: ["Quanti vagoni ha il treno", "Quante persone ci sono sul treno", "Il prezzo del biglietto"],
  },
];

const EXTRA = [
  {
    text: (r: Random) => `${r.pick(NAMES)} ha ${r.int(12, 15)} anni e compra 3 gelati da 2 €. Quanto spende?`,
    extra: "L'età",
    needed: ["Il numero di gelati", "Il prezzo di un gelato"],
  },
  {
    text: (r: Random) => `Un rettangolo rosso ha la base di ${r.int(5, 12)} cm e l'altezza di ${r.int(2, 9)} cm. Calcola l'area.`,
    extra: "Il colore",
    needed: ["La base", "L'altezza"],
  },
  {
    text: (r: Random) => `Una classe di ${r.int(20, 28)} alunni va in gita in pullman. Il biglietto costa ${r.int(8, 15)} € a testa e il viaggio dura 2 ore. Quanto spende la classe in tutto?`,
    extra: "La durata del viaggio",
    needed: ["Il numero di alunni", "Il prezzo del biglietto"],
  },
];

export const missingDataProblems: GeneratorFn = (random, difficulty) => {
  if (difficulty === 1) {
    const problem = random.pick(MISSING);
    const { options, correctId, idOf } = distinctOptions(random, problem.missing, problem.distractors);
    return choiceItem({
      prompt: `${problem.text(random)} Quale dato manca per risolvere il problema?`,
      options,
      correct: correctId,
      errors: problem.distractors.map((text) => ({
        option: idOf(text),
        tag: "missing_data_wrong",
        message: "Rileggi la domanda: quale numero ti servirebbe per fare il calcolo?",
      })),
      solution: [`Per rispondere serve: ${problem.missing.toLowerCase()}.`, "Senza questo dato non si può calcolare: prima di fare conti, controlla di avere tutto."],
    });
  }
  if (difficulty === 2) {
    const problem = random.pick(EXTRA);
    const { options, correctId, idOf } = distinctOptions(random, problem.extra, problem.needed);
    return choiceItem({
      prompt: `${problem.text(random)} Quale dato NON serve per risolvere il problema?`,
      options,
      correct: correctId,
      errors: problem.needed.map((text) => ({ option: idOf(text), tag: "extra_data", message: "Questo dato serve: prova a scrivere il piano dei calcoli." })),
      solution: [`I dati che servono sono: ${problem.needed.join(" e ").toLowerCase()}.`, `${problem.extra} non entra in nessun calcolo.`],
    });
  }
  const problem = random.pick(MISSING);
  const text = problem.text(random);
  const numbers = (text.match(/\d+/g) ?? []).map(Number);
  const first = numbers[0] ?? 100;
  const answer = "Non si può calcolare: manca un dato";
  const fakes = [`${plainNumber(first / 10)}`, `${plainNumber(first * 2)}`, `${plainNumber(first / 2)}`];
  const { options, correctId, idOf } = distinctOptions(random, answer, fakes);
  return choiceItem({
    prompt: `${text} Scegli la risposta corretta.`,
    options,
    correct: correctId,
    errors: fakes.map((fake) => ({
      option: idOf(fake),
      tag: "invents_calculation",
      message: "Prima di calcolare controlla di avere tutti i dati: qui ne manca uno.",
    })),
    solution: [`Manca: ${problem.missing.toLowerCase()}.`, "Con i dati del testo non si può arrivare alla risposta."],
  });
};
