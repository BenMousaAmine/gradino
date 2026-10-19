import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadPacks } from "./load-packs";
import { validatePack, type Pack } from "./pack";

const contentDirectory = path.resolve(__dirname, "../../../content");

describe("content packs", () => {
  it("are valid and every answer key grades itself correct", async () => {
    const { errors, pack } = await loadPacks(contentDirectory);
    expect(errors).toEqual([]);
    expect(pack.items.length).toBeGreaterThan(0);
  });

  it("contain the diagnostic test with every section filled", async () => {
    const { pack } = await loadPacks(contentDirectory);
    const diagnostic = pack.assessments.find((assessment) => assessment.id === "math.diagnostic.v1");
    expect(diagnostic?.sections.map((section) => section.code)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "J",
      "E",
      "I",
      "F",
      "G",
      "H",
      "K",
    ]);
  });
});

describe("validatePack", () => {
  const base: Pack = {
    subjects: [{ id: "math", title: "Matematica" }],
    areas: [{ id: "math.calc", subjectId: "math", title: "Calcolo" }],
    skills: [{ id: "math.calc.sum", areaId: "math.calc", title: "Somme", schoolYear: 1, prerequisites: [] }],
    items: [],
    assessments: [],
  };

  it("detects a key that does not match its content", () => {
    const errors = validatePack({
      ...base,
      items: [
        {
          id: "x",
          skillId: "math.calc.sum",
          level: "base",
          status: "published",
          content: { type: "choice", prompt: "?", options: [{ id: "a", text: "1" }, { id: "b", text: "2" }] },
          key: { type: "choice", correct: "z", knownErrors: [] },
        },
      ],
    });
    expect(errors).toContain("item x: correct option z does not exist");
  });

  it("detects a known error that equals the right answer", () => {
    const errors = validatePack({
      ...base,
      items: [
        {
          id: "y",
          skillId: "math.calc.sum",
          level: "base",
          status: "published",
          content: { type: "input", prompt: "?", fields: [{ kind: "number", id: "answer", label: "" }] },
          key: {
            type: "input",
            fields: {
              answer: { kind: "number", value: 4, knownErrors: [{ value: 4, tag: "same", message: "uguale" }] },
            },
          },
        },
      ],
    });
    expect(errors).toContain("item y: known error same on field answer is not detected");
  });

  it("detects broken references", () => {
    const errors = validatePack({
      ...base,
      skills: [{ id: "s", areaId: "missing", title: "S", schoolYear: null, prerequisites: ["nope"] }],
    });
    expect(errors).toEqual(["skill s: unknown area missing", "skill s: unknown prerequisite nope"]);
  });
});
