import { describe, expect, it } from "vitest";
import type { AnswerRow, AnswerStatsRow } from "@/lib/admin/metrics";
import type { EventRow } from "@/lib/admin/metrics";
import { chunks, computeSignals, dailySignals } from "./engine";
import { coachStats, parentReport } from "./report";
import { cheer, coachFlags, coachTips, tipOfDay } from "./tips";

function stats(partial: Partial<AnswerStatsRow>): AnswerStatsRow {
  return { firstInputMs: 5_000, inputs: 3, corrections: 0, unitChanges: 0, idleCount: 0, idleMs: 0, awayCount: 0, awayMs: 0, ...partial };
}

function answer(minute: number, partial: Partial<AnswerRow>): AnswerRow {
  return {
    id: `${minute}:${Math.random().toString(36)}`,
    skillId: "math.frac.add-sub",
    level: "base",
    purpose: "practice",
    score: 1,
    errorTag: null,
    message: null,
    timeMs: 40_000,
    createdAt: new Date(Date.parse("2026-10-19T15:45:00Z") + minute * 60_000).toISOString(),
    sessionId: null,
    stats: stats({}),
    attempts: 1,
    finalScore: partial.score ?? 1,
    retryMs: 0,
    noteMs: null,
    noteSource: null,
    ...partial,
  };
}

function struggling(): AnswerRow[] {
  const early = Array.from({ length: 12 }, (_, index) =>
    answer(index, { score: index < 8 ? 1 : 0, errorTag: index < 8 ? null : "wrong", stats: stats({ firstInputMs: 36_000, awayCount: 1 }) }),
  );
  const late = Array.from({ length: 12 }, (_, index) =>
    answer(40 + index, {
      skillId: "math.pow.properties",
      score: index < 3 ? 1 : 0,
      errorTag: index < 3 ? null : index < 9 ? "skipped" : "power_product_multiply_bases",
      level: index % 2 === 0 ? "advanced" : "medium",
      stats: stats({ firstInputMs: 40_000 }),
    }),
  );
  const problems = Array.from({ length: 4 }, (_, index) =>
    answer(60 + index, { skillId: "math.ps.multi-step", score: 0, errorTag: "wrong", timeMs: 120_000 }),
  );
  return [
    answer(-30, { skillId: "math.calc.times-tables", score: 0, errorTag: "times_tables_not_automatic" }),
    ...early,
    ...late,
    ...problems,
  ];
}

describe("signals", () => {
  it("finds skipping, slow starts, fatigue, distractions, weak problems and strengths", () => {
    const signals = computeSignals(struggling());
    expect(signals.answers).toBe(29);
    expect(signals.skipRate).toBe(21);
    expect(signals.thinkSeconds).toBe(36);
    expect(signals.fatigue).toEqual({ before: 64, after: 13 });
    expect(signals.problems).toEqual({ correct: 0, total: 4 });
    expect(signals.advanced).toEqual({ correct: 2, total: 6 });
    expect(signals.awayPerHour).toBe(29.2);
    expect(signals.errors).toEqual([
      { tag: "power_product_multiply_bases", count: 3 },
      { tag: "times_tables_not_automatic", count: 1 },
    ]);
    expect(signals.strengths).toEqual([]);
  });

  it("stays quiet when there is too little data", () => {
    const signals = computeSignals([answer(0, { errorTag: "skipped", score: 0 }), answer(1, {})]);
    expect(signals).toMatchObject({ skipRate: null, thinkSeconds: null, fatigue: null, awayPerHour: null, problems: null, advanced: null });
    expect(coachTips(signals, () => true)).toEqual([]);
    expect(coachFlags(signals)).toEqual({ skips: false, hesitation: false });
  });

  it("spots skills that always go right", () => {
    const signals = computeSignals([answer(0, {}), answer(1, {}), answer(2, { skillId: "other", score: 0 })]);
    expect(signals.strengths).toEqual([{ skillId: "math.frac.add-sub", correct: 2, total: 2 }]);
    expect(cheer(signals, () => "Frazioni: addizione e sottrazione")?.body).toBe(
      "Frazioni: addizione e sottrazione: 2 su 2 giuste. Continua così!",
    );
  });
});

describe("coach tips", () => {
  it("puts the skipping challenge first and links times-table practice only when the skill exists", () => {
    const signals = computeSignals(struggling());
    expect(coachFlags(signals)).toEqual({ skips: true, hesitation: true });
    const tips = coachTips(signals, (skillId) => skillId === "math.calc.times-tables");
    expect(tips.map((tip) => tip.id)).toEqual([
      "skips",
      "power_product_multiply_bases",
      "times_tables_not_automatic",
      "start",
      "problems",
      "focus",
      "pause",
    ]);
    expect(tips.find((tip) => tip.id === "times_tables_not_automatic")?.action).toEqual({
      label: "Allenati 3 minuti",
      href: "/skill/math.calc.times-tables",
    });
    expect(coachTips(signals, () => false).find((tip) => tip.id === "times_tables_not_automatic")?.action).toBeUndefined();
  });

  it("rotates the tip of the day", () => {
    const tips = coachTips(computeSignals(struggling()), () => true);
    const monday = tipOfDay(tips, "2026-10-19");
    const tuesday = tipOfDay(tips, "2026-10-20");
    expect(monday).not.toBeNull();
    expect(tuesday).not.toEqual(monday);
    expect(tipOfDay(tips, "2026-10-19")).toEqual(monday);
    expect(tipOfDay([], "2026-10-19")).toBeNull();
  });
});

function coachEvent(kind: string, action: string): EventRow {
  return { type: "coach", skillId: null, sessionId: null, payload: { kind, action }, createdAt: "2026-10-20T10:00:00Z" };
}

describe("parent report", () => {
  it("explains each problem with what to do, most serious first", () => {
    const report = parentReport(computeSignals(struggling()), (skillId) => skillId);
    expect(report.map((insight) => insight.id)).toEqual(["problems", "skips", "hesitation", "fatigue", "focus", "advanced", "errors"]);
    expect(report[0]).toMatchObject({ tone: "bad", title: "Problemi a parole: 0 giusti su 4" });
    expect(report[1]).toMatchObject({ tone: "warn", title: "Dice “Non lo so” nel 21% delle domande" });
    expect(report.find((insight) => insight.id === "errors")?.detail).toBe(
      "potenze: moltiplica le basi invece di tenerle (3×), tabelline non automatiche",
    );
    expect(report.every((insight) => insight.todo || insight.product)).toBe(true);
  });

  it("measures whether the coach nudges work", () => {
    const events = [
      ...Array.from({ length: 4 }, () => coachEvent("skip", "shown")),
      ...Array.from({ length: 3 }, () => coachEvent("skip", "tried")),
      coachEvent("skip", "skipped"),
      coachEvent("hesitation", "shown"),
      coachEvent("other", "shown"),
      { ...coachEvent("skip", "shown"), type: "away" },
    ];
    const stats = coachStats(events);
    expect(stats).toEqual({ skip: { shown: 4, tried: 3, skipped: 1 }, hesitation: { shown: 1, tried: 0, skipped: 0 } });
    const coach = parentReport(computeSignals([answer(0, {})]), (id) => id, stats).find((insight) => insight.id === "coach-skip");
    expect(coach).toMatchObject({ tone: "good", title: "Invito a provare prima di “Non lo so”: ci ha provato 3 volte su 4" });
  });
});

describe("trends and session curve", () => {
  it("computes daily skip rate and thinking time only with enough answers", () => {
    const trend = dailySignals(["2026-10-18", "2026-10-19"], struggling());
    expect(trend[0]).toEqual({ day: "2026-10-18", skipRate: null, thinkSeconds: null });
    expect(trend[1]).toEqual({ day: "2026-10-19", skipRate: 21, thinkSeconds: 36 });
  });

  it("groups the day in blocks of five answers", () => {
    const curve = chunks(struggling());
    expect(curve[0]).toEqual({ label: "1–5", accuracy: 80, seconds: 40 });
    expect(curve.at(-1)).toEqual({ label: "26–29", accuracy: 0, seconds: 120 });
  });
});
