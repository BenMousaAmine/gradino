import { describe, expect, it } from "vitest";
import { dailySeries, errorGroups, habits, lastDays, lessonStats, periodStats, weakSkills, type AnswerRow, type EventRow } from "./metrics";

function answer(partial: Partial<AnswerRow>): AnswerRow {
  return {
    id: Math.random().toString(36),
    skillId: "a",
    level: "base",
    purpose: "practice",
    score: 1,
    errorTag: null,
    message: null,
    timeMs: 30_000,
    createdAt: "2026-10-20T10:00:00Z",
    sessionId: null,
    stats: null,
    ...partial,
  };
}

function event(partial: Partial<EventRow>): EventRow {
  return { type: "away", skillId: null, sessionId: null, payload: {}, createdAt: "2026-10-20T10:00:00Z", ...partial };
}

describe("daily series", () => {
  it("adds answer, feedback and lesson time per Rome day and computes accuracy", () => {
    const days = lastDays("2026-10-20", 3);
    expect(days).toEqual(["2026-10-18", "2026-10-19", "2026-10-20"]);
    const series = dailySeries(
      days,
      [answer({ timeMs: 60_000 }), answer({ score: 0, timeMs: 60_000 }), answer({ timeMs: 9_999_999 })],
      [
        event({ type: "feedback_closed", payload: { ms: 60_000 } }),
        event({ type: "lesson_step", payload: { ms: 120_000 } }),
        event({ type: "lesson_step", payload: { ms: 60_000 }, createdAt: "2026-10-18T22:30:00Z" }),
      ],
    );
    expect(series[2]).toEqual({ day: "2026-10-20", minutes: 10, answers: 3, correct: 2, accuracy: 67 });
    expect(series[1]).toEqual({ day: "2026-10-19", minutes: 1, answers: 0, correct: 0, accuracy: null });
    expect(series[0].minutes).toBe(0);
  });

  it("summarizes a period", () => {
    const series = dailySeries(["2026-10-20"], [answer({}), answer({ score: 0, errorTag: "skipped" })], []);
    expect(periodStats(series, [answer({}), answer({ score: 0, errorTag: "skipped" })])).toMatchObject({
      answers: 2,
      accuracy: 50,
      daysActive: 1,
      helpRate: 50,
    });
  });
});

describe("weak skills", () => {
  it("ranks skills by errors, skips and slowness", () => {
    const answers = [
      ...Array.from({ length: 4 }, () => answer({ skillId: "easy", timeMs: 20_000 })),
      ...Array.from({ length: 4 }, (_, index) => answer({ skillId: "hard", score: index === 0 ? 1 : 0, timeMs: 90_000 })),
      ...Array.from({ length: 4 }, (_, index) => answer({ skillId: "unsure", score: index < 2 ? 1 : 0, errorTag: index >= 2 ? "skipped" : null })),
      answer({ skillId: "rare", score: 0 }),
    ];
    const ranking = weakSkills(answers);
    expect(ranking.map((row) => row.skillId)).toEqual(["hard", "unsure"]);
    expect(ranking[0].reasons[0]).toBe("sbaglia il 75%");
    expect(ranking[1].reasons).toContain('"Non lo so" nel 50% dei casi');
  });
});

describe("error groups", () => {
  it("groups specific error tags and ignores generic ones", () => {
    const groups = errorGroups([
      answer({ score: 0, errorTag: "fraction_add_num_den", message: "m1", skillId: "x" }),
      answer({ score: 0, errorTag: "fraction_add_num_den", message: "m1", skillId: "y" }),
      answer({ score: 0, errorTag: "wrong" }),
      answer({ score: 0, errorTag: "unit_missing", message: "m2" }),
    ]);
    expect(groups.map((group) => [group.tag, group.count])).toEqual([
      ["fraction_add_num_den", 2],
      ["unit_missing", 1],
    ]);
    expect(groups[0].skillIds).toEqual(["x", "y"]);
  });
});

describe("lessons and habits", () => {
  it("averages time per lesson step and counts tries", () => {
    const stats = lessonStats([
      event({ type: "lesson_opened", skillId: "s" }),
      event({ type: "lesson_step", skillId: "s", payload: { step: 0, ms: 30_000 } }),
      event({ type: "lesson_step", skillId: "s", payload: { step: 0, ms: 50_000 } }),
      event({ type: "lesson_try", skillId: "s", payload: { correct: 1, total: 2 } }),
      event({ type: "lesson_try", skillId: "s", payload: { correct: 2, total: 2 } }),
      event({ type: "lesson_completed", skillId: "s" }),
    ]);
    expect(stats).toEqual([{ skillId: "s", opened: 1, completed: 1, stepSeconds: [40, 0, 0, 0], tries: 2, triesCorrect: 1 }]);
  });

  it("measures distractions, pauses and how solutions are read", () => {
    const result = habits(
      [
        event({ type: "away", payload: { ms: 120_000 } }),
        event({ type: "pause_ended", payload: { ms: 600_000 } }),
        event({ type: "feedback_closed", payload: { score: 0, ms: 20_000, solutionOpen: true } }),
        event({ type: "feedback_closed", payload: { score: 0, ms: 2_000, solutionOpen: false } }),
        event({ type: "feedback_closed", payload: { score: 1, ms: 1_000, solutionOpen: false } }),
        event({ type: "time_up" }),
      ],
      [answer({ createdAt: "2026-10-20T15:30:00Z" })],
    );
    expect(result).toMatchObject({ awayCount: 1, awayMinutes: 2, pauses: 1, avgPauseMinutes: 10, timeUps: 1, feedbackSeconds: 11, solutionOpenedRate: 50 });
    expect(result.hours[17]).toBe(1);
  });
});
