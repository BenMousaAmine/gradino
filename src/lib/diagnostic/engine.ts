import { z } from "zod";
import type { Level } from "@/lib/items/schemas";

export const assessmentConfigSchema = z.object({
  stopAfterBaseErrors: z.number().int().positive(),
  pauseMinutes: z.number().int().positive(),
  recoveryOrder: z.array(z.string().min(1)),
});
export type AssessmentConfig = z.infer<typeof assessmentConfigSchema>;

export const sectionChoiceSchema = z.enum(["included", "skipped"]);
export const sectionChoicesSchema = z.record(z.string(), sectionChoiceSchema);
export type SectionChoices = z.infer<typeof sectionChoicesSchema>;

export type EngineItem = { id: string; level: Level };

export type EngineSection = {
  id: string;
  code: string;
  part: number;
  optional: boolean;
  items: EngineItem[];
};

export type EngineState = {
  scores: ReadonlyMap<string, number>;
  choices: SectionChoices;
  currentPart: number;
};

export type NextStep =
  | { kind: "item"; sectionId: string; itemId: string }
  | { kind: "optional_section"; sectionId: string }
  | { kind: "pause"; nextPart: number }
  | { kind: "done" };

export type AreaColor = "green" | "yellow" | "red";

export type SectionResult = {
  sectionId: string;
  code: string;
  color: AreaColor | null;
  ratio: number;
  answered: number;
  total: number;
  closedEarly: boolean;
};

export const GREEN_THRESHOLD = 0.9;
export const YELLOW_THRESHOLD = 0.6;

function baseErrors(section: EngineSection, scores: ReadonlyMap<string, number>): number {
  return section.items.filter((item) => item.level === "base" && scores.get(item.id) === 0).length;
}

export function isClosedEarly(section: EngineSection, scores: ReadonlyMap<string, number>, config: AssessmentConfig) {
  return baseErrors(section, scores) >= config.stopAfterBaseErrors;
}

function isFinished(section: EngineSection, state: EngineState, config: AssessmentConfig): boolean {
  if (section.optional && state.choices[section.id] === "skipped") return true;
  if (isClosedEarly(section, state.scores, config)) return true;
  return section.items.every((item) => state.scores.has(item.id));
}

export function nextStep(sections: readonly EngineSection[], state: EngineState, config: AssessmentConfig): NextStep {
  for (const section of sections) {
    if (isFinished(section, state, config)) continue;
    if (section.part > state.currentPart) return { kind: "pause", nextPart: section.part };
    if (section.optional && state.choices[section.id] === undefined) {
      return { kind: "optional_section", sectionId: section.id };
    }
    const item = section.items.find((candidate) => !state.scores.has(candidate.id));
    if (item) return { kind: "item", sectionId: section.id, itemId: item.id };
  }
  return { kind: "done" };
}

export function progress(sections: readonly EngineSection[], state: EngineState, config: AssessmentConfig) {
  const active = sections.filter((section) => !(section.optional && state.choices[section.id] === "skipped"));
  const total = active.reduce((sum, section) => sum + section.items.length, 0);
  const done = active.reduce((sum, section) => {
    if (isClosedEarly(section, state.scores, config)) return sum + section.items.length;
    return sum + section.items.filter((item) => state.scores.has(item.id)).length;
  }, 0);
  return { done, total };
}

export function colorFor(ratio: number, closedEarly: boolean): AreaColor {
  if (closedEarly) return "red";
  if (ratio >= GREEN_THRESHOLD) return "green";
  if (ratio >= YELLOW_THRESHOLD) return "yellow";
  return "red";
}

export function sectionResults(
  sections: readonly EngineSection[],
  state: EngineState,
  config: AssessmentConfig,
): SectionResult[] {
  return sections.map((section) => {
    const total = section.items.length;
    const answered = section.items.filter((item) => state.scores.has(item.id)).length;
    if (section.optional && state.choices[section.id] !== "included") {
      return { sectionId: section.id, code: section.code, color: null, ratio: 0, answered, total, closedEarly: false };
    }
    const sum = section.items.reduce((acc, item) => acc + (state.scores.get(item.id) ?? 0), 0);
    const ratio = total === 0 ? 0 : sum / total;
    const closedEarly = isClosedEarly(section, state.scores, config);
    return { sectionId: section.id, code: section.code, color: colorFor(ratio, closedEarly), ratio, answered, total, closedEarly };
  });
}

export function recoveryPlan(results: readonly SectionResult[], config: AssessmentConfig): SectionResult[] {
  const byCode = new Map(results.map((result) => [result.code, result]));
  const ordered = config.recoveryOrder
    .map((code) => byCode.get(code))
    .filter((result): result is SectionResult => result !== undefined);
  return [
    ...ordered.filter((result) => result.color === "red"),
    ...ordered.filter((result) => result.color === "yellow"),
  ];
}
