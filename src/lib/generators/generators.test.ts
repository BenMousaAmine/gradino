import { describe, expect, it } from "vitest";
import { checkItemConsistency } from "@/lib/content/pack";
import { gradeItem } from "@/lib/items/grade";
import { itemContentSchema, itemKeySchema } from "@/lib/items/schemas";
import { GENERATORS, generateItem } from "./registry";

const SEEDS = 1500;

function* numbersIn(value: unknown): Generator<number> {
  if (typeof value === "number") yield value;
  else if (Array.isArray(value)) for (const entry of value) yield* numbersIn(entry);
  else if (value && typeof value === "object") for (const entry of Object.values(value)) yield* numbersIn(entry);
}

describe.each(Object.keys(GENERATORS))("generator %s", (generator) => {
  it.each([1, 2, 3])("difficulty %i produces consistent exercises", (difficulty) => {
    const prompts = new Set<string>();
    for (let seed = 1; seed <= SEEDS; seed++) {
      const item = generateItem(generator, { difficulty }, seed);
      const where = `${generator}/${difficulty}/seed ${seed}`;

      expect(itemContentSchema.safeParse(item.content).success, where).toBe(true);
      expect(itemKeySchema.safeParse(item.key).success, where).toBe(true);
      expect(checkItemConsistency(where, item.content, item.key)).toEqual([]);
      expect(item.solution.length, where).toBeGreaterThan(0);

      const serialized = JSON.stringify(item);
      expect(serialized, where).not.toMatch(/NaN|Infinity|undefined/);
      for (const value of numbersIn(item.key)) expect(Number.isFinite(value), where).toBe(true);
      if (item.key.type === "input") {
        for (const field of Object.values(item.key.fields)) {
          if (field.kind === "text" || field.kind === "select") continue;
          const correct = field.kind === "number" ? field.value : field.denominator;
          expect(Math.abs(correct), where).toBeLessThan(1_000_000);
          expect(field.kind === "number" ? field.value : field.numerator, where).toBeGreaterThanOrEqual(0);
        }
      }
      prompts.add(JSON.stringify(item.content));
    }
    expect(prompts.size).toBeGreaterThan(5);
  });

  it("is deterministic for the same seed", () => {
    for (const difficulty of [1, 2, 3]) {
      expect(generateItem(generator, { difficulty }, 42)).toEqual(generateItem(generator, { difficulty }, 42));
    }
  });
});

describe("generator answers", () => {
  it("accepts the expected answer written in Italian style", () => {
    const item = generateItem("decimals", { difficulty: 2 }, 7);
    if (item.key.type !== "input") throw new Error("expected input");
    const fieldKey = item.key.fields.answer;
    if (fieldKey.kind !== "number") throw new Error("expected number");
    const written = String(fieldKey.value).replace(".", ",");
    expect(gradeItem(item.key, { type: "input", fields: { answer: { kind: "number", value: written } } }).score).toBe(1);
  });

  it("rejects unknown generators and bad params", () => {
    expect(() => generateItem("nope", { difficulty: 1 }, 1)).toThrow();
    expect(() => generateItem("decimals", { difficulty: 4 }, 1)).toThrow();
  });
});
