import { describe, expect, it } from "vitest";
import { addDays, dayInRome, startOfDayInRome } from "./dates";
import { afterPractice, afterReview, isReviewDue, levelPassed, NEW_PROGRESS, stepsClimbed, type Progress } from "./mastery";
import { currentSkill, initialProgress, needsWork, orderPath } from "./path";
import { parseSubject, SUBJECT_IDS, SUBJECTS, subjectOfSkill } from "@/lib/subjects";

const today = "2026-10-20";

describe("dates", () => {
  it("adds days across months", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("uses the Rome calendar day", () => {
    expect(dayInRome(new Date("2026-10-19T22:30:00Z"))).toBe("2026-10-20");
    expect(dayInRome(new Date("2026-10-19T21:30:00Z"))).toBe("2026-10-19");
  });

  it("computes Rome midnight in UTC for summer and winter time", () => {
    expect(startOfDayInRome("2026-07-01")).toBe("2026-06-30T22:00:00.000Z");
    expect(startOfDayInRome("2026-12-01")).toBe("2026-11-30T23:00:00.000Z");
  });
});

describe("levelPassed", () => {
  it("passes with 9 out of the last 10", () => {
    expect(levelPassed([0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1])).toBe(true);
    expect(levelPassed([1, 1, 1, 0, 1, 1, 0, 1, 1, 1])).toBe(false);
  });

  it("fast tracks five in a row", () => {
    expect(levelPassed([1, 1, 1, 1, 1])).toBe(true);
    expect(levelPassed([1, 1, 1, 1, 0.5])).toBe(false);
  });

  it("needs enough answers", () => {
    expect(levelPassed([1, 1, 1, 1])).toBe(false);
  });
});

describe("afterPractice", () => {
  it("climbs one step at a time", () => {
    const first = afterPractice(NEW_PROGRESS, [1, 1, 1, 1, 1], today);
    expect(first.event).toEqual({ type: "level_up", from: "base", to: "medium" });
    const second = afterPractice(first.progress, [1, 1, 1, 1, 1], today);
    expect(second.progress.level).toBe("advanced");
  });

  it("moves to review after the last step, due tomorrow", () => {
    const result = afterPractice({ ...NEW_PROGRESS, level: "advanced" }, [1, 1, 1, 1, 1], today);
    expect(result.progress).toEqual({ status: "review", level: "advanced", reviewStep: 0, nextReviewOn: "2026-10-21" });
    expect(result.event).toEqual({ type: "completed", nextReviewOn: "2026-10-21" });
  });

  it("does nothing without enough correct answers or outside learning", () => {
    expect(afterPractice(NEW_PROGRESS, [1, 0, 1], today).event).toBeNull();
    const mastered: Progress = { status: "mastered", level: "advanced", reviewStep: 2, nextReviewOn: today };
    expect(afterPractice(mastered, [1, 1, 1, 1, 1], today).progress).toBe(mastered);
  });
});

describe("afterReview", () => {
  const pending: Progress = { status: "review", level: "advanced", reviewStep: 0, nextReviewOn: today };

  it("confirms mastery on a different day and spaces reviews out", () => {
    const first = afterReview(pending, [1, 1, 1, 1, 1], today);
    expect(first.progress).toEqual({ status: "mastered", level: "advanced", reviewStep: 1, nextReviewOn: "2026-10-23" });
    const second = afterReview(first.progress, [1, 1, 1, 1, 0.5], "2026-10-23");
    expect(second.progress.nextReviewOn).toBe("2026-10-30");
    const late = afterReview({ ...first.progress, reviewStep: 9 }, [1, 1, 1, 1, 1], today);
    expect(late.progress.nextReviewOn).toBe("2026-11-19");
  });

  it("drops back a step when the review fails", () => {
    expect(afterReview(pending, [1, 1, 1, 0, 1], today).progress).toEqual({
      status: "learning",
      level: "advanced",
      reviewStep: 0,
      nextReviewOn: null,
    });
    expect(afterReview(pending, [1, 0, 0, 0, 1], today).progress.level).toBe("medium");
  });

  it("knows when a review is due", () => {
    expect(isReviewDue(pending, today)).toBe(true);
    expect(isReviewDue({ ...pending, nextReviewOn: "2026-10-21" }, today)).toBe(false);
    expect(isReviewDue(NEW_PROGRESS, today)).toBe(false);
  });

  it("counts the steps climbed", () => {
    expect(stepsClimbed(NEW_PROGRESS)).toBe(0);
    expect(stepsClimbed({ ...NEW_PROGRESS, level: "advanced" })).toBe(2);
    expect(stepsClimbed(pending)).toBe(3);
  });
});

describe("path", () => {
  it("detects skills that need work from the diagnostic", () => {
    const diagnostic = [
      { skillId: "a", score: 1 },
      { skillId: "a", score: 1 },
      { skillId: "b", score: 1 },
      { skillId: "b", score: 0.5 },
      { skillId: "c", score: null },
    ];
    expect(needsWork("a", diagnostic)).toBe(false);
    expect(needsWork("b", diagnostic)).toBe(true);
    expect(needsWork("c", diagnostic)).toBe(true);
    expect(needsWork("d", diagnostic)).toBe(true);
  });

  it("starts mastered skills with a review in a week", () => {
    expect(initialProgress(true, today)).toEqual(NEW_PROGRESS);
    expect(initialProgress(false, today)).toEqual({
      status: "mastered",
      level: "advanced",
      reviewStep: 2,
      nextReviewOn: "2026-10-27",
    });
  });

  it("orders skills by prerequisites, then by curriculum order", () => {
    const order = orderPath([
      { id: "expressions", order: 1, prerequisites: ["add", "mul"] },
      { id: "add", order: 3, prerequisites: ["lcm"] },
      { id: "mul", order: 2, prerequisites: [] },
      { id: "simplify", order: 4, prerequisites: [] },
    ]);
    expect(order).toEqual(["mul", "add", "expressions", "simplify"]);
  });

  it("picks the first skill still being learned", () => {
    const progress = new Map<string, Progress>([
      ["mul", { status: "mastered", level: "advanced", reviewStep: 1, nextReviewOn: today }],
      ["add", NEW_PROGRESS],
    ]);
    expect(currentSkill(["mul", "add"], progress)).toBe("add");
    expect(currentSkill(["mul"], progress)).toBeNull();
  });
});

describe("subjects", () => {
  it("maps skills and query values to subjects", () => {
    expect(subjectOfSkill("english.verbs.present-simple")).toBe("english");
    expect(subjectOfSkill("math.calc.decimals")).toBe("math");
    expect(parseSubject("english")).toBe("english");
    expect(parseSubject(undefined)).toBe("math");
    expect(parseSubject("history")).toBe("math");
  });

  it("gives every subject a session that ends with the daily check", () => {
    for (const id of SUBJECT_IDS) {
      expect(SUBJECTS[id].blocks.at(-1)?.id).toBe("check");
      expect(SUBJECTS[id].checkSize).toBeGreaterThan(0);
    }
    expect(SUBJECTS.english.blocks.reduce((sum, block) => sum + block.minutes, 0)).toBe(45);
  });
});
