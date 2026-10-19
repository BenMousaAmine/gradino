import type { EventRow } from "@/lib/admin/metrics";
import { accuracy, type Signals } from "./engine";

export type Insight = {
  id: string;
  tone: "bad" | "warn" | "good" | "info";
  title: string;
  detail: string;
  todo?: string;
  product?: string;
};

export type NudgeStats = { shown: number; tried: number; skipped: number };
export type CoachStats = { skip: NudgeStats; hesitation: NudgeStats };

const ERROR_NAMES: Record<string, string> = {
  times_tables_not_automatic: "tabelline non automatiche",
  order_of_operations: "ordine delle operazioni",
  not_simplified: "risultato non semplificato",
  power_product_multiply_bases: "potenze: moltiplica le basi invece di tenerle",
  root_of_sum: "radice di una somma",
  unit_missing: "unità di misura dimenticata",
  unit_wrong: "unità di misura sbagliata",
};

const TONE_ORDER: Record<Insight["tone"], number> = { bad: 0, warn: 1, info: 2, good: 3 };

export function coachStats(events: readonly EventRow[]): CoachStats {
  const empty = (): NudgeStats => ({ shown: 0, tried: 0, skipped: 0 });
  const stats: CoachStats = { skip: empty(), hesitation: empty() };
  for (const event of events) {
    if (event.type !== "coach") continue;
    const kind = event.payload.kind;
    const action = event.payload.action;
    if ((kind !== "skip" && kind !== "hesitation") || (action !== "shown" && action !== "tried" && action !== "skipped")) continue;
    stats[kind][action] += 1;
  }
  return stats;
}

export function parentReport(signals: Signals, titleOf: (skillId: string) => string, coach?: CoachStats): Insight[] {
  const insights: Insight[] = [];

  if (signals.skipRate !== null && signals.skipRate >= 20) {
    insights.push({
      id: "skips",
      tone: signals.skipRate >= 30 ? "bad" : "warn",
      title: `Dice “Non lo so” nel ${signals.skipRate}% delle domande`,
      detail: "Spesso si ferma prima di provare: può essere una lacuna vera o la paura di sbagliare.",
      todo: "Chiedigli di scrivere sempre il primo passaggio, anche se è sbagliato.",
      product: "Prima di “Non lo so” l’app gli propone di provare (attivo).",
    });
  }
  if (signals.thinkSeconds !== null && signals.thinkSeconds >= 25) {
    insights.push({
      id: "hesitation",
      tone: "warn",
      title: `Aspetta ${signals.thinkSeconds} secondi prima di scrivere`,
      detail: "Legge e ci pensa a lungo prima di iniziare: spesso non sa da dove partire.",
      todo: "Allenalo a scrivere subito i dati che ha, anche uno solo.",
      product: "Dopo 30 secondi senza scrivere gli compare un aiuto per partire (attivo).",
    });
  }
  if (signals.problems && accuracy(signals.problems) < 50) {
    insights.push({
      id: "problems",
      tone: "bad",
      title: `Problemi a parole: ${signals.problems.correct} ${signals.problems.correct === 1 ? "giusto" : "giusti"} su ${signals.problems.total}`,
      detail: "È la parte più difficile per lui: capire il testo e impostare i passaggi.",
      todo: "Fagli leggere il testo ad alta voce e dire con parole sue cosa chiede.",
      product: "Servono più problemi guidati passo passo nel blocco Problemi.",
    });
  }
  if (signals.fatigue && signals.fatigue.before - signals.fatigue.after >= 10) {
    insights.push({
      id: "fatigue",
      tone: "warn",
      title: `Cala nella seconda parte: dal ${signals.fatigue.before}% al ${signals.fatigue.after}% di giuste`,
      detail: "Nell’ultima giornata lunga la precisione scende verso la fine.",
      todo: "Controlla che le pause le faccia davvero: in piedi, lontano dallo schermo.",
      product: "Valutare blocchi più corti o una pausa in più per lui.",
    });
  }
  if (signals.awayPerHour !== null && signals.awayPerHour >= 6) {
    insights.push({
      id: "focus",
      tone: "warn",
      title: `Esce dall’app ${Math.round(signals.awayPerHour)} volte all’ora`,
      detail: "Si distrae spesso durante gli esercizi, anche se per poco tempo.",
      todo: "Telefono in un’altra stanza durante la sessione.",
      product: "Valutare un promemoria di concentrazione all’inizio di ogni blocco.",
    });
  }
  if (signals.advanced && accuracy(signals.advanced) < 35) {
    insights.push({
      id: "advanced",
      tone: "warn",
      title: `Gradino 3 (avanzato): ${signals.advanced.correct} ${signals.advanced.correct === 1 ? "giusta" : "giuste"} su ${signals.advanced.total}`,
      detail: "Gli esercizi avanzati sono ancora troppo difficili per lui.",
      product: "Restare più a lungo su gradino 1 e 2 prima di salire.",
    });
  }
  const named = signals.errors.filter(({ tag }) => ERROR_NAMES[tag]);
  if (named.length > 0) {
    insights.push({
      id: "errors",
      tone: "warn",
      title: "Errori che ripete",
      detail: named.map(({ tag, count }) => `${ERROR_NAMES[tag]}${count > 1 ? ` (${count}×)` : ""}`).join(", "),
      todo: "Ripassali insieme: sono lacune precise, si recuperano in pochi minuti.",
      product: "Il consigliere glieli ripropone come consiglio del giorno.",
    });
  }
  if (coach && coach.skip.shown >= 3) {
    const rate = Math.round((coach.skip.tried / coach.skip.shown) * 100);
    insights.push({
      id: "coach-skip",
      tone: rate >= 50 ? "good" : "info",
      title: `Invito a provare prima di “Non lo so”: ci ha provato ${coach.skip.tried} volte su ${coach.skip.shown}`,
      detail: rate >= 50 ? "L’invito funziona: più della metà delle volte prova invece di arrendersi." : "L’invito da solo non basta ancora.",
      ...(rate < 50 && { product: "Provare un aiuto più concreto: suggerirgli il primo passaggio." }),
    });
  }
  if (coach && coach.hesitation.shown >= 3) {
    insights.push({
      id: "coach-hesitation",
      tone: "info",
      title: `Aiuto per partire mostrato ${coach.hesitation.shown} volte`,
      detail: "Gli è comparso quando restava più di 30 secondi senza scrivere.",
    });
  }
  if (signals.strengths.length > 0) {
    insights.push({
      id: "strengths",
      tone: "good",
      title: "Dove è forte",
      detail: signals.strengths
        .slice(0, 4)
        .map((strength) => `${titleOf(strength.skillId)} (${strength.correct} su ${strength.total})`)
        .join(", "),
      todo: "Diglielo: è il punto da cui ripartire quando si scoraggia.",
    });
  }

  return insights.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
}
