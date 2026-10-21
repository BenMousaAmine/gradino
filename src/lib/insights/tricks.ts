import type { AnswerRow, EventRow } from "@/lib/admin/metrics";

export type Trick = {
  id: string;
  title: string;
  body: string;
  example?: string;
  skills: readonly string[];
  tags: readonly string[];
  lowAccuracy?: boolean;
};

export const TRICKS: readonly Trick[] = [
  {
    id: "decimal-columns",
    title: "Virgola sotto virgola + zeri fantasma",
    body: "Incolonna le virgole una sotto l’altra e aggiungi gli zeri che mancano: $59{,}8 \\to 59{,}80$. Poi calcola come con i numeri interi.",
    example: "$4{,}42 + 59{,}80 = 64{,}22$",
    skills: ["math.calc.decimals", "math.frac.decimals"],
    tags: ["decimal_alignment"],
  },
  {
    id: "decimal-carry",
    title: "Il riporto salta la virgola",
    body: "Riporti e prestiti si fanno come se la virgola non ci fosse: la rimetti solo alla fine, sotto le altre virgole.",
    example: "$43{,}80 - 5{,}93$: fai $4380 - 593 = 3787$, poi rimetti la virgola: $37{,}87$",
    skills: ["math.calc.decimals"],
    tags: [],
    lowAccuracy: true,
  },
  {
    id: "order-of-operations",
    title: "Pa-Po-Mo-Ad",
    body: "Prima le Parentesi, poi le Potenze, poi Moltiplicazioni e divisioni, infine Addizioni e sottrazioni, da sinistra a destra.",
    example: "$2 + 3 \\times 4 = 2 + 12 = 14$, non $20$",
    skills: ["math.calc.order-of-operations", "math.frac.expressions", "math.int.add-sub", "math.int.mul-div"],
    tags: ["order_of_operations", "ignores_parentheses"],
  },
  {
    id: "proportions-cross",
    title: "In croce",
    body: "In una proporzione moltiplica in croce: medi per medi = estremi per estremi. Poi dividi per il numero che sta con la $x$.",
    example: "$4 : 7 = 12 : x \\Rightarrow 4 \\cdot x = 7 \\cdot 12 \\Rightarrow x = 84 : 4 = 21$",
    skills: ["math.ratio.proportions", "math.prop.direct", "math.prop.inverse"],
    tags: ["proportion_property", "proportion_mean_no_root", "inverse_as_direct"],
    lowAccuracy: true,
  },
  {
    id: "problem-keywords",
    title: "Parole spia",
    body: "Prima di calcolare cerca le parole spia: “in tutto”, “insieme” → +; “quanto resta”, “differenza”, “in più” → −; “ciascuno”, “ognuno” → ÷; “ogni… quanti in tutto” → ×.",
    skills: [
      "math.ps.one-step",
      "math.ps.multi-step",
      "math.ps.segments",
      "math.ps.planning",
      "math.ps.missing-data",
      "math.ratio.percent-problems",
      "math.frac.inverse-problems",
    ],
    tags: ["operation_choice"],
    lowAccuracy: true,
  },
  {
    id: "simplify-last",
    title: "Ultimo controllo: semplifica",
    body: "Prima di confermare una frazione chiediti: posso dividere sopra e sotto per lo stesso numero? Se sì, fallo finché non si può più.",
    example: "$\\frac{6}{8} = \\frac{3}{4}$",
    skills: ["math.frac.simplify", "math.frac.add-sub", "math.frac.mul-div", "math.frac.expressions"],
    tags: ["not_simplified", "simplify_one_side"],
  },
  {
    id: "power-same-base",
    title: "Base uguale? Gli esponenti si sommano",
    body: "Quando moltiplichi potenze con la stessa base, la base resta quella e gli esponenti si sommano. Nella divisione si sottraggono.",
    example: "$2^3 \\cdot 2^4 = 2^7$, non $4^7$",
    skills: ["math.pow.properties", "math.int.powers"],
    tags: ["power_product_multiply_bases", "power_product_multiply_exponents", "power_quotient_add"],
  },
  {
    id: "root-inside-first",
    title: "Prima dentro, poi la radice",
    body: "La radice di una somma non è la somma delle radici: prima calcola quello che c’è sotto la radice, poi fai la radice.",
    example: "$\\sqrt{9 + 16} = \\sqrt{25} = 5$, non $3 + 4$",
    skills: ["math.pow.square-root", "math.pyth.theorem"],
    tags: ["root_of_sum", "root_as_half"],
  },
  {
    id: "factor-to-one",
    title: "Scomponi fino a 1",
    body: "Dividi per 2 finché puoi, poi per 3, 5, 7… Ti fermi solo quando arrivi a 1: ogni divisore che hai usato è un fattore primo.",
    example: "$60 = 2^2 \\cdot 3 \\cdot 5$",
    skills: ["math.div.prime-factorization", "math.div.gcd", "math.div.lcm"],
    tags: ["incomplete_factorization"],
  },
  {
    id: "compare-same-denominator",
    title: "Stesso denominatore, poi confronta",
    body: "Per confrontare due frazioni portale allo stesso denominatore: poi è più grande quella con il numeratore più grande.",
    example: "$\\frac{2}{3}$ e $\\frac{3}{4}$: $\\frac{8}{12} < \\frac{9}{12}$",
    skills: ["math.frac.compare"],
    tags: ["compare_fractions", "equivalent_fractions"],
  },
  {
    id: "times-table-neighbor",
    title: "Tabelline: parti dal vicino",
    body: "Se non ricordi una tabellina, parti da una che sai e aggiungi o togli.",
    example: "$7 \\times 8 = 7 \\times 7 + 7 = 49 + 7 = 56$",
    skills: ["math.calc.times-tables"],
    tags: ["times_tables_not_automatic", "times_table_neighbor"],
  },
  {
    id: "eng-third-person-s",
    title: "He / She / It → la -s",
    body: "Al present simple, con he, she, it il verbo prende la -s.",
    example: "I play → she plays · I watch → he watches",
    skills: ["english.verbs.present-simple"],
    tags: ["eng_third_person_s"],
  },
  {
    id: "eng-did-base",
    title: "Did + verbo base",
    body: "Dopo did, didn’t, does, doesn’t il verbo torna alla forma base: il tempo lo porta già l’ausiliare.",
    example: "Did you go? (non: Did you went?)",
    skills: [
      "english.verbs.present-simple",
      "english.verbs.past-simple-regular",
      "english.verbs.irregular-1",
      "english.verbs.irregular-2",
      "english.verbs.irregular-3",
    ],
    tags: ["eng_bare_after_did", "eng_bare_after_aux", "eng_past_did", "eng_missing_aux"],
  },
  {
    id: "eng-irregular-no-ed",
    title: "Irregolari: niente -ed",
    body: "I verbi irregolari al passato non prendono -ed: hanno una forma tutta loro, da imparare a memoria.",
    example: "go → went (non goed) · see → saw",
    skills: ["english.verbs.irregular-1", "english.verbs.irregular-2", "english.verbs.irregular-3"],
    tags: ["eng_irregular_regularized"],
  },
  {
    id: "eng-false-friends",
    title: "Attento ai falsi amici",
    body: "Alcune parole sembrano italiane ma vogliono dire altro: se ti sembra troppo facile, fermati e ricontrolla.",
    example: "library = biblioteca · camera = macchina fotografica",
    skills: ["english.words.false-friends", "english.words.cognates"],
    tags: ["eng_false_friend"],
  },
  {
    id: "eng-tense-signals",
    title: "Parole spia dei tempi",
    body: "Guarda le parole spia: yesterday, last, ago → passato; now, at the moment → -ing; every day, usually → present simple.",
    skills: ["english.tenses.signal-words", "english.verbs.present-continuous", "english.verbs.present-simple"],
    tags: ["eng_tense_signal", "eng_forms_swapped"],
  },
  {
    id: "eng-question-first",
    title: "Leggi prima la domanda",
    body: "Prima leggi le domande, poi il testo: così sai già cosa cercare. Nell’ascolto, leggi le domande prima di premere play.",
    skills: ["english.reading.a1", "english.reading.a2", "english.listening.a1", "english.listening.a2"],
    tags: ["eng_task_check", "eng_task_threshold"],
    lowAccuracy: true,
  },
  {
    id: "eng-dialogue-reply",
    title: "Rispondi a quello che ti chiedono",
    body: "Nei dialoghi guarda la domanda: a “How are you?” dici come stai, a “Where…?” un luogo, a “When…?” un momento.",
    example: "How are you? → I’m fine, thanks.",
    skills: ["english.writing.dialogue"],
    tags: ["eng_dialogue_reply"],
  },
  {
    id: "eng-email-phrases",
    title: "Le frasi fisse delle email",
    body: "Un’email ha sempre un inizio e una fine fissi: Dear … all’inizio, Best wishes, oppure See you soon! alla fine, poi il tuo nome.",
    skills: ["english.writing.email"],
    tags: ["eng_email_phrase"],
  },
];

const RECENT = 10;
const MIN_SAMPLE = 5;
const LOW_ACCURACY = 80;

const byId = new Map(TRICKS.map((trick) => [trick.id, trick]));

const hasTag = (trick: Trick, answer: AnswerRow) => answer.errorTag !== null && trick.tags.includes(answer.errorTag);

const related = (trick: Trick, answers: readonly AnswerRow[]) =>
  answers.filter((answer) => trick.skills.includes(answer.skillId) || hasTag(trick, answer));

const rate = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : null);

function isActive(trick: Trick, answers: readonly AnswerRow[]): boolean {
  const recent = [...related(trick, answers)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, RECENT);
  if (recent.some((answer) => hasTag(trick, answer))) return true;
  const accuracy = rate(recent.filter((answer) => answer.score === 1).length, recent.length);
  return Boolean(trick.lowAccuracy) && recent.length >= 3 && accuracy !== null && accuracy < LOW_ACCURACY;
}

export function activeTricks(answers: readonly AnswerRow[]): string[] {
  return TRICKS.filter((trick) => isActive(trick, answers)).map((trick) => trick.id);
}

export function trickById(id: string): Trick | null {
  return byId.get(id) ?? null;
}

export function trickForSkill(active: readonly string[], skillId: string): Trick | null {
  return TRICKS.find((trick) => active.includes(trick.id) && trick.skills.includes(skillId)) ?? null;
}

export function trickForTag(tag: string | null | undefined): Trick | null {
  return tag ? (TRICKS.find((trick) => trick.tags.includes(tag)) ?? null) : null;
}

export type Period = { answers: number; accuracy: number | null; errorRate: number | null };

export type TrickProgress = {
  id: string;
  title: string;
  active: boolean;
  shown: number;
  firstShown: string | null;
  before: Period;
  after: Period;
  verdict: "migliora" | "stabile" | "peggiora" | "pochi dati" | "superato" | "non ancora mostrato";
};

function period(trick: Trick, answers: readonly AnswerRow[]): Period {
  return {
    answers: answers.length,
    accuracy: rate(answers.filter((answer) => answer.score === 1).length, answers.length),
    errorRate: trick.tags.length > 0 ? rate(answers.filter((answer) => hasTag(trick, answer)).length, answers.length) : null,
  };
}

function verdict(active: boolean, shown: number, before: Period, after: Period): TrickProgress["verdict"] {
  if (shown === 0) return "non ancora mostrato";
  if (!active) return "superato";
  if (before.answers < MIN_SAMPLE || after.answers < MIN_SAMPLE || before.accuracy === null || after.accuracy === null) return "pochi dati";
  const change = after.accuracy - before.accuracy;
  return change >= 10 ? "migliora" : change <= -10 ? "peggiora" : "stabile";
}

export function trickProgress(answers: readonly AnswerRow[], events: readonly EventRow[]): TrickProgress[] {
  const active = new Set(activeTricks(answers));
  const shows = events.filter((event) => event.type === "coach" && event.payload.kind === "trick" && event.payload.action === "shown");
  return TRICKS.flatMap((trick) => {
    const mine = shows.filter((event) => event.payload.trick === trick.id).map((event) => event.createdAt).sort();
    if (mine.length === 0 && !active.has(trick.id)) return [];
    const firstShown = mine[0] ?? null;
    const all = related(trick, answers);
    const before = period(trick, firstShown ? all.filter((answer) => answer.createdAt < firstShown) : all);
    const after = period(trick, firstShown ? all.filter((answer) => answer.createdAt >= firstShown) : []);
    return [
      {
        id: trick.id,
        title: trick.title,
        active: active.has(trick.id),
        shown: mine.length,
        firstShown,
        before,
        after,
        verdict: verdict(active.has(trick.id), mine.length, before, after),
      },
    ];
  });
}
