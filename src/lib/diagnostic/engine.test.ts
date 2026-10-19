import { describe, expect, it } from "vitest";
import {
  colorFor,
  nextStep,
  progress,
  recoveryPlan,
  sectionResults,
  type AssessmentConfig,
  type EngineSection,
  type EngineState,
} from "./engine";

const config: AssessmentConfig = { stopAfterBaseErrors: 2, pauseMinutes: 10, recoveryOrder: ["A", "C", "J"] };

const sections: EngineSection[] = [
  {
    id: "A",
    code: "A",
    part: 1,
    optional: false,
    items: [
      { id: "A1", level: "base" },
      { id: "A2", level: "base" },
      { id: "A3", level: "medium" },
    ],
  },
  {
    id: "J",
    code: "J",
    part: 1,
    optional: true,
    items: [{ id: "J1", level: "base" }],
  },
  {
    id: "C",
    code: "C",
    part: 2,
    optional: false,
    items: [
      { id: "C1", level: "base" },
      { id: "C2", level: "advanced" },
    ],
  },
];

function state(scores: Record<string, number>, overrides: Partial<EngineState> = {}): EngineState {
  return { scores: new Map(Object.entries(scores)), choices: {}, currentPart: 1, ...overrides };
}

describe("nextStep", () => {
  it("starts from the first item", () => {
    expect(nextStep(sections, state({}), config)).toEqual({ kind: "item", sectionId: "A", itemId: "A1" });
  });

  it("closes a section after two base errors", () => {
    expect(nextStep(sections, state({ A1: 0, A2: 0 }), config)).toEqual({ kind: "optional_section", sectionId: "J" });
  });

  it("does not count half scores as base errors", () => {
    expect(nextStep(sections, state({ A1: 0, A2: 0.5 }), config)).toEqual({
      kind: "item",
      sectionId: "A",
      itemId: "A3",
    });
  });

  it("asks before an optional section and skips it when refused", () => {
    const done = { A1: 1, A2: 1, A3: 1 };
    expect(nextStep(sections, state(done), config)).toEqual({ kind: "optional_section", sectionId: "J" });
    expect(nextStep(sections, state(done, { choices: { J: "included" } }), config)).toEqual({
      kind: "item",
      sectionId: "J",
      itemId: "J1",
    });
    expect(nextStep(sections, state(done, { choices: { J: "skipped" } }), config)).toEqual({
      kind: "pause",
      nextPart: 2,
    });
  });

  it("continues after the pause and finishes", () => {
    const answered = { A1: 1, A2: 1, A3: 1 };
    const base = { choices: { J: "skipped" as const }, currentPart: 2 };
    expect(nextStep(sections, state(answered, base), config)).toEqual({ kind: "item", sectionId: "C", itemId: "C1" });
    expect(nextStep(sections, state({ ...answered, C1: 1, C2: 0 }, base), config)).toEqual({ kind: "done" });
  });
});

describe("progress", () => {
  it("counts closed sections as done and ignores skipped ones", () => {
    expect(progress(sections, state({ A1: 0, A2: 0 }, { choices: { J: "skipped" } }), config)).toEqual({
      done: 3,
      total: 5,
    });
  });
});

describe("results", () => {
  it("maps ratios to colors", () => {
    expect(colorFor(0.95, false)).toBe("green");
    expect(colorFor(0.9, false)).toBe("green");
    expect(colorFor(0.75, false)).toBe("yellow");
    expect(colorFor(0.5, false)).toBe("red");
    expect(colorFor(1, true)).toBe("red");
  });

  it("computes section results and the recovery plan", () => {
    const final = state(
      { A1: 0, A2: 0, C1: 1, C2: 0.5 },
      { choices: { J: "skipped" }, currentPart: 2 },
    );
    const results = sectionResults(sections, final, config);
    expect(results.map((result) => [result.code, result.color])).toEqual([
      ["A", "red"],
      ["J", null],
      ["C", "yellow"],
    ]);
    expect(results[0].closedEarly).toBe(true);
    expect(recoveryPlan(results, config).map((result) => result.code)).toEqual(["A", "C"]);
  });
});
