import { textItem, type GeneratorFn, type TextError } from "./build";
import type { Random } from "./random";

type Rule = "s" | "es" | "ies" | "ys" | "has";

type Verb = { base: string; third: string; rule: Rule; rest: readonly string[]; timed: boolean };

type Person = { text: string; inner: string; third: boolean };

const VERBS: readonly Verb[] = [
  { base: "play", third: "plays", rule: "ys", rest: ["football", "the guitar", "video games", "tennis"], timed: true },
  { base: "like", third: "likes", rule: "s", rest: ["pizza", "music", "cats", "horror films"], timed: false },
  { base: "eat", third: "eats", rule: "s", rest: ["pasta", "a lot of fruit", "breakfast at seven"], timed: true },
  { base: "read", third: "reads", rule: "s", rest: ["comics", "books in English"], timed: true },
  { base: "drink", third: "drinks", rule: "s", rest: ["milk", "a lot of water"], timed: true },
  { base: "live", third: "lives", rule: "s", rest: ["in Rome", "near the school"], timed: false },
  { base: "speak", third: "speaks", rule: "s", rest: ["English", "three languages"], timed: false },
  { base: "love", third: "loves", rule: "s", rest: ["animals", "chocolate"], timed: false },
  { base: "walk", third: "walks", rule: "s", rest: ["to school", "in the park"], timed: true },
  { base: "ride", third: "rides", rule: "s", rest: ["a bike", "a horse"], timed: true },
  { base: "listen", third: "listens", rule: "s", rest: ["to music", "to the radio"], timed: true },
  { base: "sleep", third: "sleeps", rule: "s", rest: ["on the sofa", "a lot"], timed: true },
  { base: "work", third: "works", rule: "s", rest: ["in a shop", "in a hospital"], timed: true },
  { base: "cook", third: "cooks", rule: "s", rest: ["dinner", "pasta"], timed: true },
  { base: "watch", third: "watches", rule: "es", rest: ["TV", "films", "football on TV"], timed: true },
  { base: "go", third: "goes", rule: "es", rest: ["to school", "to the gym", "to bed at ten"], timed: true },
  { base: "do", third: "does", rule: "es", rest: ["homework", "judo"], timed: true },
  { base: "wash", third: "washes", rule: "es", rest: ["the dishes", "the car"], timed: true },
  { base: "finish", third: "finishes", rule: "es", rest: ["school at two", "work at six"], timed: true },
  { base: "catch", third: "catches", rule: "es", rest: ["the bus", "the train"], timed: true },
  { base: "teach", third: "teaches", rule: "es", rest: ["English", "maths"], timed: true },
  { base: "fix", third: "fixes", rule: "es", rest: ["bikes", "computers"], timed: true },
  { base: "miss", third: "misses", rule: "es", rest: ["the bus", "the train"], timed: true },
  { base: "study", third: "studies", rule: "ies", rest: ["English", "history", "in the library"], timed: true },
  { base: "fly", third: "flies", rule: "ies", rest: ["kites"], timed: true },
  { base: "carry", third: "carries", rule: "ies", rest: ["a big bag", "the shopping"], timed: true },
  { base: "tidy", third: "tidies", rule: "ies", rest: ["the kitchen", "the garden"], timed: true },
  { base: "try", third: "tries", rule: "ies", rest: ["new food"], timed: true },
  { base: "enjoy", third: "enjoys", rule: "ys", rest: ["football", "films"], timed: true },
  { base: "buy", third: "buys", rule: "ys", rest: ["bread", "new clothes"], timed: true },
  { base: "stay", third: "stays", rule: "ys", rest: ["at home", "with friends"], timed: true },
  { base: "have", third: "has", rule: "has", rest: ["a dog", "two sisters", "a big house"], timed: false },
];

const THIRD_PERSONS: readonly Person[] = [
  { text: "She", inner: "she", third: true },
  { text: "He", inner: "he", third: true },
  { text: "Tom", inner: "Tom", third: true },
  { text: "Anna", inner: "Anna", third: true },
  { text: "My brother", inner: "my brother", third: true },
  { text: "My sister", inner: "my sister", third: true },
  { text: "Our teacher", inner: "our teacher", third: true },
];

const OTHER_PERSONS: readonly Person[] = [
  { text: "I", inner: "I", third: false },
  { text: "You", inner: "you", third: false },
  { text: "We", inner: "we", third: false },
  { text: "They", inner: "they", third: false },
  { text: "My parents", inner: "my parents", third: false },
  { text: "Tom and Anna", inner: "Tom and Anna", third: false },
];

const TIMES = ["every day", "every Saturday", "on Mondays", "at the weekend", "after school", "in the evening", "every morning"];

function person(random: Random, thirdChance: number): Person {
  return random.chance(thirdChance) ? random.pick(THIRD_PERSONS) : random.pick(OTHER_PERSONS);
}

function tail(random: Random, verb: Verb): string {
  const rest = random.pick(verb.rest);
  return verb.timed ? `${rest} ${random.pick(TIMES)}` : rest;
}

const RULE_TEXT: Record<Rule, (verb: Verb) => string> = {
  s: (verb) => `Basta aggiungere la -s: ${verb.base} → ${verb.third}.`,
  es: (verb) => `Dopo -ch, -sh, -ss, -x e -o si aggiunge -es: ${verb.base} → ${verb.third}.`,
  ies: (verb) => `Consonante + y: la y diventa -ies. ${verb.base} → ${verb.third}.`,
  ys: (verb) => `Vocale + y: basta aggiungere la -s. ${verb.base} → ${verb.third}.`,
  has: () => `"have" è speciale: con he, she, it diventa "has".`,
};

function spellingErrors(verb: Verb): TextError[] {
  if (verb.rule === "es" || verb.rule === "ies") {
    return [{ answers: [`${verb.base}s`], tag: `eng_${verb.rule}_rule`, message: RULE_TEXT[verb.rule](verb) }];
  }
  if (verb.rule === "ys") {
    return [{ answers: [`${verb.base.slice(0, -1)}ies`], tag: "eng_vowel_y", message: RULE_TEXT.ys(verb) }];
  }
  if (verb.rule === "has") {
    return [{ answers: ["haves", "have"], tag: "eng_has", message: RULE_TEXT.has(verb) }];
  }
  return [];
}

function missingS(verb: Verb, who: Person): TextError {
  return {
    answers: [verb.base],
    tag: "eng_third_person_s",
    message: `He, she, it: la S ci sta! Con "${who.inner}" il verbo vuole la -s: ${verb.third}.`,
  };
}

function extraS(verb: Verb, who: Person): TextError {
  return {
    answers: [verb.third],
    tag: "eng_s_only_third",
    message: `La -s va solo con he, she, it. Con "${who.inner}" il verbo resta ${verb.base}.`,
  };
}

function whoText(who: Person): string {
  return who.third ? `"${who.inner}" è come he, she o it` : `"${who.inner}" non è he, she o it`;
}

function affirmative(random: Random, verbs: readonly Verb[], thirdChance: number) {
  const verb = random.pick(verbs);
  const who = person(random, thirdChance);
  const rest = tail(random, verb);
  const form = who.third ? verb.third : verb.base;
  const sentence = `${who.text} ${form} ${rest}.`;
  return { verb, who, rest, form, sentence };
}

const presentSimpleBase: GeneratorFn = (random) => {
  const { verb, who, rest, form, sentence } = affirmative(
    random,
    VERBS.filter((verb) => verb.rule === "s" || verb.rule === "ys"),
    0.7,
  );
  return textItem({
    prompt: `Completa con il verbo giusto: ${who.text} ___ (${verb.base}) ${rest}.`,
    fields: [
      {
        id: "verb",
        label: "",
        placeholder: "il verbo",
        accept: [form],
        errors: who.third ? [...spellingErrors(verb), missingS(verb, who)] : [extraS(verb, who)],
      },
    ],
    solution: [
      `Il soggetto: ${whoText(who)}.`,
      who.third ? `He, she, it: la S ci sta. ${RULE_TEXT[verb.rule](verb)}` : `Niente -s: il verbo resta ${verb.base}.`,
      sentence,
    ],
  });
};

const presentSimpleSpelling: GeneratorFn = (random) => {
  const { verb, who, rest, form, sentence } = affirmative(
    random,
    VERBS.filter((verb) => verb.rule !== "s"),
    0.85,
  );
  const errors = who.third ? [...spellingErrors(verb), missingS(verb, who)] : [extraS(verb, who)];
  const solution = [
    `Il soggetto: ${whoText(who)}.`,
    who.third ? RULE_TEXT[verb.rule](verb) : `Niente -s: il verbo resta ${verb.base}.`,
    sentence,
  ];
  if (who.third && random.chance(0.3)) {
    return textItem({
      prompt: "Ascolta la frase e scrivi il verbo che senti.",
      audio: { text: sentence, lang: "en-GB" },
      fields: [{ id: "verb", label: "", placeholder: "il verbo", accept: [form], errors }],
      solution,
    });
  }
  return textItem({
    prompt: `Completa con il verbo giusto: ${who.text} ___ (${verb.base}) ${rest}.`,
    fields: [{ id: "verb", label: "", placeholder: "il verbo", accept: [form], errors }],
    solution,
  });
};

function negative(random: Random) {
  const verb = random.pick(VERBS);
  const who = person(random, 0.65);
  const rest = tail(random, verb);
  const aux = who.third ? "doesn't" : "don't";
  const wrongAux = who.third ? "don't" : "doesn't";
  return textItem({
    prompt: `Completa con la forma negativa: ${who.text} ___ (not / ${verb.base}) ${rest}.`,
    fields: [
      {
        id: "verb",
        label: "",
        placeholder: "ausiliare + verbo",
        accept: [`${aux} ${verb.base}`],
        errors: [
          {
            answers: [`${aux} ${verb.third}`],
            tag: "eng_bare_after_aux",
            message: `Do e does si prendono la fatica: dopo ${aux} il verbo torna nudo → ${aux} ${verb.base}.`,
          },
          {
            answers: [`${wrongAux} ${verb.base}`, `${wrongAux} ${verb.third}`],
            tag: who.third ? "eng_doesnt_third" : "eng_dont_others",
            message: who.third
              ? `Con he, she, it si usa doesn't: ${who.inner} doesn't ${verb.base}.`
              : `Con "${who.inner}" si usa don't: ${who.inner} don't ${verb.base}.`,
          },
          {
            answers: [`not ${verb.base}`, `not ${verb.third}`, `${verb.base} not`, `${verb.third} not`],
            tag: "eng_missing_aux",
            message: `Per dire "non" in inglese serve l'ausiliare: ${aux} + verbo → ${aux} ${verb.base}.`,
          },
        ],
      },
    ],
    solution: [
      `Il soggetto: ${whoText(who)} → si usa ${aux}.`,
      `Dopo ${aux} il verbo torna nudo: ${verb.base}.`,
      `${who.text} ${aux} ${verb.base} ${rest}.`,
    ],
  });
}

function question(random: Random) {
  const verb = random.pick(VERBS);
  const who = person(random, 0.65);
  const rest = tail(random, verb);
  const aux = who.third ? "Does" : "Do";
  return textItem({
    prompt: `Completa la domanda: ___ ${who.inner} ___ (${verb.base}) ${rest}?`,
    fields: [
      {
        id: "aux",
        label: "1ª parola",
        placeholder: "Do o Does?",
        accept: [aux],
        errors: [
          who.third
            ? { answers: ["Do"], tag: "eng_does_question", message: "Con he, she, it la domanda inizia con Does." }
            : { answers: ["Does"], tag: "eng_do_question", message: `Con "${who.inner}" la domanda inizia con Do.` },
          {
            answers: ["Is", "Are", "Am"],
            tag: "eng_be_question",
            message: "Con i verbi normali la domanda si fa con Do o Does, non con is/are.",
          },
        ],
      },
      {
        id: "verb",
        label: "2ª parola",
        placeholder: "il verbo",
        accept: [verb.base],
        errors: [
          {
            answers: [verb.third],
            tag: "eng_bare_after_aux",
            message: `Do e does si prendono la fatica: il verbo torna nudo → ${verb.base}.`,
          },
        ],
      },
    ],
    solution: [
      `Il soggetto: ${whoText(who)} → la domanda inizia con ${aux}.`,
      `Dopo ${aux} il verbo torna nudo: ${verb.base}.`,
      `${aux} ${who.inner} ${verb.base} ${rest}?`,
    ],
  });
}

export const presentSimple: GeneratorFn = (random, difficulty) => {
  if (difficulty === 1) return presentSimpleBase(random, difficulty);
  if (difficulty === 2) return presentSimpleSpelling(random, difficulty);
  return random.chance(0.5) ? negative(random) : question(random);
};

type BePerson = Person & { be: "am" | "is" | "are" };

const BE_PERSONS: readonly BePerson[] = [
  { text: "I", inner: "I", third: false, be: "am" },
  ...THIRD_PERSONS.map((who) => ({ ...who, be: "is" as const })),
  ...OTHER_PERSONS.filter((who) => who.inner !== "I").map((who) => ({ ...who, be: "are" as const })),
];

const BE_PLACES = ["happy", "tired", "hungry", "at school", "in the kitchen", "from Italy", "late", "good at football", "in the garden"];

const BE_TEXT = {
  am: "Con I si usa sempre am: I am.",
  is: "Con he, she, it (una persona o una cosa sola) si usa is.",
  are: "Con you, we, they (e con più persone) si usa are.",
} as const;

function bePerson(random: Random): BePerson {
  const roll = random.next();
  if (roll < 0.2) return BE_PERSONS[0];
  return random.pick(BE_PERSONS.slice(1));
}

function beFormErrors(who: BePerson, suffix = ""): TextError {
  const others = (["am", "is", "are"] as const).filter((form) => form !== who.be);
  return {
    answers: others.map((form) => `${form}${suffix}`),
    tag: "eng_be_form",
    message: `${BE_TEXT[who.be]} → ${who.inner} ${who.be}${suffix}.`,
  };
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const toBe: GeneratorFn = (random, difficulty) => {
  const who = bePerson(random);
  const place = random.pick(BE_PLACES);
  if (difficulty === 1) {
    return textItem({
      prompt: `Completa con am, is o are: ${who.text} ___ ${place}.`,
      fields: [{ id: "verb", label: "", placeholder: "am, is o are", accept: [who.be], errors: [beFormErrors(who), { answers: ["be"], tag: "eng_be_base", message: `"be" è la forma base: va coniugato → ${who.be}.` }] }],
      solution: [BE_TEXT[who.be], `${who.text} ${who.be} ${place}.`],
    });
  }
  if (difficulty === 2) {
    return textItem({
      prompt: `Completa con la forma negativa: ${who.text} ___ (not) ${place}.`,
      fields: [
        {
          id: "verb",
          label: "",
          placeholder: "ausiliare + not",
          accept: [`${who.be} not`],
          errors: [
            beFormErrors(who, " not"),
            {
              answers: ["doesn't", "don't", "not", "no", "doesn't be", "don't be"],
              tag: "eng_be_no_do",
              message: `Con to be non serve do/does: basta aggiungere not → ${who.inner} ${who.be} not${who.be === "am" ? "" : ` (${who.be}n't)`}.`,
            },
          ],
        },
      ],
      solution: [BE_TEXT[who.be], "Per la negazione basta aggiungere not dopo am/is/are, senza do.", `${who.text} ${who.be} not ${place}.`],
    });
  }
  const aux = capitalize(who.be);
  return textItem({
    prompt: `Completa la domanda: ___ ${who.inner} ${place}?`,
    fields: [
      {
        id: "verb",
        label: "",
        placeholder: "Am, Is o Are?",
        accept: [aux],
        errors: [
          { ...beFormErrors(who), answers: (["Am", "Is", "Are"] as const).filter((form) => form !== aux) },
          { answers: ["Do", "Does"], tag: "eng_be_no_do", message: `Con to be la domanda si fa scambiando di posto: ${aux} ${who.inner}…?` },
        ],
      },
    ],
    solution: [BE_TEXT[who.be], "Nella domanda am/is/are va prima del soggetto.", `${aux} ${who.inner} ${place}?`],
  });
};

type IngRule = "plain" | "drop-e" | "double";

type IngVerb = { base: string; ing: string; rule: IngRule; rest: readonly string[] };

const ING_VERBS: readonly IngVerb[] = [
  { base: "play", ing: "playing", rule: "plain", rest: ["football", "video games"] },
  { base: "read", ing: "reading", rule: "plain", rest: ["a book", "a comic"] },
  { base: "eat", ing: "eating", rule: "plain", rest: ["a sandwich", "pizza"] },
  { base: "watch", ing: "watching", rule: "plain", rest: ["TV", "a film"] },
  { base: "study", ing: "studying", rule: "plain", rest: ["English", "for the test"] },
  { base: "listen", ing: "listening", rule: "plain", rest: ["to music"] },
  { base: "cook", ing: "cooking", rule: "plain", rest: ["dinner"] },
  { base: "sleep", ing: "sleeping", rule: "plain", rest: ["on the sofa"] },
  { base: "make", ing: "making", rule: "drop-e", rest: ["a cake", "a video"] },
  { base: "write", ing: "writing", rule: "drop-e", rest: ["an email", "a story"] },
  { base: "ride", ing: "riding", rule: "drop-e", rest: ["a bike"] },
  { base: "dance", ing: "dancing", rule: "drop-e", rest: ["in the kitchen"] },
  { base: "have", ing: "having", rule: "drop-e", rest: ["lunch", "a shower"] },
  { base: "run", ing: "running", rule: "double", rest: ["in the park"] },
  { base: "swim", ing: "swimming", rule: "double", rest: ["in the sea"] },
  { base: "sit", ing: "sitting", rule: "double", rest: ["on the bench"] },
  { base: "shop", ing: "shopping", rule: "double", rest: ["with friends"] },
  { base: "get", ing: "getting", rule: "double", rest: ["dressed"] },
];

const NOW_WORDS = ["now", "at the moment", "right now"];

const ING_TEXT: Record<IngRule, (verb: IngVerb) => string> = {
  plain: (verb) => `Si aggiunge -ing: ${verb.base} → ${verb.ing}.`,
  "drop-e": (verb) => `Se il verbo finisce in -e, la e cade: ${verb.base} → ${verb.ing}.`,
  double: (verb) => `Verbo corto con consonante + vocale + consonante: si raddoppia l'ultima → ${verb.ing}.`,
};

function ingSpelling(verb: IngVerb, prefix: string): TextError[] {
  if (verb.rule === "drop-e") return [{ answers: [`${prefix}${verb.base}ing`], tag: "eng_ing_drop_e", message: ING_TEXT["drop-e"](verb) }];
  if (verb.rule === "double") return [{ answers: [`${prefix}${verb.base}ing`], tag: "eng_ing_double", message: ING_TEXT.double(verb) }];
  return [];
}

const canLook = (who: Person) => who.inner !== "I" && who.inner !== "you";

function continuousSentence(random: Random, verbs: readonly IngVerb[]) {
  const verb = random.pick(verbs);
  const who = bePerson(random);
  const rest = random.pick(verb.rest);
  const look = canLook(who) && random.chance(0.3);
  const when = look ? "" : ` ${random.pick(NOW_WORDS)}`;
  return { verb, who, rest, look, when };
}

export const presentContinuous: GeneratorFn = (random, difficulty) => {
  if (difficulty <= 2) {
    const { verb, who, rest, look, when } = continuousSentence(
      random,
      ING_VERBS.filter((candidate) => (difficulty === 1 ? candidate.rule === "plain" : candidate.rule !== "plain")),
    );
    const answer = `${who.be} ${verb.ing}`;
    const start = look ? "Look! " : "";
    return textItem({
      prompt: `Completa con il present continuous: ${start}${who.text} ___ (${verb.base}) ${rest}${when}.`,
      fields: [
        {
          id: "verb",
          label: "",
          placeholder: "am/is/are + -ing",
          accept: [answer],
          errors: [
            ...ingSpelling(verb, `${who.be} `),
            { answers: [verb.ing], tag: "eng_cont_missing_be", message: `Al present continuous serve anche am/is/are: ${answer}.` },
            beFormErrors(who, ` ${verb.ing}`),
            {
              answers: [verb.base, `${verb.base}s`, `${verb.base}es`],
              tag: "eng_cont_not_simple",
              message: `${look ? "Look!" : "Now"} vuol dire "proprio adesso": si usa il present continuous → ${answer}.`,
            },
          ],
        },
      ],
      solution: [
        `${look ? "Look!" : `"${when.trim()}"`}: sta succedendo adesso → present continuous.`,
        `${BE_TEXT[who.be]} ${ING_TEXT[verb.rule](verb)}`,
        `${start}${who.text} ${answer} ${rest}${when}.`,
      ],
    });
  }
  const { verb, who: picked, rest, when } = continuousSentence(random, ING_VERBS);
  const asking = random.chance(0.5);
  const who = asking && picked.inner === "I" ? BE_PERSONS[1] : picked;
  if (!asking) {
    const answer = `${who.be} not ${verb.ing}`;
    return textItem({
      prompt: `Completa con la forma negativa: ${who.text} ___ (not / ${verb.base}) ${rest}${when || " now"}.`,
      fields: [
        {
          id: "verb",
          label: "",
          placeholder: "ausiliare + not + -ing",
          accept: [answer],
          errors: [
            { answers: [`don't ${verb.ing}`, `doesn't ${verb.ing}`, `don't ${verb.base}`, `doesn't ${verb.base}`], tag: "eng_cont_no_do", message: `Al present continuous non serve do: ${answer}.` },
            { answers: [`${who.be} not ${verb.base}`], tag: "eng_cont_ing", message: `Dopo ${who.be} not serve il verbo in -ing: ${answer}.` },
            ...ingSpelling(verb, `${who.be} not `),
          ],
        },
      ],
      solution: [BE_TEXT[who.be], `Negazione: ${who.be} not + verbo in -ing, senza do.`, `${who.text} ${answer} ${rest}${when || " now"}.`],
    });
  }
  const aux = capitalize(who.be);
  return textItem({
    prompt: `Completa la domanda: ___ ${who.inner} ___ (${verb.base}) ${rest}${when || " now"}?`,
    fields: [
      {
        id: "aux",
        label: "1ª parola",
        placeholder: "Am, Is o Are?",
        accept: [aux],
        errors: [
          { answers: ["Do", "Does"], tag: "eng_cont_no_do", message: `Al present continuous la domanda inizia con am/is/are: ${aux}.` },
          { ...beFormErrors(who), answers: (["Am", "Is", "Are"] as const).filter((form) => form !== aux) },
        ],
      },
      {
        id: "verb",
        label: "2ª parola",
        placeholder: "verbo in -ing",
        accept: [verb.ing],
        errors: [
          { answers: [verb.base, `${verb.base}s`], tag: "eng_cont_ing", message: `Serve il verbo in -ing: ${verb.ing}.` },
          ...ingSpelling(verb, ""),
        ],
      },
    ],
    solution: [`Domanda al present continuous: ${aux} + soggetto + verbo in -ing.`, ING_TEXT[verb.rule](verb), `${aux} ${who.inner} ${verb.ing} ${rest}${when || " now"}?`],
  });
};

type EdRule = "ed" | "d" | "ied" | "yed" | "double";

type EdVerb = { base: string; past: string; rule: EdRule; rest: readonly string[] };

const ED_VERBS: readonly EdVerb[] = [
  { base: "watch", past: "watched", rule: "ed", rest: ["a film", "TV"] },
  { base: "play", past: "played", rule: "yed", rest: ["football", "video games"] },
  { base: "walk", past: "walked", rule: "ed", rest: ["to school", "in the park"] },
  { base: "clean", past: "cleaned", rule: "ed", rest: ["the kitchen"] },
  { base: "cook", past: "cooked", rule: "ed", rest: ["dinner", "pasta"] },
  { base: "visit", past: "visited", rule: "ed", rest: ["the museum", "London"] },
  { base: "help", past: "helped", rule: "ed", rest: ["a friend"] },
  { base: "work", past: "worked", rule: "ed", rest: ["in the garden"] },
  { base: "listen", past: "listened", rule: "ed", rest: ["to music"] },
  { base: "like", past: "liked", rule: "d", rest: ["the film", "the pizza"] },
  { base: "dance", past: "danced", rule: "d", rest: ["at the party"] },
  { base: "live", past: "lived", rule: "d", rest: ["in Milan"] },
  { base: "love", past: "loved", rule: "d", rest: ["the trip"] },
  { base: "study", past: "studied", rule: "ied", rest: ["English", "for the test"] },
  { base: "try", past: "tried", rule: "ied", rest: ["sushi"] },
  { base: "carry", past: "carried", rule: "ied", rest: ["a heavy bag"] },
  { base: "enjoy", past: "enjoyed", rule: "yed", rest: ["the party"] },
  { base: "stay", past: "stayed", rule: "yed", rest: ["at home"] },
  { base: "stop", past: "stopped", rule: "double", rest: ["at the shop"] },
  { base: "plan", past: "planned", rule: "double", rest: ["a trip"] },
  { base: "chat", past: "chatted", rule: "double", rest: ["with friends"] },
];

const PAST_TIMES = ["yesterday", "last week", "last Saturday", "two days ago", "last summer", "in 2020"];

const ED_TEXT: Record<EdRule, (verb: EdVerb) => string> = {
  ed: (verb) => `Si aggiunge -ed: ${verb.base} → ${verb.past}.`,
  d: (verb) => `Il verbo finisce già in -e: basta -d → ${verb.past}.`,
  ied: (verb) => `Consonante + y: la y diventa -ied → ${verb.past}.`,
  yed: (verb) => `Vocale + y: basta -ed → ${verb.past}.`,
  double: (verb) => `Verbo corto con consonante + vocale + consonante: si raddoppia l'ultima → ${verb.past}.`,
};

function edSpelling(verb: EdVerb): TextError[] {
  if (verb.rule === "d") return [{ answers: [`${verb.base}ed`], tag: "eng_ed_e", message: ED_TEXT.d(verb) }];
  if (verb.rule === "ied") return [{ answers: [`${verb.base}ed`], tag: "eng_ed_ied", message: ED_TEXT.ied(verb) }];
  if (verb.rule === "yed") return [{ answers: [`${verb.base.slice(0, -1)}ied`], tag: "eng_ed_vowel_y", message: ED_TEXT.yed(verb) }];
  if (verb.rule === "double") return [{ answers: [`${verb.base}ed`], tag: "eng_ed_double", message: ED_TEXT.double(verb) }];
  return [];
}

function anyPerson(random: Random): Person {
  return random.chance(0.5) ? random.pick(THIRD_PERSONS) : random.pick(OTHER_PERSONS);
}

type PastForms = { base: string; past: string };

function didNegative(random: Random, verb: PastForms, rest: string, extra: TextError[], solution: string) {
  const who = anyPerson(random);
  const time = random.pick(PAST_TIMES);
  const answer = `did not ${verb.base}`;
  return textItem({
    prompt: `Completa con la forma negativa: ${who.text} ___ (not / ${verb.base}) ${rest} ${time}.`,
    fields: [
      {
        id: "verb",
        label: "",
        placeholder: "ausiliare + not + verbo",
        accept: [answer],
        errors: [
          { answers: [`didn't ${verb.past}`, `didn't ${verb.base}ed`], tag: "eng_bare_after_did", message: `Did si prende la fatica: dopo didn't il verbo torna nudo → didn't ${verb.base}.` },
          { answers: [`don't ${verb.base}`, `doesn't ${verb.base}`, `don't ${verb.past}`, `doesn't ${verb.past}`], tag: "eng_past_did", message: `${capitalize(time)} è passato: si usa didn't per tutti → didn't ${verb.base}.` },
          { answers: [`not ${verb.past}`, `not ${verb.base}`, `${verb.past} not`], tag: "eng_missing_aux", message: `Per dire "non" al passato serve didn't + verbo nudo → didn't ${verb.base}.` },
          ...extra,
        ],
      },
    ],
    solution: [`${capitalize(time)} → passato: negazione con didn't, uguale per tutti.`, solution, `${who.text} didn't ${verb.base} ${rest} ${time}.`],
  });
}

function didQuestion(random: Random, verb: PastForms, rest: string, solution: string) {
  const who = anyPerson(random);
  const time = random.pick(PAST_TIMES);
  return textItem({
    prompt: `Completa la domanda: ___ ${who.inner} ___ (${verb.base}) ${rest} ${time}?`,
    fields: [
      {
        id: "aux",
        label: "1ª parola",
        placeholder: "l'ausiliare",
        accept: ["Did"],
        errors: [{ answers: ["Do", "Does", "Was", "Were"], tag: "eng_past_did", message: "Al passato la domanda inizia con Did, per tutti." }],
      },
      {
        id: "verb",
        label: "2ª parola",
        placeholder: "il verbo",
        accept: [verb.base],
        errors: [{ answers: [verb.past, `${verb.base}ed`], tag: "eng_bare_after_did", message: `Did si prende la fatica: il verbo torna nudo → ${verb.base}.` }],
      },
    ],
    solution: ["Al passato la domanda inizia con Did.", solution, `Did ${who.inner} ${verb.base} ${rest} ${time}?`],
  });
}

export const pastSimpleRegular: GeneratorFn = (random, difficulty) => {
  if (difficulty <= 2) {
    const verb = random.pick(ED_VERBS.filter((candidate) => (difficulty === 1 ? candidate.rule === "ed" || candidate.rule === "d" : candidate.rule !== "ed")));
    const who = anyPerson(random);
    const rest = random.pick(verb.rest);
    const time = random.pick(PAST_TIMES);
    const front = random.chance(0.5) && !time.startsWith("in ");
    const sentence = (form: string) => (front ? `${capitalize(time)} ${who.inner} ${form} ${rest}.` : `${who.text} ${form} ${rest} ${time}.`);
    return textItem({
      prompt: `Completa al passato: ${sentence(`___ (${verb.base})`)}`,
      fields: [
        {
          id: "verb",
          label: "",
          placeholder: "il verbo al passato",
          accept: [verb.past],
          errors: [
            ...edSpelling(verb),
            { answers: [verb.base, `${verb.base}s`, `${verb.base}es`], tag: "eng_past_missing_ed", message: `"${time}" vuol dire passato: ${ED_TEXT[verb.rule](verb)}` },
          ],
        },
      ],
      solution: [`"${time}" → passato. Al past simple il verbo è uguale per tutti.`, ED_TEXT[verb.rule](verb), sentence(verb.past)],
    });
  }
  const verb = random.pick(ED_VERBS);
  const rest = random.pick(verb.rest);
  const tip = `Dopo did il verbo torna nudo: ${verb.base}.`;
  return random.chance(0.5) ? didNegative(random, verb, rest, [], tip) : didQuestion(random, verb, rest, tip);
};


type Family = "same" | "ought" | "ee" | "dt" | "iau" | "oew" | "same23" | "en" | "rebel";

type Irregular = { base: string; past: string; participle: string; family: Family; rest: string };

const FAMILY_TEXT: Record<Family, string> = {
  same: "famiglia \"tutti e tre uguali\"",
  ought: "famiglia \"-ought / -aught\"",
  ee: "famiglia \"ee → e\"",
  dt: "famiglia \"-d → -t\"",
  iau: "famiglia \"i → a → u\"",
  oew: "famiglia \"-ow → -ew → -own\"",
  same23: "famiglia \"seconda = terza\"",
  en: "famiglia \"participio in -en\"",
  rebel: "i ribelli: da sapere a memoria",
};

const IRREGULARS: readonly Irregular[] = [
  { base: "cut", past: "cut", participle: "cut", family: "same", rest: "the cake" },
  { base: "put", past: "put", participle: "put", family: "same", rest: "the books on the table" },
  { base: "hit", past: "hit", participle: "hit", family: "same", rest: "the ball" },
  { base: "shut", past: "shut", participle: "shut", family: "same", rest: "the door" },
  { base: "set", past: "set", participle: "set", family: "same", rest: "the table" },
  { base: "buy", past: "bought", participle: "bought", family: "ought", rest: "a new phone" },
  { base: "bring", past: "brought", participle: "brought", family: "ought", rest: "a cake" },
  { base: "think", past: "thought", participle: "thought", family: "ought", rest: "about the test" },
  { base: "catch", past: "caught", participle: "caught", family: "ought", rest: "the bus" },
  { base: "teach", past: "taught", participle: "taught", family: "ought", rest: "English" },
  { base: "keep", past: "kept", participle: "kept", family: "ee", rest: "the secret" },
  { base: "sleep", past: "slept", participle: "slept", family: "ee", rest: "for ten hours" },
  { base: "feel", past: "felt", participle: "felt", family: "ee", rest: "tired" },
  { base: "meet", past: "met", participle: "met", family: "ee", rest: "Anna at the park" },
  { base: "send", past: "sent", participle: "sent", family: "dt", rest: "a message" },
  { base: "spend", past: "spent", participle: "spent", family: "dt", rest: "all the money" },
  { base: "build", past: "built", participle: "built", family: "dt", rest: "a sandcastle" },
  { base: "lend", past: "lent", participle: "lent", family: "dt", rest: "the bike to Tom" },
  { base: "sing", past: "sang", participle: "sung", family: "iau", rest: "a song" },
  { base: "drink", past: "drank", participle: "drunk", family: "iau", rest: "a glass of milk" },
  { base: "swim", past: "swam", participle: "swum", family: "iau", rest: "in the sea" },
  { base: "begin", past: "began", participle: "begun", family: "iau", rest: "the test" },
  { base: "ring", past: "rang", participle: "rung", family: "iau", rest: "the bell" },
  { base: "know", past: "knew", participle: "known", family: "oew", rest: "the answer" },
  { base: "grow", past: "grew", participle: "grown", family: "oew", rest: "tomatoes" },
  { base: "throw", past: "threw", participle: "thrown", family: "oew", rest: "the ball" },
  { base: "fly", past: "flew", participle: "flown", family: "oew", rest: "to London" },
  { base: "draw", past: "drew", participle: "drawn", family: "oew", rest: "a picture" },
  { base: "have", past: "had", participle: "had", family: "same23", rest: "pizza for dinner" },
  { base: "make", past: "made", participle: "made", family: "same23", rest: "a cake" },
  { base: "say", past: "said", participle: "said", family: "same23", rest: "hello" },
  { base: "tell", past: "told", participle: "told", family: "same23", rest: "a joke" },
  { base: "find", past: "found", participle: "found", family: "same23", rest: "a coin" },
  { base: "sit", past: "sat", participle: "sat", family: "same23", rest: "next to Anna" },
  { base: "lose", past: "lost", participle: "lost", family: "same23", rest: "the keys" },
  { base: "hear", past: "heard", participle: "heard", family: "same23", rest: "a strange noise" },
  { base: "win", past: "won", participle: "won", family: "same23", rest: "the match" },
  { base: "eat", past: "ate", participle: "eaten", family: "en", rest: "a sandwich" },
  { base: "write", past: "wrote", participle: "written", family: "en", rest: "a letter" },
  { base: "speak", past: "spoke", participle: "spoken", family: "en", rest: "to the teacher" },
  { base: "take", past: "took", participle: "taken", family: "en", rest: "a photo" },
  { base: "give", past: "gave", participle: "given", family: "en", rest: "a present to Tom" },
  { base: "forget", past: "forgot", participle: "forgotten", family: "en", rest: "the homework" },
  { base: "break", past: "broke", participle: "broken", family: "en", rest: "a glass" },
  { base: "drive", past: "drove", participle: "driven", family: "en", rest: "to the beach" },
  { base: "go", past: "went", participle: "gone", family: "rebel", rest: "to the cinema" },
  { base: "do", past: "did", participle: "done", family: "rebel", rest: "the homework" },
  { base: "see", past: "saw", participle: "seen", family: "rebel", rest: "a film" },
  { base: "come", past: "came", participle: "come", family: "rebel", rest: "home late" },
];

const IRREGULAR_GROUPS: Record<1 | 2 | 3, readonly Family[]> = {
  1: ["same", "ought", "ee", "dt"],
  2: ["iau", "oew", "same23"],
  3: ["en", "rebel"],
};

function regularized(verb: Irregular): string[] {
  const base = verb.base.endsWith("e") ? `${verb.base}d` : `${verb.base}ed`;
  return [base, verb.base.endsWith("y") ? `${verb.base.slice(0, -1)}ied` : `${verb.base}ed`];
}

function forms(verb: Irregular) {
  return `${verb.base} – ${verb.past} – ${verb.participle}`;
}

function irregularPast(random: Random, verb: Irregular) {
  const who = anyPerson(random);
  const time = random.pick(PAST_TIMES);
  const front = random.chance(0.5) && !time.startsWith("in ");
  const sentence = (form: string) => (front ? `${capitalize(time)} ${who.inner} ${form} ${verb.rest}.` : `${who.text} ${form} ${verb.rest} ${time}.`);
  const errors: TextError[] = [
    { answers: regularized(verb), tag: "eng_irregular_regularized", message: `${verb.base} è irregolare, niente -ed (${FAMILY_TEXT[verb.family]}): ${forms(verb)}.` },
    { answers: [verb.base, `${verb.base}s`, `${verb.base}es`], tag: "eng_past_missing", message: `"${time}" vuol dire passato: serve la seconda forma → ${verb.past}.` },
  ];
  if (verb.participle !== verb.past) {
    errors.unshift({
      answers: [verb.participle],
      tag: "eng_participle_for_past",
      message: `"${verb.participle}" è la terza forma (participio). Al passato serve la seconda: ${verb.past}.`,
    });
  }
  return textItem({
    prompt: `Completa al passato: ${sentence(`___ (${verb.base})`)}`,
    fields: [{ id: "verb", label: "", placeholder: "il verbo al passato", accept: [verb.past], errors }],
    solution: [`"${time}" → passato: seconda colonna.`, `${capitalize(FAMILY_TEXT[verb.family])}: ${forms(verb)}.`, sentence(verb.past)],
  });
}

function threeForms(verb: Irregular) {
  const swapPast: TextError[] = verb.participle !== verb.past
    ? [{ answers: [verb.participle], tag: "eng_forms_swapped", message: `${verb.participle} è la terza forma: la seconda è ${verb.past}.` }]
    : [];
  const swapParticiple: TextError[] = verb.participle !== verb.past
    ? [{ answers: [verb.past], tag: "eng_forms_swapped", message: `${verb.past} è la seconda forma: la terza (participio) è ${verb.participle}.` }]
    : [];
  return textItem({
    prompt: `Completa le tre forme del verbo: ${verb.base} – ___ – ___`,
    fields: [
      {
        id: "past",
        label: "2ª forma (passato)",
        placeholder: "passato",
        accept: [verb.past],
        errors: [
          ...swapPast,
          { answers: regularized(verb), tag: "eng_irregular_regularized", message: `${verb.base} è irregolare (${FAMILY_TEXT[verb.family]}): ${forms(verb)}.` },
        ],
      },
      {
        id: "participle",
        label: "3ª forma (participio)",
        placeholder: "participio",
        accept: [verb.participle],
        errors: [
          ...swapParticiple,
          { answers: regularized(verb), tag: "eng_irregular_regularized", message: `${verb.base} è irregolare (${FAMILY_TEXT[verb.family]}): ${forms(verb)}.` },
        ],
      },
    ],
    solution: [`${capitalize(FAMILY_TEXT[verb.family])}.`, `${forms(verb)}.`],
  });
}

function irregularGenerator(group: 1 | 2 | 3): GeneratorFn {
  return (random, difficulty) => {
    const verb = random.pick(IRREGULARS.filter((candidate) => IRREGULAR_GROUPS[group].includes(candidate.family)));
    if (difficulty === 1) return irregularPast(random, verb);
    if (difficulty === 2) return random.chance(0.6) ? threeForms(verb) : irregularPast(random, verb);
    const tip = `Dopo did il verbo torna nudo: ${verb.base}, non ${verb.past}.`;
    return random.chance(0.5) ? didNegative(random, verb, verb.rest, [], tip) : didQuestion(random, verb, verb.rest, tip);
  };
}

export const irregularVerbs1 = irregularGenerator(1);
export const irregularVerbs2 = irregularGenerator(2);
export const irregularVerbs3 = irregularGenerator(3);

type TenseVerb = { base: string; third: string; ing: string; past: string; rest: string };

const TENSE_VERBS: readonly TenseVerb[] = [
  { base: "play", third: "plays", ing: "playing", past: "played", rest: "football" },
  { base: "watch", third: "watches", ing: "watching", past: "watched", rest: "TV" },
  { base: "drink", third: "drinks", ing: "drinking", past: "drank", rest: "a glass of milk" },
  { base: "eat", third: "eats", ing: "eating", past: "ate", rest: "pizza" },
  { base: "go", third: "goes", ing: "going", past: "went", rest: "to the park" },
  { base: "study", third: "studies", ing: "studying", past: "studied", rest: "English" },
  { base: "cook", third: "cooks", ing: "cooking", past: "cooked", rest: "dinner" },
  { base: "swim", third: "swims", ing: "swimming", past: "swam", rest: "in the pool" },
  { base: "write", third: "writes", ing: "writing", past: "wrote", rest: "an email" },
  { base: "ride", third: "rides", ing: "riding", past: "rode", rest: "a bike" },
];

type Tense = "simple" | "continuous" | "past";

const SIGNALS: Record<Tense, readonly string[]> = {
  simple: ["every day", "every Saturday", "usually", "always", "on Mondays"],
  continuous: ["now", "at the moment", "Look!"],
  past: ["yesterday", "last week", "two days ago", "last summer"],
};

const TENSE_NAME: Record<Tense, string> = { simple: "present simple", continuous: "present continuous", past: "past simple" };

const TENSE_WHY: Record<Tense, string> = {
  simple: "abitudine, cosa che succede spesso",
  continuous: "sta succedendo proprio adesso",
  past: "è già successo",
};

function signalPerson(random: Random, signal: string): BePerson {
  const who = bePerson(random);
  return signal === "Look!" && !canLook(who) ? BE_PERSONS[1] : who;
}

function tenseForm(tense: Tense, verb: TenseVerb, who: BePerson): string {
  if (tense === "simple") return who.third ? verb.third : verb.base;
  if (tense === "continuous") return `${who.be} ${verb.ing}`;
  return verb.past;
}

function placeSignal(signal: string, who: BePerson, form: string, rest: string, end = "."): string {
  if (signal === "Look!") return `Look! ${who.text} ${form} ${rest}${end}`;
  if (signal === "usually" || signal === "always") return `${who.text} ${signal} ${form} ${rest}${end}`;
  return `${who.text} ${form} ${rest} ${signal}${end}`;
}

export const tenseChoice: GeneratorFn = (random, difficulty) => {
  const tense = random.pick(["simple", "continuous", "past"] as const);
  const verb = random.pick(TENSE_VERBS);
  const signal = random.pick(SIGNALS[tense]);
  const who = signalPerson(random, signal);
  const answer = tenseForm(tense, verb, who);
  const others = (["simple", "continuous", "past"] as const).filter((candidate) => candidate !== tense);
  const why = `Parola-spia "${signal}": ${TENSE_WHY[tense]} → ${TENSE_NAME[tense]}.`;
  const solution = [why, placeSignal(signal, who, answer, verb.rest)];

  if (difficulty === 1) {
    const texts = [answer, ...others.map((other) => tenseForm(other, verb, who))];
    const ids = ["a", "b", "c"];
    const shift = random.int(0, 2);
    const options = ids.map((id, position) => ({ id, text: texts[(position + shift) % 3] }));
    const correct = options.find((option) => option.text === answer)!.id;
    return {
      content: { type: "choice", prompt: `Scegli il verbo giusto: ${placeSignal(signal, who, "___", verb.rest)}`, options },
      key: {
        type: "choice",
        correct,
        knownErrors: options
          .filter((option) => option.id !== correct)
          .map((option) => ({ option: option.id, tag: "eng_tense_signal", message: why })),
      },
      solution,
    };
  }

  const wrongForms = others.map((other) => tenseForm(other, verb, who));
  const extra: TextError[] = tense === "simple" && who.third ? [{ answers: [verb.base], tag: "eng_third_person_s", message: `He, she, it: la S ci sta → ${verb.third}.` }] : [];
  if (difficulty === 2 || tense === "continuous") {
    return textItem({
      prompt: `Completa con il tempo giusto: ${placeSignal(signal, who, `___ (${verb.base})`, verb.rest)}`,
      fields: [{ id: "verb", label: "", placeholder: "il verbo", accept: [answer], errors: [{ answers: wrongForms, tag: "eng_tense_signal", message: why }, ...extra] }],
      solution,
    });
  }

  const negative = tense === "simple" ? `${who.third ? "does" : "do"} not ${verb.base}` : `did not ${verb.base}`;
  const wrongNegatives = tense === "simple" ? [`did not ${verb.base}`, `${who.be} not ${verb.ing}`] : [`${who.third ? "does" : "do"} not ${verb.base}`, `${who.be} not ${verb.ing}`];
  return textItem({
    prompt: `Completa con la forma negativa del tempo giusto: ${placeSignal(signal, who, `___ (not / ${verb.base})`, verb.rest)}`,
    fields: [
      {
        id: "verb",
        label: "",
        placeholder: "ausiliare + not + verbo",
        accept: [negative],
        errors: [
          { answers: wrongNegatives, tag: "eng_tense_signal", message: why },
          { answers: [`${negative.replace(` ${verb.base}`, "")} ${tense === "past" ? verb.past : verb.third}`], tag: "eng_bare_after_aux", message: `Dopo l'ausiliare il verbo torna nudo → ${negative}.` },
        ],
      },
    ],
    solution: [why, `Negazione: ${negative}.`, placeSignal(signal, who, negative.replace(" not", "n't"), verb.rest)],
  });
};
