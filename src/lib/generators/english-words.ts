import { choiceItem, distinctOptions, shuffle, textItem, type GeneratorFn } from "./build";
import type { Random } from "./random";

type Cognate = { en: string; it: string; rule: string; alt?: string[] };

const COGNATES: readonly Cognate[] = [
  { en: "nation", it: "nazione", rule: "-zione → -tion" },
  { en: "information", it: "informazione", rule: "-zione → -tion" },
  { en: "station", it: "stazione", rule: "-zione → -tion" },
  { en: "attention", it: "attenzione", rule: "-zione → -tion" },
  { en: "situation", it: "situazione", rule: "-zione → -tion" },
  { en: "conversation", it: "conversazione", rule: "-zione → -tion" },
  { en: "solution", it: "soluzione", rule: "-zione → -tion" },
  { en: "city", it: "città", rule: "-tà → -ty" },
  { en: "university", it: "università", rule: "-tà → -ty" },
  { en: "activity", it: "attività", rule: "-tà → -ty" },
  { en: "curiosity", it: "curiosità", rule: "-tà → -ty" },
  { en: "electricity", it: "elettricità", rule: "-tà → -ty" },
  { en: "quality", it: "qualità", rule: "-tà → -ty" },
  { en: "famous", it: "famoso", rule: "-oso → -ous" },
  { en: "curious", it: "curioso", rule: "-oso → -ous" },
  { en: "nervous", it: "nervoso", rule: "-oso → -ous" },
  { en: "delicious", it: "delizioso", rule: "-oso → -ous" },
  { en: "generous", it: "generoso", rule: "-oso → -ous" },
  { en: "rapidly", it: "rapidamente", rule: "-mente → -ly" },
  { en: "probably", it: "probabilmente", rule: "-mente → -ly" },
  { en: "finally", it: "finalmente", rule: "-mente → -ly" },
  { en: "exactly", it: "esattamente", rule: "-mente → -ly" },
  { en: "fantastic", it: "fantastico", rule: "-ico → -ic" },
  { en: "electric", it: "elettrico", rule: "-ico → -ic" },
  { en: "magic", it: "magico", rule: "-ico → -ic" },
  { en: "romantic", it: "romantico", rule: "-ico → -ic" },
  { en: "normal", it: "normale", rule: "-ale → -al" },
  { en: "natural", it: "naturale", rule: "-ale → -al" },
  { en: "animal", it: "animale", rule: "-ale → -al" },
  { en: "special", it: "speciale", rule: "-ale → -al" },
  { en: "different", it: "differente", rule: "-ente → -ent" },
  { en: "intelligent", it: "intelligente", rule: "-ente → -ent" },
  { en: "important", it: "importante", rule: "-ante → -ant" },
  { en: "elegant", it: "elegante", rule: "-ante → -ant" },
  { en: "difference", it: "differenza", rule: "-enza → -ence" },
  { en: "patience", it: "pazienza", rule: "-enza → -ence" },
  { en: "importance", it: "importanza", rule: "-anza → -ance" },
  { en: "distance", it: "distanza", rule: "-anza → -ance" },
  { en: "artist", it: "artista", rule: "-ista → -ist" },
  { en: "dentist", it: "dentista", rule: "-ista → -ist" },
  { en: "tourist", it: "turista", rule: "-ista → -ist" },
  { en: "active", it: "attivo", rule: "-ivo → -ive" },
  { en: "creative", it: "creativo", rule: "-ivo → -ive" },
  { en: "positive", it: "positivo", rule: "-ivo → -ive" },
  { en: "dictionary", it: "dizionario", rule: "-ario → -ary" },
  { en: "necessary", it: "necessario", rule: "-ario → -ary" },
  { en: "actor", it: "attore", rule: "-ore → -or" },
  { en: "doctor", it: "dottore", rule: "-ore → -or" },
  { en: "motor", it: "motore", rule: "-ore → -or" },
  { en: "color", it: "colore", rule: "-ore → -or", alt: ["colour"] },
  { en: "culture", it: "cultura", rule: "-ura → -ure" },
  { en: "nature", it: "natura", rule: "-ura → -ure" },
  { en: "temperature", it: "temperatura", rule: "-ura → -ure" },
  { en: "adventure", it: "avventura", rule: "-ura → -ure" },
  { en: "create", it: "creare", rule: "-are → -ate" },
  { en: "celebrate", it: "celebrare", rule: "-are → -ate" },
  { en: "communicate", it: "comunicare", rule: "-are → -ate" },
];

function otherTexts(random: Random, pool: readonly string[], exclude: readonly string[], count: number): string[] {
  return shuffle(random, pool.filter((text) => !exclude.includes(text))).slice(0, count);
}

export const cognates: GeneratorFn = (random, difficulty) => {
  const word = random.pick(COGNATES);
  const why = `Regola delle parole trasparenti: ${word.rule}. ${word.it} → ${word.en}.`;
  if (difficulty === 1) {
    const { options, correctId } = distinctOptions(
      random,
      word.it,
      otherTexts(random, COGNATES.map((candidate) => candidate.it), [word.it], 3),
    );
    return choiceItem({ prompt: `Cosa vuol dire "${word.en}"?`, options, correct: correctId, solution: [why] });
  }
  const hint = difficulty === 2 ? ` (trucco: ${word.rule})` : "";
  return textItem({
    prompt: `Come si dice in inglese "${word.it}"?${hint}`,
    fields: [
      {
        id: "word",
        label: "",
        placeholder: "la parola in inglese",
        accept: [word.en, ...(word.alt ?? [])],
        errors: [{ answers: [word.it], tag: "eng_cognate_italian", message: `Hai scritto la parola italiana: applica la regola ${word.rule} → ${word.en}.` }],
      },
    ],
    solution: [why],
  });
};

type FalseFriend = {
  en: string;
  looks: string;
  means: string;
  looksLabel: string;
  looksEn: string | null;
  sentence: string;
  right: string;
  trap: string;
};

const FALSE_FRIENDS: readonly FalseFriend[] = [
  { en: "library", looks: "libreria", means: "biblioteca", looksLabel: "libreria (il negozio di libri)", looksEn: "bookshop", sentence: "I study in the library.", right: "Studio in biblioteca.", trap: "Studio in libreria." },
  { en: "actually", looks: "attualmente", means: "in realtà", looksLabel: "attualmente", looksEn: "currently", sentence: "Actually, I don't like pizza.", right: "In realtà non mi piace la pizza.", trap: "Attualmente non mi piace la pizza." },
  { en: "parents", looks: "parenti", means: "genitori", looksLabel: "parenti", looksEn: "relatives", sentence: "My parents are at work.", right: "I miei genitori sono al lavoro.", trap: "I miei parenti sono al lavoro." },
  { en: "camera", looks: "camera", means: "macchina fotografica", looksLabel: "camera (da letto)", looksEn: "bedroom", sentence: "I have a new camera.", right: "Ho una macchina fotografica nuova.", trap: "Ho una camera nuova." },
  { en: "factory", looks: "fattoria", means: "fabbrica", looksLabel: "fattoria", looksEn: "farm", sentence: "My uncle works in a factory.", right: "Mio zio lavora in una fabbrica.", trap: "Mio zio lavora in una fattoria." },
  { en: "magazine", looks: "magazzino", means: "rivista", looksLabel: "magazzino", looksEn: "warehouse", sentence: "She is reading a magazine.", right: "Sta leggendo una rivista.", trap: "Sta leggendo un magazzino." },
  { en: "argument", looks: "argomento", means: "litigio", looksLabel: "argomento (di cui si parla)", looksEn: "topic", sentence: "They had an argument.", right: "Hanno litigato.", trap: "Avevano un argomento." },
  { en: "sensible", looks: "sensibile", means: "sensato", looksLabel: "sensibile", looksEn: "sensitive", sentence: "That's a sensible idea.", right: "È un'idea sensata.", trap: "È un'idea sensibile." },
  { en: "novel", looks: "novella", means: "romanzo", looksLabel: "novella (racconto breve)", looksEn: "short story", sentence: "I'm reading a long novel.", right: "Sto leggendo un lungo romanzo.", trap: "Sto leggendo una lunga novella." },
  { en: "attend", looks: "attendere", means: "frequentare", looksLabel: "attendere (aspettare)", looksEn: "wait", sentence: "I attend a school in Rome.", right: "Frequento una scuola a Roma.", trap: "Aspetto una scuola a Roma." },
  { en: "large", looks: "largo", means: "grande", looksLabel: "largo", looksEn: "wide", sentence: "They live in a large house.", right: "Vivono in una casa grande.", trap: "Vivono in una casa larga." },
  { en: "stamp", looks: "stampa", means: "francobollo", looksLabel: "stampa (un foglio stampato)", looksEn: "print", sentence: "I need a stamp for this letter.", right: "Mi serve un francobollo per questa lettera.", trap: "Mi serve una stampa per questa lettera." },
  { en: "eventually", looks: "eventualmente", means: "alla fine", looksLabel: "eventualmente", looksEn: null, sentence: "Eventually, we found the keys.", right: "Alla fine abbiamo trovato le chiavi.", trap: "Eventualmente abbiamo trovato le chiavi." },
  { en: "pretend", looks: "pretendere", means: "fingere", looksLabel: "pretendere", looksEn: null, sentence: "He pretends to be ill.", right: "Fa finta di essere malato.", trap: "Pretende di essere malato." },
  { en: "realize", looks: "realizzare", means: "rendersi conto", looksLabel: "realizzare", looksEn: null, sentence: "I didn't realize it was so late.", right: "Non mi ero reso conto che fosse così tardi.", trap: "Non avevo realizzato che fosse così tardi." },
];

function trapMessage(word: FalseFriend) {
  return `Trappola! "${word.en}" sembra "${word.looks}" ma vuol dire "${word.means}".${word.looksEn ? ` "${capitalized(word.looks)}" si dice "${word.looksEn}".` : ""}`;
}

const capitalized = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const falseFriends: GeneratorFn = (random, difficulty) => {
  if (difficulty === 1) {
    const word = random.pick(FALSE_FRIENDS);
    const fillers = otherTexts(random, FALSE_FRIENDS.map((candidate) => candidate.means), [word.means, word.looks], 2);
    const { options, correctId, idOf } = distinctOptions(random, word.means, [word.looks, ...fillers]);
    return choiceItem({
      prompt: `Cosa vuol dire "${word.en}"?`,
      options,
      correct: correctId,
      errors: [{ option: idOf(word.looks), tag: "eng_false_friend", message: trapMessage(word) }],
      solution: [trapMessage(word)],
    });
  }
  if (difficulty === 2) {
    const candidates = FALSE_FRIENDS.filter((candidate) => candidate.looksEn !== null);
    const word = random.pick(candidates);
    const looksEn = word.looksEn ?? "";
    const fillers = otherTexts(random, candidates.map((candidate) => candidate.looksEn ?? ""), [looksEn, word.en], 2);
    const { options, correctId, idOf } = distinctOptions(random, looksEn, [word.en, ...fillers]);
    return choiceItem({
      prompt: `Come si dice in inglese "${word.looksLabel}"?`,
      options,
      correct: correctId,
      errors: [{ option: idOf(word.en), tag: "eng_false_friend", message: trapMessage(word) }],
      solution: [trapMessage(word)],
    });
  }
  const word = random.pick(FALSE_FRIENDS);
  const filler = random.pick(FALSE_FRIENDS.filter((candidate) => candidate.en !== word.en)).right;
  const { options, correctId, idOf } = distinctOptions(random, word.right, [word.trap, filler]);
  return choiceItem({
    prompt: `Cosa vuol dire questa frase? "${word.sentence}"`,
    options,
    correct: correctId,
    errors: [{ option: idOf(word.trap), tag: "eng_false_friend", message: trapMessage(word) }],
    solution: [trapMessage(word), `${word.sentence} → ${word.right}`],
  });
};

type Pair = { en: string; it: string; alt?: string[] };

const DAYS: readonly Pair[] = [
  { en: "Monday", it: "lunedì" },
  { en: "Tuesday", it: "martedì" },
  { en: "Wednesday", it: "mercoledì" },
  { en: "Thursday", it: "giovedì" },
  { en: "Friday", it: "venerdì" },
  { en: "Saturday", it: "sabato" },
  { en: "Sunday", it: "domenica" },
];

const MONTHS: readonly Pair[] = [
  { en: "January", it: "gennaio" },
  { en: "February", it: "febbraio" },
  { en: "March", it: "marzo" },
  { en: "April", it: "aprile" },
  { en: "May", it: "maggio" },
  { en: "June", it: "giugno" },
  { en: "July", it: "luglio" },
  { en: "August", it: "agosto" },
  { en: "September", it: "settembre" },
  { en: "October", it: "ottobre" },
  { en: "November", it: "novembre" },
  { en: "December", it: "dicembre" },
];

const SEASONS: readonly Pair[] = [
  { en: "spring", it: "primavera" },
  { en: "summer", it: "estate" },
  { en: "autumn", it: "autunno", alt: ["fall"] },
  { en: "winter", it: "inverno" },
];

const UNITS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function numberWords(value: number): string[] {
  if (value < 20) return [UNITS[value]];
  if (value === 100) return ["one hundred", "a hundred"];
  const tens = TENS[Math.floor(value / 10)];
  const unit = value % 10;
  return unit === 0 ? [tens] : [`${tens}-${UNITS[unit]}`, `${tens} ${UNITS[unit]}`];
}

function numberErrors(value: number) {
  const errors = [];
  if (value >= 13 && value <= 19 && value !== 14) {
    errors.push({ answers: numberWords((value - 10) * 10), tag: "eng_teen_ty", message: `-teen sono i numeri da 13 a 19, -ty sono le decine: ${value} = ${numberWords(value)[0]}.` });
  }
  if (value % 10 === 0 && value >= 30 && value <= 90) {
    errors.push({ answers: numberWords(value / 10 + 10), tag: "eng_teen_ty", message: `-teen sono i numeri da 13 a 19, -ty sono le decine: ${value} = ${numberWords(value)[0]}.` });
  }
  if (Math.floor(value / 10) === 4 && value >= 40) {
    errors.push({ answers: numberWords(value).map((text) => text.replace("forty", "fourty")), tag: "eng_forty", message: `forty si scrive senza la u (four → forty): ${numberWords(value)[0]}.` });
  }
  if (value === 14) errors.push({ answers: ["forteen"], tag: "eng_fourteen", message: "fourteen è four + teen: fourteen." });
  if (value === 15) errors.push({ answers: ["fiveteen"], tag: "eng_fifteen", message: "15 non è fiveteen: si dice fifteen." });
  if (value === 12) errors.push({ answers: ["twelf", "twelwe"], tag: "eng_twelve", message: "12 si scrive twelve." });
  return errors;
}

type Clock = { time: string; accept: string[]; wrong?: { answers: string[]; message: string } };

const HOURS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

function clock(random: Random): Clock {
  const hour = random.int(1, 11);
  const name = HOURS[hour - 1];
  const next = HOURS[hour];
  const kind = random.int(0, 3);
  if (kind === 0) return { time: `${hour}:00`, accept: [`${name} o'clock`, name] };
  if (kind === 1) return { time: `${hour}:30`, accept: [`half past ${name}`, `${name} thirty`], wrong: { answers: [`half past ${next}`], message: `In inglese "e mezza" si conta dall'ora appena passata: ${hour}:30 = half past ${name}.` } };
  if (kind === 2) return { time: `${hour}:15`, accept: [`quarter past ${name}`, `a quarter past ${name}`, `${name} fifteen`], wrong: { answers: [`quarter to ${name}`, `a quarter to ${name}`], message: `past = dopo, to = prima: ${hour}:15 è un quarto DOPO le ${hour} → quarter past ${name}.` } };
  return { time: `${hour}:45`, accept: [`quarter to ${next}`, `a quarter to ${next}`, `${name} forty-five`, `${name} forty five`], wrong: { answers: [`quarter to ${name}`, `a quarter to ${name}`, `quarter past ${name}`], message: `${hour}:45 = mancano 15 minuti alle ${hour + 1} → quarter to ${next}.` } };
}

const TRAPS: Record<string, string> = {
  Tuesday: "Thursday",
  Thursday: "Tuesday",
};

function confusionMessage(pair: Pair) {
  return pair.en === "Tuesday" || pair.en === "Thursday" ? "Attento: Tuesday è martedì, Thursday (con la h) è giovedì." : `${pair.it} = ${pair.en}.`;
}

export const vocabTime: GeneratorFn = (random, difficulty) => {
  if (difficulty === 3) {
    if (random.chance(0.5)) {
      const value = random.int(21, 99);
      return textItem({
        prompt: `Scrivi in lettere, in inglese: ${value}`,
        fields: [{ id: "word", label: "", placeholder: "in lettere", accept: numberWords(value), errors: numberErrors(value) }],
        solution: [`Prima le decine, poi le unità con il trattino: ${numberWords(value)[0]}.`],
      });
    }
    const time = clock(random);
    return textItem({
      prompt: `Che ore sono? Scrivi in inglese: ${time.time}`,
      fields: [
        {
          id: "word",
          label: "",
          placeholder: "l'ora in inglese",
          accept: time.accept,
          errors: time.wrong ? [{ answers: time.wrong.answers, tag: "eng_clock", message: time.wrong.message }] : [],
        },
      ],
      solution: ["o'clock = in punto, half past = e mezza, quarter past = e un quarto, quarter to = meno un quarto.", `${time.time} → ${time.accept[0]}.`],
    });
  }
  const group = random.pick([DAYS, MONTHS, SEASONS, null]);
  if (group === null) {
    const value = random.pick([...Array.from({ length: 20 }, (_, index) => index + 1), 30, 40, 50, 60, 70, 80, 90, 100]);
    if (difficulty === 1) {
      const decoys = [value >= 13 && value <= 19 ? (value - 10) * 10 : value >= 30 && value % 10 === 0 ? value / 10 + 10 : value + 1, value + 10, Math.max(1, value - 1)];
      const { options, correctId } = distinctOptions(random, String(value), decoys.map(String));
      return choiceItem({
        prompt: `Che numero è "${numberWords(value)[0]}"?`,
        options,
        correct: correctId,
        solution: [`${numberWords(value)[0]} = ${value}.`, "-teen = da 13 a 19, -ty = le decine (20, 30, 40…)."],
      });
    }
    return textItem({
      prompt: `Scrivi in lettere, in inglese: ${value}`,
      fields: [{ id: "word", label: "", placeholder: "in lettere", accept: numberWords(value), errors: numberErrors(value) }],
      solution: [`${value} = ${numberWords(value)[0]}.`],
    });
  }
  const pair = random.pick(group);
  if (difficulty === 1) {
    const trap = TRAPS[pair.en];
    const trapIt = trap ? group.find((candidate) => candidate.en === trap)?.it : undefined;
    const fillers = otherTexts(random, group.map((candidate) => candidate.it), [pair.it, trapIt ?? ""], trapIt ? 2 : 3);
    const { options, correctId, idOf } = distinctOptions(random, pair.it, [...(trapIt ? [trapIt] : []), ...fillers]);
    return choiceItem({
      prompt: `Cosa vuol dire "${pair.en}"?`,
      options,
      correct: correctId,
      errors: trapIt ? [{ option: idOf(trapIt), tag: "eng_tue_thu", message: confusionMessage(pair) }] : [],
      solution: [`${pair.en} = ${pair.it}.`],
    });
  }
  const trap = TRAPS[pair.en];
  return textItem({
    prompt: `Come si dice in inglese "${pair.it}"?`,
    fields: [
      {
        id: "word",
        label: "",
        placeholder: "la parola in inglese",
        accept: [pair.en, ...(pair.alt ?? [])],
        errors: trap ? [{ answers: [trap], tag: "eng_tue_thu", message: confusionMessage(pair) }] : [],
      },
    ],
    solution: [`${pair.it} = ${pair.en}.`, group === SEASONS ? "Le stagioni si scrivono con la minuscola." : "Giorni e mesi in inglese si scrivono con la maiuscola."],
  });
};

type Theme = { name: string; of: string; words: readonly Pair[] };

const THEMES: readonly Theme[] = [
  {
    name: "la famiglia",
    of: "della famiglia",
    words: [
      { en: "mother", it: "madre", alt: ["mum", "mom"] },
      { en: "father", it: "padre", alt: ["dad"] },
      { en: "brother", it: "fratello" },
      { en: "sister", it: "sorella" },
      { en: "grandmother", it: "nonna", alt: ["grandma", "granny"] },
      { en: "grandfather", it: "nonno", alt: ["grandpa"] },
      { en: "uncle", it: "zio" },
      { en: "aunt", it: "zia" },
      { en: "cousin", it: "cugino" },
      { en: "son", it: "figlio" },
      { en: "daughter", it: "figlia" },
    ],
  },
  {
    name: "la casa",
    of: "della casa",
    words: [
      { en: "kitchen", it: "cucina" },
      { en: "bedroom", it: "camera da letto" },
      { en: "bathroom", it: "bagno" },
      { en: "living room", it: "soggiorno", alt: ["sitting room", "lounge"] },
      { en: "garden", it: "giardino" },
      { en: "door", it: "porta" },
      { en: "window", it: "finestra" },
      { en: "table", it: "tavolo" },
      { en: "chair", it: "sedia" },
      { en: "bed", it: "letto" },
    ],
  },
  {
    name: "la scuola",
    of: "della scuola",
    words: [
      { en: "teacher", it: "insegnante" },
      { en: "desk", it: "banco" },
      { en: "book", it: "libro" },
      { en: "pen", it: "penna" },
      { en: "pencil", it: "matita" },
      { en: "rubber", it: "gomma", alt: ["eraser"] },
      { en: "schoolbag", it: "zaino", alt: ["school bag", "backpack", "rucksack"] },
      { en: "homework", it: "compiti" },
      { en: "classroom", it: "aula" },
    ],
  },
  {
    name: "il cibo",
    of: "del cibo",
    words: [
      { en: "bread", it: "pane" },
      { en: "cheese", it: "formaggio" },
      { en: "apple", it: "mela" },
      { en: "chicken", it: "pollo" },
      { en: "fish", it: "pesce" },
      { en: "water", it: "acqua" },
      { en: "milk", it: "latte" },
      { en: "egg", it: "uovo" },
      { en: "meat", it: "carne" },
      { en: "rice", it: "riso" },
      { en: "vegetables", it: "verdure" },
    ],
  },
];

const THING_TRAPS: Record<string, { answers: string[]; message: string }> = {
  bedroom: { answers: ["camera"], message: "Trappola! In inglese camera vuol dire macchina fotografica. La camera da letto è bedroom." },
  rubber: { answers: ["gum"], message: "gum è la gomma da masticare: la gomma per cancellare è rubber (o eraser)." },
};

export const vocabThings: GeneratorFn = (random, difficulty) => {
  const theme = random.pick(THEMES);
  if (difficulty === 3) {
    const intruderTheme = random.pick(THEMES.filter((candidate) => candidate !== theme));
    const intruder = random.pick(intruderTheme.words).en;
    const members = shuffle(random, theme.words).slice(0, 3).map((pair) => pair.en);
    const { options, correctId } = distinctOptions(random, intruder, members);
    return choiceItem({
      prompt: `Quale parola NON c'entra con ${theme.name}?`,
      options,
      correct: correctId,
      solution: [`${members.join(", ")} sono parole ${theme.of}.`, `${intruder} è una parola ${intruderTheme.of}.`],
    });
  }
  const pair = random.pick(theme.words);
  if (difficulty === 1) {
    const { options, correctId } = distinctOptions(random, pair.it, otherTexts(random, theme.words.map((candidate) => candidate.it), [pair.it], 3));
    return choiceItem({ prompt: `Cosa vuol dire "${pair.en}"?`, options, correct: correctId, solution: [`${pair.en} = ${pair.it}.`] });
  }
  const trap = THING_TRAPS[pair.en];
  return textItem({
    prompt: `Come si dice in inglese "${pair.it}"?`,
    fields: [
      {
        id: "word",
        label: "",
        placeholder: "la parola in inglese",
        accept: [pair.en, ...(pair.alt ?? [])],
        errors: trap ? [{ answers: trap.answers, tag: "eng_false_friend", message: trap.message }] : [],
      },
    ],
    solution: [`${pair.it} = ${pair.en}.`],
  });
};
