import { shuffle, taskItem, type GeneratorFn, type TaskQuestion } from "./build";
import type { Random } from "./random";

type Kid = { name: string; he: string; him: string; his: string };

const KIDS: readonly Kid[] = [
  { name: "Tom", he: "he", him: "him", his: "his" },
  { name: "Jack", he: "he", him: "him", his: "his" },
  { name: "Sam", he: "he", him: "him", his: "his" },
  { name: "Ben", he: "he", him: "him", his: "his" },
  { name: "Emma", he: "she", him: "her", his: "her" },
  { name: "Lucy", he: "she", him: "her", his: "her" },
  { name: "Mia", he: "she", him: "her", his: "her" },
  { name: "Grace", he: "she", him: "her", his: "her" },
];

const CITIES = ["London", "Manchester", "Leeds", "Bristol", "York", "Oxford", "Liverpool", "Brighton"];
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const NUMBER_WORDS: Record<number, string> = {
  2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten",
  11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen", 15: "fifteen", 16: "sixteen", 18: "eighteen", 20: "twenty", 25: "twenty-five",
};

const TFNG = ["True", "False", "Not given"];

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function two<T>(random: Random, pool: readonly T[], exclude: T): T[] {
  return shuffle(random, pool.filter((value) => value !== exclude)).slice(0, 2);
}

function mcq(random: Random, label: string, correct: string, wrong: readonly string[], hint: string): TaskQuestion {
  return { kind: "select", label, options: shuffle(random, [correct, ...wrong]), correct, hint };
}

function tfng(label: string, answer: "True" | "False" | "Not given", hint: string): TaskQuestion {
  return { kind: "select", label, options: TFNG, correct: answer, hint };
}

function numberAccept(value: number, unit = ""): string[] {
  const word = NUMBER_WORDS[value];
  const base = [String(value), ...(word ? [word] : [])];
  return unit ? [...base, ...base.map((text) => `${text} ${unit}`)] : base;
}

function phraseAccept(phrase: string): string[] {
  const bare = phrase.replace(/^(a|an|the|my|his|her|your)\s+/i, "");
  return [...new Set([phrase, bare, `the ${bare}`, `a ${bare}`, `his ${bare}`, `her ${bare}`, `my ${bare}`, `your ${bare}`])];
}

type Task = { passage: string; questions: { mcq: TaskQuestion[]; tfng: TaskQuestion[]; short: TaskQuestion[] }; summary: string };

const FAMILIES = [
  { text: "my mum and dad", brother: false },
  { text: "my mum, my dad and my little brother", brother: true },
  { text: "my dad and my two sisters", brother: false },
  { text: "my grandparents", brother: false },
];
const PETS = ["dog", "cat", "rabbit", "hamster", "parrot"];
const PET_NAMES = ["Max", "Bella", "Charlie", "Luna", "Oscar", "Daisy"];
const SUBJECTS = ["science", "history", "art", "music", "geography", "maths"];
const HOBBIES = ["play football", "go swimming", "ride my bike", "play video games", "draw comics", "play the guitar"];
const WEEKENDS = ["visit my grandma", "go to the cinema", "play basketball in the park", "help my dad in the garden"];

function profile(random: Random): Task {
  const kid = random.pick(KIDS);
  const age = random.int(11, 14);
  const city = random.pick(CITIES);
  const family = random.pick(FAMILIES);
  const pet = random.pick(PETS);
  const petName = random.pick(PET_NAMES);
  const subject = random.pick(SUBJECTS);
  const hobby = random.pick(HOBBIES);
  const weekend = random.pick(WEEKENDS);
  const passage = [
    `Hi! My name is ${kid.name} and I'm ${age} years old. I live in ${city} with ${family.text}. I've got a ${pet} called ${petName}.`,
    `My favourite subject at school is ${subject}. After school I ${hobby} with my friends. At the weekend I usually ${weekend}.`,
  ].join("\n\n");
  const otherSubject = random.pick(SUBJECTS.filter((candidate) => candidate !== subject));
  const notGiven = random.pick([
    `${kid.name}'s ${pet} is two years old.`,
    `${kid.name} likes pizza.`,
    `${kid.name}'s school is very big.`,
    `${kid.name}'s birthday is in May.`,
  ]);
  return {
    passage,
    summary: `${kid.name}, ${age} anni, vive a ${city}; animale: ${pet} di nome ${petName}; materia preferita: ${subject}.`,
    questions: {
      mcq: [
        mcq(random, `How old is ${kid.name}?`, String(age), [String(age + 1), String(age - 1)], `Cerca nel testo "years old".`),
        mcq(random, `Where does ${kid.name} live?`, city, two(random, CITIES, city), `Cerca nel testo "I live in".`),
        mcq(random, `What pet has ${kid.name} got?`, `A ${pet}.`, two(random, PETS, pet).map((other) => `A ${other}.`), `Cerca nel testo "I've got".`),
      ],
      tfng: [
        tfng(`${kid.name}'s favourite subject is ${subject}.`, "True", `Rileggi la frase con "favourite subject".`),
        tfng(`${kid.name}'s favourite subject is ${otherSubject}.`, "False", `Rileggi la frase con "favourite subject": dice proprio questo?`),
        tfng(notGiven, "Not given", `Il testo ne parla? Se non lo trovi da nessuna parte, è "Not given".`),
        tfng(`${kid.name} has got a brother.`, family.brother ? "True" : "Not given", `Rileggi con chi vive ${kid.name}: c'è un fratello?`),
      ],
      short: [
        { kind: "text", label: `What is the name of ${kid.name}'s ${pet}?`, accept: [petName], placeholder: "max 4 parole" },
      ],
    },
  };
}

const TRIPS = [
  { place: "the Science Museum", short: "science museum" },
  { place: "the zoo", short: "zoo" },
  { place: "the castle", short: "castle" },
  { place: "the aquarium", short: "aquarium" },
  { place: "a farm", short: "farm" },
];
const BRING = ["a packed lunch", "a raincoat", "a notebook", "comfortable shoes", "a hat"];
const TIMES = ["8.15", "8.30", "8.45", "9.00"];
const BACK = ["3.30", "4.00", "4.30"];

function notice(random: Random): Task {
  const trip = random.pick(TRIPS);
  const day = random.pick(WEEKDAYS.slice(0, 5));
  const date = random.int(2, 28);
  const month = random.pick(["March", "April", "May", "June"]);
  const time = random.pick(TIMES);
  const back = random.pick(BACK);
  const [item1, item2] = shuffle(random, BRING).slice(0, 2);
  const price = random.pick([8, 10, 12, 15, 18, 20]);
  const passage = [
    `SCHOOL TRIP TO ${trip.place.toUpperCase()}`,
    `Day: ${day} ${date} ${month}\nMeet: at the school gate at ${time}\nBring: ${item1}, ${item2} and a bottle of water\nPrice: ${price} euros`,
    `We come back to school at ${back}. Don't be late!`,
  ].join("\n\n");
  const otherDay = random.pick(WEEKDAYS.slice(0, 5).filter((candidate) => candidate !== day));
  return {
    passage,
    summary: `Gita a ${trip.place}: ${day} ${date} ${month}, ritrovo alle ${time}, rientro alle ${back}, costo ${price} euro.`,
    questions: {
      mcq: [
        mcq(random, "Where is the trip?", `To ${trip.place}.`, two(random, TRIPS, trip).map((other) => `To ${other.place}.`), "Leggi il titolo dell'avviso."),
        mcq(random, "What time do students meet?", time, [back, random.pick(TIMES.filter((candidate) => candidate !== time))], `Cerca nel testo "Meet".`),
        mcq(random, "What day is the trip?", day, [otherDay, random.pick(WEEKDAYS.filter((candidate) => candidate !== day && candidate !== otherDay))], `Cerca nel testo "Day".`),
      ],
      tfng: [
        tfng(`Students must bring ${item1}.`, "True", `Cerca nel testo "Bring".`),
        tfng(`The trip is on ${otherDay}.`, "False", `Cerca nel testo "Day": che giorno c'è scritto?`),
        tfng(random.pick(["The trip is by bus.", "There are thirty students on the trip.", "The teachers are very nice."]), "Not given", `L'avviso ne parla? Se non lo trovi, è "Not given".`),
      ],
      short: [
        { kind: "text", label: "How much is the trip? (in euros)", accept: numberAccept(price, "euros"), placeholder: "max 4 parole" },
        { kind: "text", label: "What time do students come back to school?", accept: [back, `at ${back}`, back.replace(".", ":"), `at ${back.replace(".", ":")}`], placeholder: "max 4 parole" },
      ],
    },
  };
}

const MEETINGS = [
  { place: "park", thing: "football", activity: "play a match" },
  { place: "swimming pool", thing: "swimming costume", activity: "swim" },
  { place: "library", thing: "maths book", activity: "do our homework together" },
  { place: "beach", thing: "volleyball", activity: "play volleyball" },
];

function message(random: Random): Task {
  const [kid, friend] = shuffle(random, KIDS).slice(0, 2);
  const meet = random.pick(MEETINGS);
  const time = random.pick(["three o'clock", "four o'clock", "half past four", "five o'clock"]);
  const companion = random.pick(["my cousin", "Tom and Lucy", "my sister"]);
  const passage = `Hi ${friend.name}!\n\nI'm at the ${meet.place} with ${companion}. Can you come here at ${time}? Bring your ${meet.thing}! We want to ${meet.activity}.\n\nSee you soon,\n${kid.name}`;
  return {
    passage,
    summary: `${kid.name} è al ${meet.place} e chiede a ${friend.name} di venire alle ${time} con ${meet.thing}.`,
    questions: {
      mcq: [
        mcq(random, `Where is ${kid.name}?`, `At the ${meet.place}.`, two(random, MEETINGS, meet).map((other) => `At the ${other.place}.`), `Cerca nel testo "I'm at".`),
        mcq(random, `What time must ${friend.name} come?`, cap(time), two(random, ["three o'clock", "four o'clock", "half past four", "five o'clock"], time).map(cap), `Cerca nel testo "come here at".`),
      ],
      tfng: [tfng(`${kid.name} is alone.`, "False", `Rileggi la prima frase: con chi è ${kid.name}?`)],
      short: [{ kind: "text", label: `What must ${friend.name} bring?`, accept: phraseAccept(meet.thing), placeholder: "max 4 parole" }],
    },
  };
}

const TRIPS_A2 = [
  { place: "the beach", did: "swam in the sea" },
  { place: "the countryside", did: "walked for two hours" },
  { place: "the city centre", did: "visited the old castle" },
  { place: "the lake", did: "rode our bikes around it" },
];
const COMPANIONS = ["cousin", "aunt", "best friend"];
const FOODS = [
  { text: "a big pizza", accept: ["a big pizza", "big pizza", "pizza", "a pizza"] },
  { text: "fish and chips", accept: ["fish and chips"] },
  { text: "a chicken sandwich", accept: ["a chicken sandwich", "chicken sandwich", "a sandwich", "sandwich"] },
  { text: "pasta with cheese", accept: ["pasta with cheese", "pasta"] },
];
const GAMES = ["chess", "cards", "a board game", "video games"];
const NEXT = ["the zoo", "the theme park", "the aquarium", "the swimming pool"];

function weekendEmail(random: Random): Task {
  const [kid, friend] = shuffle(random, KIDS).slice(0, 2);
  const trip = random.pick(TRIPS_A2);
  const companion = random.pick(COMPANIONS);
  const food = random.pick(FOODS);
  const film = random.pick(["a funny", "a scary", "an action"]);
  const game = random.pick(GAMES);
  const sibling = random.pick(["brother", "sister"]);
  const next = random.pick(NEXT);
  const passage = [
    `Hi ${friend.name},`,
    `How are you? I had a great weekend! On Saturday morning I went to ${trip.place} with my ${companion}. We ${trip.did} and then we had lunch in a small café. I ate ${food.text} – it was delicious!`,
    `In the afternoon it started to rain, so we went to the cinema and watched ${film} film.`,
    `On Sunday I didn't go out because I was very tired. I did my homework and in the evening I played ${game} with my ${sibling}.`,
    `Next weekend I want to go to ${next}. Do you want to come with me?`,
    `Write soon,\n${kid.name}`,
  ].join("\n\n");
  const His = cap(kid.his);
  return {
    passage,
    summary: `Sabato ${kid.name} è andato/a a ${trip.place} con ${kid.his} ${companion}, poi pioggia e cinema; domenica a casa; il prossimo weekend vuole andare a ${next}.`,
    questions: {
      mcq: [
        mcq(random, `Who did ${kid.name} go to ${trip.place} with?`, `${His} ${companion}.`, COMPANIONS.filter((other) => other !== companion).map((other) => `${His} ${other}.`), `Cerca nel testo "with my".`),
        mcq(random, "Why did they go to the cinema?", "Because it started to rain.", ["Because they were tired.", "Because it was cheap."], `Cerca nel testo "cinema": cosa c'è subito prima di "so"?`),
        mcq(random, `What did ${kid.name} do on Sunday evening?`, `${cap(kid.he)} played ${game}.`, [`${cap(kid.he)} went to ${next}.`, `${cap(kid.he)} watched a film.`], `Cerca nel testo "in the evening".`),
      ],
      tfng: [
        tfng(`${kid.name} went out on Sunday.`, "False", `Rileggi la parte su Sunday: "didn't go out".`),
        tfng("It rained on Saturday afternoon.", "True", `Cerca nel testo "In the afternoon".`),
        tfng(random.pick(["The café was expensive.", `${kid.name}'s ${sibling} won the game.`, `${friend.name} went to ${trip.place} too.`]), "Not given", `Il testo ne parla? Se non lo trovi da nessuna parte, è "Not given".`),
      ],
      short: [
        { kind: "text", label: `What did ${kid.name} eat?`, accept: food.accept, placeholder: "max 4 parole" },
        { kind: "text", label: `Where does ${kid.name} want to go next weekend?`, accept: phraseAccept(next).concat([`to ${next}`]), placeholder: "max 4 parole" },
      ],
    },
  };
}

function schoolDay(random: Random): Task {
  const kid = random.pick(KIDS);
  const day = random.pick(WEEKDAYS.slice(0, 5));
  const parent = random.pick(["mum", "dad"]);
  const test = random.pick(["maths", "science", "history", "English"]);
  const sport = random.pick(["football", "basketball", "volleyball"]);
  const He = cap(kid.he);
  const His = cap(kid.his);
  const passage = [
    `Last ${day}, ${kid.name} woke up late because ${kid.his} alarm didn't ring. ${He} got dressed quickly and ran to the bus stop, but the bus left without ${kid.him}. ${His} ${parent} drove ${kid.him} to school.`,
    `At school, ${kid.name} had a ${test} test. ${He} was worried, but the questions were easy and ${kid.he} finished early. After the test, ${kid.he} played ${sport} with ${kid.his} friends in the playground.`,
    `In the evening, ${kid.name} told ${kid.his} family about ${kid.his} day. Then ${kid.he} went to bed early.`,
  ].join("\n\n");
  return {
    passage,
    summary: `${kid.name} si è svegliato/a tardi, ha perso il bus, ${kid.his} ${parent} l'ha accompagnato/a; verifica di ${test} facile; poi ${sport}.`,
    questions: {
      mcq: [
        mcq(random, `Why did ${kid.name} wake up late?`, "Because the alarm didn't ring.", [`Because ${kid.he} was ill.`, "Because it was Sunday."], `Cerca nel testo "woke up late because".`),
        mcq(random, `How did ${kid.name} get to school?`, `${His} ${parent} drove ${kid.him}.`, ["By bus.", "On foot."], `Rileggi la fine del primo paragrafo: il bus è partito senza ${kid.him}.`),
      ],
      tfng: [
        tfng("The test was easy.", "True", `Cerca nel testo "the questions were".`),
        tfng(`${kid.name} caught the bus.`, "False", `Rileggi: "the bus left without ${kid.him}".`),
        tfng(random.pick([`${kid.name}'s teacher was angry.`, `${kid.name} got a very good mark.`, `${kid.name} had breakfast at home.`]), "Not given", `Il testo ne parla? Se non lo trovi, è "Not given".`),
      ],
      short: [
        { kind: "text", label: `What did ${kid.name} play after the test?`, accept: phraseAccept(sport), placeholder: "max 4 parole" },
        { kind: "text", label: "What subject was the test?", accept: phraseAccept(test).concat([`${test} test`]), placeholder: "max 4 parole" },
      ],
    },
  };
}

function build(random: Random, task: Task, counts: { mcq: number; tfng: number; short: number }, allowedMistakes: number, intro: string) {
  const questions = [
    ...shuffle(random, task.questions.mcq).slice(0, counts.mcq),
    ...shuffle(random, task.questions.tfng).slice(0, counts.tfng),
    ...shuffle(random, task.questions.short).slice(0, counts.short),
  ].map((question, index) => ({ ...question, label: `${index + 1}. ${question.label}` }));
  return taskItem({
    prompt: intro,
    passage: task.passage,
    questions,
    allowedMistakes,
    solution: [
      "Metodo: prima leggi le domande, poi cerca nel testo le loro parole (nomi, numeri, giorni).",
      "True = il testo lo dice · False = il testo dice il contrario · Not given = il testo non ne parla.",
      `In breve: ${task.summary}`,
    ],
  });
}

const READ_INTRO = "Leggi il testo e rispondi alle domande. Trucco: leggi prima le domande!";

export const readingA1: GeneratorFn = (random, difficulty) => {
  if (difficulty === 1) return build(random, random.chance(0.5) ? message(random) : profile(random), { mcq: 2, tfng: 0, short: 1 }, 0, READ_INTRO);
  const task = random.chance(0.5) ? profile(random) : notice(random);
  if (difficulty === 2) return build(random, task, { mcq: 2, tfng: 1, short: 1 }, 0, READ_INTRO);
  return build(random, task, { mcq: 2, tfng: 2, short: 1 }, 1, READ_INTRO);
};

export const readingA2: GeneratorFn = (random, difficulty) => {
  const task = difficulty === 1 ? weekendEmail(random) : random.chance(0.5) ? weekendEmail(random) : schoolDay(random);
  if (difficulty === 1) return build(random, task, { mcq: 2, tfng: 2, short: 0 }, 0, READ_INTRO);
  if (difficulty === 2) return build(random, task, { mcq: 2, tfng: 2, short: 1 }, 1, READ_INTRO);
  return build(random, task, { mcq: 2, tfng: 2, short: 2 }, 1, READ_INTRO);
};

type Line = { voice: 0 | 1; text: string };

type Listening = { lines: Line[]; questions: TaskQuestion[] };

const PARTY_FOODS = [
  { text: "crisps", accept: ["crisps", "some crisps"] },
  { text: "a cake", accept: ["a cake", "cake"] },
  { text: "some lemonade", accept: ["some lemonade", "lemonade"] },
  { text: "pizza", accept: ["pizza", "some pizza", "a pizza"] },
];
const PARTY_TIMES = ["four o'clock", "five o'clock", "half past six", "seven o'clock"];

function voicemail(random: Random): Listening {
  const [kid, friend] = shuffle(random, KIDS).slice(0, 2);
  const day = random.pick(WEEKDAYS);
  const time = random.pick(PARTY_TIMES);
  const food = random.pick(PARTY_FOODS);
  const number = random.int(3, 40);
  const street = random.pick(["Green Street", "Park Road", "King Street"]);
  return {
    lines: [{ voice: 0, text: `Hi ${friend.name}, it's ${kid.name}. My birthday party is on ${day} at ${time}. It's at my house, number ${number}, ${street}. Please bring ${food.text}. See you on ${day}!` }],
    questions: [
      mcq(random, "When is the party?", `On ${day}.`, two(random, WEEKDAYS, day).map((other) => `On ${other}.`), "Ascolta quando dice \"My birthday party is on…\"."),
      mcq(random, "What time is the party?", cap(time), two(random, PARTY_TIMES, time).map(cap), "Ascolta subito dopo il giorno: \"at…\"."),
      { kind: "text", label: `What must ${friend.name} bring?`, accept: food.accept, placeholder: "max 4 parole" },
    ],
  };
}

const SHOP_ITEMS = ["a T-shirt", "a cap", "a pair of trainers", "a backpack"];

function shop(random: Random): Listening {
  const item = random.pick(SHOP_ITEMS);
  const price = random.pick([8, 12, 15, 20, 25]);
  return {
    lines: [
      { voice: 0, text: "Hello! Can I help you?" },
      { voice: 1, text: `Yes, please. I'd like ${item}.` },
      { voice: 0, text: "Here you are. Anything else?" },
      { voice: 1, text: "No, thank you. How much is it?" },
      { voice: 0, text: `It's ${NUMBER_WORDS[price]} euros.` },
      { voice: 1, text: "Here you are. Thanks!" },
    ],
    questions: [
      mcq(random, "What does the customer buy?", cap(item), two(random, SHOP_ITEMS, item).map(cap), "Ascolta cosa dice dopo \"I'd like\"."),
      mcq(random, "How much is it?", `${price} euros`, [`${price + 5} euros`, `${price - 2} euros`], "Ascolta la risposta a \"How much is it?\"."),
    ],
  };
}

const PLACES = ["cinema", "park", "swimming pool", "shopping centre"];
const CLUBS = ["football practice", "a piano lesson", "a lot of homework", "a dentist appointment"];

function plans(random: Random): Listening {
  const second = random.pick(KIDS);
  const place = random.pick(PLACES);
  const [day1, day2] = shuffle(random, WEEKDAYS).slice(0, 2);
  const club = random.pick(CLUBS);
  const time = random.pick(["two o'clock", "three o'clock", "half past three", "four o'clock"]);
  const otherDay = random.pick(WEEKDAYS.filter((candidate) => candidate !== day1 && candidate !== day2));
  return {
    lines: [
      { voice: 0, text: `Hi ${second.name}! Do you want to go to the ${place} on ${day1}?` },
      { voice: 1, text: `Sorry, I can't on ${day1}. I've got ${club}. What about ${day2}?` },
      { voice: 0, text: `${day2} is fine. Let's meet at ${time} in front of the ${place}.` },
      { voice: 1, text: "Great! See you then." },
    ],
    questions: [
      mcq(random, "Where do they want to go?", `To the ${place}.`, two(random, PLACES, place).map((other) => `To the ${other}.`), "Ascolta la prima domanda: \"Do you want to go to…\"."),
      mcq(random, "When do they meet?", `On ${day2}.`, [`On ${day1}.`, `On ${otherDay}.`], "Attento alla trappola: il primo giorno non va bene (\"Sorry, I can't\"). Quale giorno va bene alla fine?"),
      mcq(random, "What time do they meet?", cap(time), two(random, ["two o'clock", "three o'clock", "half past three", "four o'clock"], time).map(cap), "Ascolta \"Let's meet at…\"."),
    ],
  };
}

function station(random: Random): Listening {
  const city = random.pick(CITIES);
  const [t1, t2] = random.pick([["9.15", "9.45"], ["10.30", "11.00"], ["2.15", "2.45"]]);
  const price = random.pick([12, 15, 18, 20]);
  const platform = random.int(2, 9);
  const ticket = random.pick(["return", "single"]);
  return {
    lines: [
      { voice: 1, text: `Good morning. A ${ticket} ticket to ${city}, please.` },
      { voice: 0, text: "For today?" },
      { voice: 1, text: "Yes. What time is the next train?" },
      { voice: 0, text: `There's one at ${t1}, but it's very busy. The next one is at ${t2}.` },
      { voice: 1, text: `I'll take the ${t2} train, please. How much is it?` },
      { voice: 0, text: `It's ${NUMBER_WORDS[price]} pounds. It leaves from platform ${NUMBER_WORDS[platform]}.` },
      { voice: 1, text: "Thank you very much." },
    ],
    questions: [
      mcq(random, "Where is the passenger going?", `To ${city}.`, two(random, CITIES, city).map((other) => `To ${other}.`), "Ascolta la prima frase: \"a ticket to…\"."),
      mcq(random, "What kind of ticket does the passenger buy?", `A ${ticket} ticket.`, [`A ${ticket === "return" ? "single" : "return"} ticket.`, "A weekly ticket."], "Ascolta la prima frase: return = andata e ritorno, single = solo andata."),
      mcq(random, "Which train does the passenger take?", `The ${t2} train.`, [`The ${t1} train.`, "The 12.00 train."], `Trappola: il treno delle ${t1} è troppo pieno. Quale prende alla fine?`),
      mcq(random, "How much is the ticket?", `${price} pounds`, [`${price + 2} pounds`, `${price - 3} pounds`], "Ascolta la risposta a \"How much is it?\"."),
      { kind: "text", label: "Which platform does the train leave from? (number)", accept: numberAccept(platform), placeholder: "max 4 parole" },
    ],
  };
}

const LOST = ["umbrella", "backpack", "jacket", "phone"];
const COLOURS = ["red", "blue", "green", "black", "yellow"];

function lostItem(random: Random): Listening {
  const kid = random.pick(KIDS);
  const item = random.pick(LOST);
  const colour = random.pick(COLOURS);
  const bus = random.int(10, 40);
  const time = random.pick(["eight o'clock", "half past eight", "nine o'clock"]);
  return {
    lines: [
      { voice: 1, text: `Hello, this is ${kid.name}. I think I left my ${item} on the bus this morning.` },
      { voice: 0, text: "Which bus were you on?" },
      { voice: 1, text: `The number ${bus}, at about ${time}.` },
      { voice: 0, text: "What colour is it?" },
      { voice: 1, text: `It's ${colour}, with my name on it.` },
      { voice: 0, text: `OK, we've got a ${colour} ${item} here. You can collect it tomorrow after ten o'clock.` },
      { voice: 1, text: "Brilliant, thank you!" },
    ],
    questions: [
      mcq(random, `What did ${kid.name} lose?`, `${cap(kid.his)} ${item}.`, two(random, LOST, item).map((other) => `${cap(kid.his)} ${other}.`), "Ascolta la prima frase: \"I left my…\"."),
      mcq(random, "Which bus was it?", `Number ${bus}.`, [`Number ${bus + 10}.`, `Number ${bus - 5}.`], "Ascolta la risposta a \"Which bus were you on?\"."),
      mcq(random, `When can ${kid.name} collect it?`, "Tomorrow after ten o'clock.", ["Today after ten o'clock.", `Tomorrow at ${time}.`], "Ascolta l'ultima frase dell'ufficio: today o tomorrow?"),
      { kind: "text", label: `What colour is the ${item}?`, accept: [colour], placeholder: "max 4 parole" },
    ],
  };
}

function transcript(lines: Line[]): string {
  return lines.length === 1 ? lines[0].text : lines.map((line) => `${line.voice === 0 ? "A" : "B"}: ${line.text}`).join(" ");
}

function listen(random: Random, task: Listening, count: number, maxPlays: number | undefined, allowedMistakes: number) {
  const mcqs = task.questions.filter((question) => question.kind === "select");
  const shorts = task.questions.filter((question) => question.kind === "text");
  const picked = [...mcqs.slice(0, count), ...shorts].slice(0, count);
  const questions = picked.map((question, index) => ({ ...question, label: `${index + 1}. ${question.label}` }));
  const text = task.lines.map((line) => line.text).join(" ");
  return taskItem({
    prompt: `Ascolta e rispondi alle domande. Prima leggi le domande, poi ascolta.${maxPlays ? ` Puoi ascoltare ${maxPlays === 2 ? "due" : "tre"} volte, come all'INVALSI.` : ""}`,
    audio: { text, lang: "en-GB", ...(task.lines.length > 1 ? { dialogue: task.lines } : {}), ...(maxPlays ? { maxPlays } : {}) },
    questions,
    allowedMistakes,
    solution: ["Primo ascolto: chi parla, dove sono, cosa succede. Secondo ascolto: i dettagli delle domande.", `Trascrizione: ${transcript(task.lines)}`],
  });
}

export const listeningA1: GeneratorFn = (random, difficulty) => {
  if (difficulty === 1) return listen(random, random.chance(0.5) ? voicemail(random) : shop(random), 2, undefined, 0);
  const task = random.pick([voicemail, shop, plans])(random);
  return listen(random, task, 3, difficulty === 3 ? 2 : undefined, 0);
};

export const listeningA2: GeneratorFn = (random, difficulty) => {
  const task = random.chance(0.5) ? station(random) : lostItem(random);
  if (difficulty === 1) return listen(random, task, 3, undefined, 0);
  if (difficulty === 2) return listen(random, task, 4, 3, 1);
  return listen(random, task, 5, 2, 1);
};
