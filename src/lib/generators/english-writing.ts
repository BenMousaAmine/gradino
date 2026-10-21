import { choiceItem, distinctOptions, orderItem, shuffle, textItem, type GeneratorFn } from "./build";

type Exchange = {
  cue: string;
  reply: string;
  wrong: readonly [string, string];
  gap: { line: "cue" | "reply"; text: string; accept: string[] };
  why: string;
};

const EXCHANGES: readonly Exchange[] = [
  { cue: "Can I help you?", reply: "Yes, I'd like a T-shirt, please.", wrong: ["Yes, I'm fine, thanks.", "No, it's raining."], gap: { line: "reply", text: "Yes, I'd ___ a T-shirt, please.", accept: ["like"] }, why: "In negozio: I'd like… = vorrei…" },
  { cue: "How much is it?", reply: "It's twelve euros.", wrong: ["It's half past twelve.", "It's very big."], gap: { line: "cue", text: "___ much is it?", accept: ["How"] }, why: "How much? = quanto costa? Si risponde con il prezzo." },
  { cue: "Excuse me, where is the station?", reply: "Go straight on and turn left.", wrong: ["It's at eight o'clock.", "Yes, I am."], gap: { line: "cue", text: "Excuse me, ___ is the station?", accept: ["where"] }, why: "Where…? = dove…? Si risponde con le indicazioni." },
  { cue: "Would you like to come to my party?", reply: "Yes, I'd love to!", wrong: ["Yes, I like it.", "No, I'm twelve."], gap: { line: "reply", text: "Yes, I'd ___ to!", accept: ["love"] }, why: "Per accettare un invito: Yes, I'd love to!" },
  { cue: "What time is it?", reply: "It's half past four.", wrong: ["It's Monday.", "It's four euros."], gap: { line: "cue", text: "What ___ is it?", accept: ["time"] }, why: "What time is it? = che ore sono? Si risponde con l'ora." },
  { cue: "Are you ready to order?", reply: "Yes, can I have a pizza, please?", wrong: ["Yes, I'm ready to go to bed.", "No, I haven't got a pizza."], gap: { line: "reply", text: "Yes, ___ I have a pizza, please?", accept: ["can", "could"] }, why: "Al ristorante: Can I have…? = posso avere…?" },
  { cue: "How are you?", reply: "I'm fine, thanks. And you?", wrong: ["I'm twelve years old.", "I'm from Italy."], gap: { line: "reply", text: "I'm ___, thanks. And you?", accept: ["fine", "good", "well", "ok", "okay", "great"] }, why: "How are you? = come stai? I'm fine, thanks." },
  { cue: "What's your favourite sport?", reply: "I love football.", wrong: ["I'm good, thank you.", "It's on Saturday."], gap: { line: "cue", text: "What's your ___ sport?", accept: ["favourite", "favorite"] }, why: "favourite = preferito." },
  { cue: "Where are you from?", reply: "I'm from Italy.", wrong: ["I'm fine.", "I'm at school."], gap: { line: "cue", text: "Where ___ you from?", accept: ["are"] }, why: "Where are you from? = di dove sei? I'm from…" },
  { cue: "Can you help me with my homework?", reply: "Sure, no problem!", wrong: ["Yes, I can swim.", "It's on the table."], gap: { line: "reply", text: "Sure, no ___!", accept: ["problem"] }, why: "Per dire di sì a una richiesta: Sure, no problem!" },
  { cue: "What do you usually do at the weekend?", reply: "I usually play tennis.", wrong: ["I'm playing tennis now.", "At the weekend."], gap: { line: "reply", text: "I ___ play tennis.", accept: ["usually", "always", "often", "sometimes"] }, why: "usually = di solito: abitudine → present simple." },
  { cue: "Thank you very much!", reply: "You're welcome.", wrong: ["Yes, please.", "I'm sorry."], gap: { line: "reply", text: "You're ___.", accept: ["welcome"] }, why: "Thank you → You're welcome (prego)." },
];

const SCRIPTS: readonly (readonly string[])[] = [
  ["Hello! Can I help you?", "Yes, I'd like a T-shirt, please.", "Here you are. It's twelve euros.", "Thank you. Here's the money."],
  ["Excuse me, where is the station?", "Go straight on and turn left.", "Is it far?", "No, it's about five minutes on foot."],
  ["Would you like to come to my party on Saturday?", "Yes, I'd love to! What time?", "At four o'clock, at my house.", "Great, see you on Saturday!"],
  ["Are you ready to order?", "Yes, can I have a pizza, please?", "Anything to drink?", "Just water, please."],
  ["Hello, can I speak to Tom, please?", "Sorry, he isn't at home.", "Can you tell him to call me?", "Of course. Bye!"],
  ["Good morning! What would you like?", "A hot chocolate, please.", "Small or large?", "Large, please."],
  ["Hi! How was your weekend?", "Great, thanks! I went to the beach.", "Lucky you! Was it sunny?", "Yes, it was very hot."],
  ["Excuse me, what time does the museum open?", "It opens at nine o'clock.", "And how much is a ticket?", "It's five euros for students."],
];

export const dialogue: GeneratorFn = (random, difficulty) => {
  if (difficulty === 2) {
    const script = random.pick(SCRIPTS);
    return orderItem({
      prompt: "Metti in ordine le battute del dialogo.",
      steps: script.map((text, index) => ({ id: `s${index + 1}`, text: `${index % 2 === 0 ? "A" : "B"}: ${text}` })),
      solution: ["Trova la battuta che apre il dialogo (un saluto o una domanda), poi segui domanda → risposta.", script.join(" → ")],
    });
  }
  const exchange = random.pick(EXCHANGES);
  if (difficulty === 1) {
    const { options, correctId, idOf } = distinctOptions(random, exchange.reply, [...exchange.wrong]);
    return choiceItem({
      prompt: `Scegli la risposta giusta. A: "${exchange.cue}"`,
      options,
      correct: correctId,
      errors: exchange.wrong.map((text) => ({ option: idOf(text), tag: "eng_dialogue_reply", message: `La risposta deve rispondere proprio alla domanda. ${exchange.why}` })),
      solution: [exchange.why, `A: ${exchange.cue} B: ${exchange.reply}`],
    });
  }
  const cue = exchange.gap.line === "cue" ? exchange.gap.text : exchange.cue;
  const reply = exchange.gap.line === "reply" ? exchange.gap.text : exchange.reply;
  return textItem({
    prompt: `Completa la battuta con la parola che manca. A: "${cue}" B: "${reply}"`,
    fields: [{ id: "word", label: "", placeholder: "la parola che manca", accept: exchange.gap.accept }],
    solution: [exchange.why, `A: ${exchange.cue} B: ${exchange.reply}`],
  });
};

const FRIENDS = ["Tom", "Anna", "Jack", "Lucy", "Sam", "Emma"];
const PLACES = ["beach", "zoo", "lake", "castle"];

type PhraseQuestion = { prompt: string; correct: string; wrong: readonly [string, string]; why: string };

const PHRASES: readonly PhraseQuestion[] = [
  { prompt: "Quale frase usi per INIZIARE un'email a un amico?", correct: "Hi Tom,", wrong: ["Love, Tom", "Write soon!"], why: "Si inizia con il saluto: Hi / Dear + nome + virgola." },
  { prompt: "Quale frase usi per CHIUDERE un'email a un amico?", correct: "Write soon!", wrong: ["Hi Anna,", "How are you?"], why: "Si chiude con Write soon! / See you soon! e poi Love, + nome." },
  { prompt: "Quale frase usi per RINGRAZIARE dell'email che hai ricevuto?", correct: "Thanks for your email.", wrong: ["See you at school.", "My name is Tom."], why: "Apertura tipica: How are you? Thanks for your email." },
  { prompt: "Quale frase usi per FARE UNA DOMANDA al tuo amico alla fine?", correct: "What about you?", wrong: ["I'm fine.", "Love, Anna"], why: "What about you? = e tu? Serve per far rispondere l'amico." },
  { prompt: "Scegli il connettivo giusto: It was raining, ___ we stayed at home.", correct: "so", wrong: ["but", "because"], why: "so = quindi (la conseguenza)." },
  { prompt: "Scegli il connettivo giusto: I like football, ___ I don't like tennis.", correct: "but", wrong: ["so", "because"], why: "but = ma (una cosa diversa, al contrario)." },
  { prompt: "Scegli il connettivo giusto: I stayed at home ___ I was ill.", correct: "because", wrong: ["so", "but"], why: "because = perché (la causa)." },
  { prompt: "Scegli il connettivo giusto: First we had lunch, ___ we went to the park.", correct: "then", wrong: ["because", "but"], why: "then = poi (quello che viene dopo)." },
];

export const email: GeneratorFn = (random, difficulty) => {
  const [writer, friend] = shuffle(random, FRIENDS).slice(0, 2);
  const place = random.pick(PLACES);
  if (difficulty === 1) {
    const parts = [
      `Hi ${friend},`,
      "How are you? Thanks for your email.",
      `Last weekend I went to the ${place} with my family. We had a great time!`,
      "What about you? Write soon!",
      `Love, ${writer}`,
    ];
    return orderItem({
      prompt: "Metti in ordine le parti dell'email.",
      steps: parts.map((text, index) => ({ id: `p${index + 1}`, text })),
      solution: ["Schema fisso: saluto → apertura (How are you? Thanks for…) → racconto → domanda e chiusura → firma.", parts.join(" / ")],
    });
  }
  if (difficulty === 2) {
    const question = random.pick(PHRASES);
    const { options, correctId, idOf } = distinctOptions(random, question.correct, [...question.wrong]);
    return choiceItem({
      prompt: question.prompt,
      options,
      correct: correctId,
      errors: question.wrong.map((text) => ({ option: idOf(text), tag: "eng_email_phrase", message: question.why })),
      solution: [question.why],
    });
  }
  return textItem({
    prompt: `Completa l'email di ${writer} con le parole giuste (i verbi sono al passato).`,
    fields: [
      { id: "b1", label: `Hi ${friend}! Last Saturday I (1) ___ (go) to the ${place} with my cousin.`, placeholder: "(1)", accept: ["went"], errors: [{ answers: ["goed", "go", "gone"], tag: "eng_irregular_regularized", message: "go è irregolare: go – went – gone. Al passato: went." }] },
      { id: "b2", label: "We (2) ___ (have) a great time.", placeholder: "(2)", accept: ["had"], errors: [{ answers: ["haved", "have", "has"], tag: "eng_irregular_regularized", message: "have è irregolare: have – had – had. Al passato: had." }] },
      { id: "b3", label: "It was sunny, (3) ___ we ate an ice cream.", placeholder: "(3)", accept: ["so", "and"], errors: [{ answers: ["because", "but"], tag: "eng_email_phrase", message: "Il sole è la causa del gelato: so = quindi (oppure and)." }] },
      { id: "b4", label: "In the evening I stayed at home (4) ___ I was very tired.", placeholder: "(4)", accept: ["because"], errors: [{ answers: ["so", "but"], tag: "eng_email_phrase", message: "because = perché (la causa). so vuol dire quindi." }] },
    ],
    solution: [
      `Hi ${friend}! Last Saturday I went to the ${place} with my cousin. We had a great time. It was sunny, so we ate an ice cream. In the evening I stayed at home because I was very tired.`,
      "Connettivi: and (e), but (ma), so (quindi), because (perché), then (poi).",
    ],
  });
};
