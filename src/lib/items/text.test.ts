import { describe, expect, it } from "vitest";
import { gradeItem } from "./grade";
import type { ItemKey } from "./schemas";
import { normalizeText, sameText } from "./text";

const key: ItemKey = {
  type: "input",
  fields: {
    verb: {
      kind: "text",
      accept: ["doesn't like"],
      knownErrors: [{ answers: ["doesn't likes"], tag: "eng_bare_after_aux", message: "Il verbo torna nudo." }],
    },
  },
};

const answer = (value: string) => gradeItem(key, { type: "input", fields: { verb: { kind: "text", value } } });

describe("text answers", () => {
  it("ignores case, spaces, punctuation and curly apostrophes", () => {
    expect(normalizeText("  She  Doesn’t LIKE fish. ")).toBe("she does not like fish");
    expect(sameText("I'm", "I am")).toBe(true);
    expect(sameText("can't", "can not")).toBe(true);
    expect(sameText("won't", "will not")).toBe(true);
    expect(sameText("plays", "play")).toBe(false);
  });

  it("accepts contracted and full forms", () => {
    expect(answer("doesn't like").score).toBe(1);
    expect(answer("Does not like").score).toBe(1);
    expect(answer("doesn’t like!").score).toBe(1);
  });

  it("recognizes known mistakes and empty answers", () => {
    expect(answer("doesn't likes").diagnosis?.tag).toBe("eng_bare_after_aux");
    expect(answer("does not likes").diagnosis?.tag).toBe("eng_bare_after_aux");
    expect(answer("likes").diagnosis?.tag).toBe("wrong");
    expect(answer("   ").diagnosis?.tag).toBe("empty");
  });
});

describe("reading tasks", () => {
  const task: ItemKey = {
    type: "input",
    fields: {
      q1: { kind: "select", correct: "b", knownErrors: [{ option: "a", tag: "eng_task_check", message: "Cerca nel testo." }] },
      q2: { kind: "select", correct: "a", knownErrors: [] },
      q3: { kind: "text", accept: ["Oscar"], knownErrors: [] },
    },
    threshold: { min: 2, tag: "eng_task_threshold", message: "Rileggi le domande." },
  };
  const grade = (q1: string, q2: string, q3: string) =>
    gradeItem(task, {
      type: "input",
      fields: { q1: { kind: "select", option: q1 }, q2: { kind: "select", option: q2 }, q3: { kind: "text", value: q3 } },
    });

  it("counts one mistake as passed but keeps the hint for it", () => {
    const result = grade("a", "a", "oscar");
    expect(result.score).toBe(1);
    expect(result.diagnosis?.message).toBe("Cerca nel testo.");
  });

  it("fails with two mistakes or empty choices", () => {
    expect(grade("a", "b", "Oscar").score).toBe(0);
    expect(grade("", "", "Oscar").diagnosis?.tag).toBe("eng_task_threshold");
    expect(grade("b", "a", "Oscar")).toMatchObject({ score: 1, diagnosis: null });
  });
});
