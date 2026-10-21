import { describe, expect, it } from "vitest";
import type { AnswerRow, EventRow } from "@/lib/admin/metrics";
import { activeTricks, trickForSkill, trickForTag, trickProgress, TRICKS } from "./tricks";

let clock = Date.parse("2026-10-20T15:00:00Z");

function answer(skillId: string, score: number, errorTag: string | null = null): AnswerRow {
  clock += 60_000;
  return {
    id: `${clock}`,
    skillId,
    level: "base",
    purpose: "practice",
    score,
    errorTag: errorTag ?? (score === 1 ? null : "wrong"),
    message: null,
    timeMs: 30_000,
    createdAt: new Date(clock).toISOString(),
    sessionId: null,
    stats: null,
    attempts: 1,
    finalScore: score,
    retryMs: 0,
    noteMs: null,
    noteSource: null,
  };
}

function shown(trick: string, at: string): EventRow {
  return { type: "coach", skillId: null, sessionId: null, payload: { kind: "trick", action: "shown", trick, where: "exercise" }, createdAt: at };
}

describe("catalog", () => {
  it("has unique ids and something to match on", () => {
    expect(new Set(TRICKS.map((trick) => trick.id)).size).toBe(TRICKS.length);
    expect(TRICKS.every((trick) => trick.skills.length > 0 && (trick.tags.length > 0 || trick.lowAccuracy))).toBe(true);
  });
});

describe("active tricks", () => {
  it("turns on decimal tricks after alignment mistakes and low accuracy, and keeps mastered times tables off", () => {
    const answers = [
      answer("math.calc.times-tables", 0, "times_tables_not_automatic"),
      ...Array.from({ length: 12 }, () => answer("math.calc.times-tables", 1)),
      answer("math.calc.decimals", 0, "decimal_alignment"),
      answer("math.calc.decimals", 0),
      answer("math.calc.decimals", 1),
      answer("math.calc.decimals", 0),
    ];
    expect(activeTricks(answers)).toEqual(["decimal-columns", "decimal-carry"]);
  });

  it("switches a trick off once the recent answers are clean", () => {
    const answers = [answer("math.frac.simplify", 0, "not_simplified"), ...Array.from({ length: 10 }, () => answer("math.frac.simplify", 1))];
    expect(activeTricks(answers)).toEqual([]);
  });

  it("does not fire a low-accuracy trick on too few answers", () => {
    expect(activeTricks([answer("math.ps.one-step", 0), answer("math.ps.one-step", 0)])).toEqual([]);
    expect(activeTricks([answer("math.ps.one-step", 0), answer("math.ps.one-step", 0), answer("math.ps.multi-step", 1)])).toEqual([
      "problem-keywords",
    ]);
  });

  it("picks the trick for the exercise skill and for the exact mistake", () => {
    expect(trickForSkill(["decimal-columns", "decimal-carry"], "math.calc.decimals")?.id).toBe("decimal-columns");
    expect(trickForSkill(["decimal-carry"], "math.calc.decimals")?.id).toBe("decimal-carry");
    expect(trickForSkill(["decimal-carry"], "math.frac.simplify")).toBeNull();
    expect(trickForTag("eng_third_person_s")?.id).toBe("eng-third-person-s");
    expect(trickForTag("wrong")).toBeNull();
    expect(trickForTag(null)).toBeNull();
  });
});

describe("trick progress", () => {
  it("compares accuracy before and after the first time the trick was shown", () => {
    const before = Array.from({ length: 6 }, (_, index) => answer("math.calc.decimals", index < 2 ? 1 : 0, index === 2 ? "decimal_alignment" : null));
    const firstShown = new Date(clock + 1).toISOString();
    const after = Array.from({ length: 6 }, (_, index) => answer("math.calc.decimals", index === 0 ? 0 : 1, index === 0 ? "decimal_alignment" : null));
    const progress = trickProgress([...before, ...after], [shown("decimal-columns", firstShown), shown("decimal-columns", after[3].createdAt)]);
    expect(progress.find((row) => row.id === "decimal-columns")).toEqual({
      id: "decimal-columns",
      title: "Virgola sotto virgola + zeri fantasma",
      active: true,
      shown: 2,
      firstShown,
      before: { answers: 6, accuracy: 33, errorRate: 17 },
      after: { answers: 6, accuracy: 83, errorRate: 17 },
      verdict: "migliora",
    });
  });

  it("marks tricks as overcome, waiting for data, or not shown yet", () => {
    const old = answer("math.frac.simplify", 0, "not_simplified");
    const clean = Array.from({ length: 10 }, () => answer("math.frac.simplify", 1));
    const decimals = [answer("math.calc.decimals", 0, "decimal_alignment"), answer("math.calc.decimals", 0)];
    const progress = trickProgress([old, ...clean, ...decimals], [shown("simplify-last", clean[0].createdAt)]);
    expect(progress.find((row) => row.id === "simplify-last")?.verdict).toBe("superato");
    expect(progress.find((row) => row.id === "decimal-columns")?.verdict).toBe("non ancora mostrato");
    expect(progress.some((row) => row.id === "times-table-neighbor")).toBe(false);
  });
});
