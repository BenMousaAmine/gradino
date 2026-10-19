import { accuracy, type Signals } from "./engine";

export type Tip = { id: string; title: string; body: string; action?: { label: string; href: string } };

export type CoachFlags = { skips: boolean; hesitation: boolean };

const TIMES_TABLES = "math.calc.times-tables";

const ERROR_TIPS: Record<string, Omit<Tip, "id">> = {
  times_tables_not_automatic: {
    title: "Tabelline a memoria",
    body: "3 minuti di tabelline al giorno le rendono automatiche: poi tutto il resto costa meno fatica.",
  },
  order_of_operations: {
    title: "Prima × e ÷, poi + e −",
    body: "Nelle espressioni fai prima moltiplicazioni e divisioni, poi addizioni e sottrazioni. Le parentesi vengono prima di tutto.",
  },
  not_simplified: {
    title: "Ultimo controllo: semplifica",
    body: "Prima di confermare una frazione chiediti: posso dividere sopra e sotto per lo stesso numero?",
  },
  power_product_multiply_bases: {
    title: "Potenze: la base resta quella",
    body: "a² · a³ = a⁵: la base non cambia, gli esponenti si sommano.",
  },
  unit_missing: {
    title: "Non dimenticare l’unità",
    body: "Un numero senza unità di misura è a metà: 12 cosa? cm, m², litri? Scrivila sempre.",
  },
  unit_wrong: {
    title: "Controlla l’unità",
    body: "Prima di rispondere guarda cosa chiede la domanda: cm o m? cm² o cm³? Converti alla fine.",
  },
  root_of_sum: {
    title: "Radice di una somma",
    body: "√(9 + 16) non fa 3 + 4: prima fai la somma (25), poi la radice (5).",
  },
};

const SKIPS_THRESHOLD = 20;
const THINK_THRESHOLD = 25;

export function coachFlags(signals: Signals): CoachFlags {
  return {
    skips: signals.skipRate !== null && signals.skipRate >= SKIPS_THRESHOLD,
    hesitation: signals.thinkSeconds !== null && signals.thinkSeconds >= THINK_THRESHOLD,
  };
}

export function coachTips(signals: Signals, hasSkill: (skillId: string) => boolean): Tip[] {
  const flags = coachFlags(signals);
  const tips: Tip[] = [];
  if (flags.skips) {
    tips.push({
      id: "skips",
      title: "Sfida: prova prima di arrenderti",
      body: "Prima di premere “Non lo so”, scrivi almeno il primo passaggio. Anche se è sbagliato va bene: è così che si impara.",
    });
  }
  for (const { tag } of signals.errors) {
    const tip = ERROR_TIPS[tag];
    if (!tip) continue;
    const action =
      tag === "times_tables_not_automatic" && hasSkill(TIMES_TABLES)
        ? { label: "Allenati 3 minuti", href: `/skill/${TIMES_TABLES}` }
        : undefined;
    tips.push({ id: tag, ...tip, ...(action && { action }) });
  }
  if (flags.hesitation) {
    tips.push({
      id: "start",
      title: "Non sai da dove partire?",
      body: "Scrivi subito i dati che hai, anche uno solo. Spesso il resto arriva da sé.",
    });
  }
  if (signals.problems && accuracy(signals.problems) < 50) {
    tips.push({
      id: "problems",
      title: "Il trucco dei problemi",
      body: "Leggi il testo due volte e cerchia la domanda. Poi scrivi cosa sai e cosa cerchi, prima di fare i calcoli.",
    });
  }
  if (signals.awayPerHour !== null && signals.awayPerHour >= 6) {
    tips.push({
      id: "focus",
      title: "Una cosa alla volta",
      body: "Metti il telefono in un’altra stanza mentre studi: 25 minuti di concentrazione vera valgono più di un’ora distratta.",
    });
  }
  if (signals.fatigue && signals.fatigue.before - signals.fatigue.after >= 10) {
    tips.push({
      id: "pause",
      title: "La pausa fa parte dello studio",
      body: "Quando arriva la pausa alzati davvero: bevi, muoviti, guarda fuori. Dopo, la testa lavora meglio.",
    });
  }
  return tips;
}

export function tipOfDay(tips: readonly Tip[], day: string): Tip | null {
  if (tips.length === 0) return null;
  return tips[Math.floor(Date.parse(`${day}T12:00:00Z`) / 86_400_000) % tips.length];
}

export function cheer(signals: Signals, titleOf: (skillId: string) => string): Tip | null {
  const best = signals.strengths[0];
  if (!best) return null;
  return {
    id: `cheer:${best.skillId}`,
    title: "Qui sei forte 💪",
    body: `${titleOf(best.skillId)}: ${best.correct} su ${best.total} giuste. Continua così!`,
  };
}
