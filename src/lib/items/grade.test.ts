import { describe, expect, it } from "vitest";
import { gradeItem } from "./grade";
import { parseDecimal, parseInteger } from "./numbers";
import { itemKeySchema, type ItemKeyInput, type ItemResponse } from "./schemas";

function key(input: ItemKeyInput) {
  return itemKeySchema.parse(input);
}

function numberAnswer(value: string, unit?: string): ItemResponse {
  return { type: "input", fields: { answer: { kind: "number", value, unit } } };
}

function fractionAnswer(numerator: string, denominator: string): ItemResponse {
  return { type: "input", fields: { answer: { kind: "fraction", numerator, denominator } } };
}

describe("parseDecimal", () => {
  it.each([
    ["0,5", 0.5],
    ["0.5", 0.5],
    [",5", 0.5],
    ["5,", 5],
    [" 12 ", 12],
    ["−8", -8],
    ["-8", -8],
    ["+24", 24],
    ["1 000", 1000],
  ])("parses %s", (input, expected) => {
    expect(parseDecimal(input)).toBe(expected);
  });

  it.each(["", "abc", "1,2,3", "--1", "1-"])("rejects %s", (input) => {
    expect(parseDecimal(input)).toBeNull();
  });
});

describe("parseInteger", () => {
  it("accepts integers and rejects decimals", () => {
    expect(parseInteger("12")).toBe(12);
    expect(parseInteger("−3")).toBe(-3);
    expect(parseInteger("1,5")).toBeNull();
  });
});

describe("number fields", () => {
  const additionKey = key({
    type: "input",
    fields: {
      answer: {
        kind: "number",
        value: 11,
        knownErrors: [{ value: 14, tag: "order_of_operations", message: "Prima la moltiplicazione." }],
      },
    },
  });

  it("accepts the right value", () => {
    expect(gradeItem(additionKey, numberAnswer("11")).score).toBe(1);
  });

  it("diagnoses a known error", () => {
    const grade = gradeItem(additionKey, numberAnswer("14"));
    expect(grade.score).toBe(0);
    expect(grade.diagnosis?.tag).toBe("order_of_operations");
  });

  it("marks unknown wrong values as generic errors", () => {
    expect(gradeItem(additionKey, numberAnswer("13")).diagnosis?.tag).toBe("wrong");
  });

  it("marks empty and invalid inputs", () => {
    expect(gradeItem(additionKey, numberAnswer("")).diagnosis?.tag).toBe("empty");
    expect(gradeItem(additionKey, numberAnswer("1,1,1")).diagnosis?.tag).toBe("invalid");
  });

  it("accepts decimals written with comma or dot", () => {
    const decimalKey = key({ type: "input", fields: { answer: { kind: "number", value: 0.06 } } });
    expect(gradeItem(decimalKey, numberAnswer("0,06")).score).toBe(1);
    expect(gradeItem(decimalKey, numberAnswer("0.06")).score).toBe(1);
  });

  it("matches known errors with a tolerance", () => {
    const pythagorasKey = key({
      type: "input",
      fields: {
        answer: {
          kind: "number",
          value: 12,
          knownErrors: [{ value: 13.93, tolerance: 0.1, tag: "pythagoras_add", message: "Hai sommato." }],
        },
      },
    });
    expect(gradeItem(pythagorasKey, numberAnswer("13,9")).diagnosis?.tag).toBe("pythagoras_add");
  });
});

describe("units", () => {
  const areaKey = key({ type: "input", fields: { answer: { kind: "number", value: 30, unit: "cm²" } } });

  it("gives full score with the right unit", () => {
    expect(gradeItem(areaKey, numberAnswer("30", "cm²")).score).toBe(1);
  });

  it("gives half score when the unit is missing", () => {
    const grade = gradeItem(areaKey, numberAnswer("30"));
    expect(grade.score).toBe(0.5);
    expect(grade.diagnosis?.tag).toBe("unit_missing");
  });

  it("gives half score when the unit is wrong", () => {
    const grade = gradeItem(areaKey, numberAnswer("30", "cm"));
    expect(grade.score).toBe(0.5);
    expect(grade.diagnosis?.tag).toBe("unit_wrong");
  });

  it("gives zero when the value is wrong even with the right unit", () => {
    expect(gradeItem(areaKey, numberAnswer("60", "cm²")).score).toBe(0);
  });
});

describe("fraction fields", () => {
  const sumKey = key({
    type: "input",
    fields: {
      answer: {
        kind: "fraction",
        numerator: 11,
        denominator: 12,
        simplified: "flag",
        knownErrors: [{ numerator: 3, denominator: 7, tag: "fraction_add_num_den", message: "Hai sommato tutto." }],
      },
    },
  });

  it("accepts the reduced fraction", () => {
    expect(gradeItem(sumKey, fractionAnswer("11", "12")).score).toBe(1);
  });

  it("diagnoses summing numerators and denominators", () => {
    expect(gradeItem(sumKey, fractionAnswer("3", "7")).diagnosis?.tag).toBe("fraction_add_num_den");
  });

  it("matches known errors by equivalence", () => {
    expect(gradeItem(sumKey, fractionAnswer("6", "14")).diagnosis?.tag).toBe("fraction_add_num_den");
  });

  it("accepts but flags a non reduced fraction when simplification is only flagged", () => {
    const flagKey = key({
      type: "input",
      fields: { answer: { kind: "fraction", numerator: 2, denominator: 3, simplified: "flag" } },
    });
    const grade = gradeItem(flagKey, fractionAnswer("24", "36"));
    expect(grade.score).toBe(1);
    expect(grade.diagnosis?.tag).toBe("not_simplified");
  });

  it("rejects a non reduced fraction when simplification is required", () => {
    const simplifyKey = key({
      type: "input",
      fields: { answer: { kind: "fraction", numerator: 3, denominator: 4, simplified: "required" } },
    });
    const grade = gradeItem(simplifyKey, fractionAnswer("9", "12"));
    expect(grade.score).toBe(0);
    expect(grade.diagnosis?.tag).toBe("not_simplified");
  });

  it("rejects a zero denominator", () => {
    expect(gradeItem(sumKey, fractionAnswer("1", "0")).diagnosis?.tag).toBe("invalid");
  });

  it("normalizes negative denominators", () => {
    const negativeKey = key({
      type: "input",
      fields: { answer: { kind: "fraction", numerator: -1, denominator: 2, simplified: "flag" } },
    });
    expect(gradeItem(negativeKey, fractionAnswer("1", "-2")).score).toBe(1);
  });
});

describe("multi field items", () => {
  const rectangleKey = key({
    type: "input",
    fields: {
      perimeter: {
        kind: "number",
        value: 26,
        unit: "cm",
        knownErrors: [{ value: 13, tag: "perimeter_half", message: "Hai sommato solo due lati." }],
      },
      area: { kind: "number", value: 40, unit: "cm²" },
    },
  });

  it("averages field scores", () => {
    const grade = gradeItem(rectangleKey, {
      type: "input",
      fields: {
        perimeter: { kind: "number", value: "13", unit: "cm" },
        area: { kind: "number", value: "40", unit: "cm²" },
      },
    });
    expect(grade.score).toBe(0.5);
    expect(grade.diagnosis?.tag).toBe("perimeter_half");
    expect(grade.fields).toHaveLength(2);
  });

  it("prefers a specific diagnosis over a generic one", () => {
    const grade = gradeItem(rectangleKey, {
      type: "input",
      fields: {
        perimeter: { kind: "number", value: "13", unit: "cm" },
        area: { kind: "number", value: "41", unit: "cm²" },
      },
    });
    expect(grade.diagnosis?.tag).toBe("perimeter_half");
  });

  it("uses the threshold when present", () => {
    const drillKey = key({
      type: "input",
      fields: {
        a: { kind: "number", value: 56 },
        b: { kind: "number", value: 54 },
        c: { kind: "number", value: 32 },
      },
      threshold: { min: 2, tag: "times_tables", message: "Le tabelline non sono ancora automatiche." },
    });
    const answer = (a: string, b: string, c: string): ItemResponse => ({
      type: "input",
      fields: {
        a: { kind: "number", value: a },
        b: { kind: "number", value: b },
        c: { kind: "number", value: c },
      },
    });
    expect(gradeItem(drillKey, answer("56", "54", "0")).score).toBe(1);
    const failed = gradeItem(drillKey, answer("56", "0", "0"));
    expect(failed.score).toBe(0);
    expect(failed.diagnosis?.tag).toBe("times_tables");
  });
});

describe("choice items", () => {
  const choiceKey = key({
    type: "choice",
    correct: "b",
    knownErrors: [{ option: "a", tag: "compare_numerators", message: "Hai guardato solo i numeratori." }],
  });

  it("grades choices", () => {
    expect(gradeItem(choiceKey, { type: "choice", option: "b" }).score).toBe(1);
    expect(gradeItem(choiceKey, { type: "choice", option: "a" }).diagnosis?.tag).toBe("compare_numerators");
    expect(gradeItem(choiceKey, { type: "choice", option: "c" }).diagnosis?.tag).toBe("wrong");
  });

  it("grades multi choices as exact sets", () => {
    const multiKey = key({
      type: "multi_choice",
      correct: ["a", "b"],
      knownErrors: [{ includes: "c", tag: "triple_check", message: "4-5-6 non è una terna." }],
    });
    expect(gradeItem(multiKey, { type: "multi_choice", options: ["b", "a"] }).score).toBe(1);
    expect(gradeItem(multiKey, { type: "multi_choice", options: ["a"] }).diagnosis?.tag).toBe("wrong");
    expect(gradeItem(multiKey, { type: "multi_choice", options: ["a", "b", "c"] }).diagnosis?.tag).toBe("triple_check");
  });
});

describe("order items and skips", () => {
  const orderKey = key({ type: "order", correct: ["h", "p", "c"] });

  it("grades the exact order", () => {
    expect(gradeItem(orderKey, { type: "order", order: ["h", "p", "c"] }).score).toBe(1);
    expect(gradeItem(orderKey, { type: "order", order: ["p", "h", "c"] }).diagnosis?.tag).toBe("wrong_order");
  });

  it("treats a skip as zero", () => {
    expect(gradeItem(orderKey, { type: "skip" })).toMatchObject({ score: 0, diagnosis: { tag: "skipped" } });
  });

  it("treats a mismatched response type as invalid", () => {
    expect(gradeItem(orderKey, { type: "choice", option: "h" }).diagnosis?.tag).toBe("invalid");
  });
});
