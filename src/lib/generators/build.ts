import type { Figure } from "@/lib/items/figure";
import { formatDecimal, sameNumber } from "@/lib/items/numbers";
import type { Audio, ItemContent, ItemKey, Option } from "@/lib/items/schemas";
import { sameText } from "@/lib/items/text";
import { rational, type Rational } from "@/lib/math/rational";
import type { Random } from "./random";

export type Difficulty = 1 | 2 | 3;

export type GeneratedItem = { content: ItemContent; key: ItemKey; solution: string[] };

export type GeneratorFn = (random: Random, difficulty: Difficulty) => GeneratedItem;

export type NumberError = { value: number; tag: string; message: string };
export type FractionError = { n: number; d: number; tag: string; message: string };
export type ChoiceError = { option: string; tag: string; message: string };

export function round(value: number): number {
  return Number(value.toFixed(6));
}

export function texNumber(value: number): string {
  return formatDecimal(round(value)).replace(",", "{,}").replace("−", "-");
}

export function plainNumber(value: number): string {
  return formatDecimal(round(value));
}

function cleanNumberErrors(correct: number, errors: readonly NumberError[]): NumberError[] {
  const kept: NumberError[] = [];
  for (const error of errors) {
    if (!Number.isFinite(error.value)) continue;
    const value = round(error.value);
    if (sameNumber(value, correct)) continue;
    if (kept.some((candidate) => sameNumber(candidate.value, value))) continue;
    kept.push({ ...error, value });
  }
  return kept;
}

export const LENGTH_UNITS = ["cm", "cm²", "cm³"];

export type NumberField = {
  id: string;
  label: string;
  value: number;
  errors?: NumberError[];
  suffix?: string;
  unit?: string;
  units?: string[];
};

export function multiNumberItem(input: {
  prompt: string;
  fields: NumberField[];
  solution: string[];
  figure?: Figure;
}): GeneratedItem {
  return {
    content: {
      type: "input",
      prompt: input.prompt,
      ...(input.figure ? { figure: input.figure } : {}),
      fields: input.fields.map((field) => ({
        kind: "number" as const,
        id: field.id,
        label: field.label,
        ...(field.suffix ? { suffix: field.suffix } : {}),
        ...(field.unit ? { units: field.units ?? LENGTH_UNITS } : {}),
      })),
    },
    key: {
      type: "input",
      fields: Object.fromEntries(
        input.fields.map((field) => {
          const value = round(field.value);
          return [
            field.id,
            {
              kind: "number" as const,
              value,
              ...(field.unit ? { unit: field.unit } : {}),
              knownErrors: cleanNumberErrors(value, field.errors ?? []),
            },
          ];
        }),
      ),
    },
    solution: input.solution,
  };
}

export function numberItem(input: {
  prompt: string;
  value: number;
  solution: string[];
  errors?: NumberError[];
  label?: string;
  suffix?: string;
  unit?: string;
  units?: string[];
  figure?: Figure;
}): GeneratedItem {
  return multiNumberItem({
    prompt: input.prompt,
    figure: input.figure,
    solution: input.solution,
    fields: [
      {
        id: "answer",
        label: input.label ?? "",
        value: input.value,
        errors: input.errors,
        suffix: input.suffix,
        unit: input.unit,
        units: input.units,
      },
    ],
  });
}

function cleanFractionErrors(correct: Rational, errors: readonly FractionError[]) {
  const kept: Array<{ numerator: number; denominator: number; tag: string; message: string }> = [];
  for (const error of errors) {
    if (error.d === 0 || !Number.isInteger(error.n) || !Number.isInteger(error.d)) continue;
    const value = rational(error.n, error.d);
    if (value.n * correct.d === correct.n * value.d) continue;
    if (kept.some((candidate) => candidate.numerator * value.d === value.n * candidate.denominator)) continue;
    kept.push({ numerator: value.n, denominator: value.d, tag: error.tag, message: error.message });
  }
  return kept;
}

export function fractionItem(input: {
  prompt: string;
  value: Rational;
  solution: string[];
  simplified?: "required" | "flag";
  errors?: FractionError[];
  label?: string;
}): GeneratedItem {
  return {
    content: { type: "input", prompt: input.prompt, fields: [{ kind: "fraction", id: "answer", label: input.label ?? "" }] },
    key: {
      type: "input",
      fields: {
        answer: {
          kind: "fraction",
          numerator: input.value.n,
          denominator: input.value.d,
          simplified: input.simplified ?? "flag",
          knownErrors: cleanFractionErrors(input.value, input.errors ?? []),
        },
      },
    },
    solution: input.solution,
  };
}

export function choiceItem(input: {
  prompt: string;
  options: Option[];
  correct: string;
  solution: string[];
  errors?: ChoiceError[];
  figure?: Figure;
}): GeneratedItem {
  const errors: ChoiceError[] = [];
  for (const error of input.errors ?? []) {
    if (error.option === input.correct || errors.some((candidate) => candidate.option === error.option)) continue;
    if (!input.options.some((option) => option.id === error.option)) continue;
    errors.push(error);
  }
  return {
    content: {
      type: "choice",
      prompt: input.prompt,
      ...(input.figure ? { figure: input.figure } : {}),
      options: input.options,
    },
    key: { type: "choice", correct: input.correct, knownErrors: errors },
    solution: input.solution,
  };
}

export function multiChoiceItem(input: {
  prompt: string;
  options: Option[];
  correct: string[];
  solution: string[];
  errors?: Array<{ includes: string; tag: string; message: string }>;
}): GeneratedItem {
  return {
    content: { type: "multi_choice", prompt: input.prompt, options: input.options },
    key: {
      type: "multi_choice",
      correct: input.correct,
      knownErrors: (input.errors ?? []).filter((error) => !input.correct.includes(error.includes)),
    },
    solution: input.solution,
  };
}

export function orderItem(input: { prompt: string; steps: Option[]; solution: string[] }): GeneratedItem {
  return {
    content: { type: "order", prompt: input.prompt, steps: input.steps },
    key: { type: "order", correct: input.steps.map((step) => step.id) },
    solution: input.solution,
  };
}

export type TextError = { answers: string[]; tag: string; message: string };

export type TextField = { id: string; label: string; accept: string[]; errors?: TextError[]; placeholder?: string };

function cleanTextErrors(accept: readonly string[], errors: readonly TextError[]): TextError[] {
  const kept: TextError[] = [];
  for (const error of errors) {
    const answers = error.answers.filter(
      (answer) =>
        !accept.some((value) => sameText(value, answer)) &&
        !kept.some((candidate) => candidate.answers.some((other) => sameText(other, answer))),
    );
    if (answers.length > 0) kept.push({ ...error, answers });
  }
  return kept;
}

export function textItem(input: { prompt: string; fields: TextField[]; solution: string[]; audio?: Audio }): GeneratedItem {
  return {
    content: {
      type: "input",
      prompt: input.prompt,
      ...(input.audio ? { audio: input.audio } : {}),
      fields: input.fields.map((field) => ({
        kind: "text" as const,
        id: field.id,
        label: field.label,
        ...(field.placeholder ? { placeholder: field.placeholder } : {}),
      })),
    },
    key: {
      type: "input",
      fields: Object.fromEntries(
        input.fields.map((field) => [
          field.id,
          { kind: "text" as const, accept: field.accept, knownErrors: cleanTextErrors(field.accept, field.errors ?? []) },
        ]),
      ),
    },
    solution: input.solution,
  };
}

export type TaskQuestion =
  | { kind: "select"; label: string; options: string[]; correct: string; hint: string }
  | { kind: "text"; label: string; accept: string[]; errors?: TextError[]; placeholder?: string };

const OPTION_IDS = ["a", "b", "c", "d", "e"];

export function taskItem(input: {
  prompt: string;
  passage?: string;
  audio?: Audio;
  questions: TaskQuestion[];
  solution: string[];
  allowedMistakes?: number;
}): GeneratedItem {
  const ids = input.questions.map((_, index) => `q${index + 1}`);
  const allowed = input.allowedMistakes ?? 0;
  return {
    content: {
      type: "input",
      prompt: input.prompt,
      ...(input.passage ? { passage: input.passage } : {}),
      ...(input.audio ? { audio: input.audio } : {}),
      fields: input.questions.map((question, index) =>
        question.kind === "select"
          ? {
              kind: "select" as const,
              id: ids[index],
              label: question.label,
              options: question.options.map((text, position) => ({ id: OPTION_IDS[position], text })),
            }
          : {
              kind: "text" as const,
              id: ids[index],
              label: question.label,
              ...(question.placeholder ? { placeholder: question.placeholder } : {}),
            },
      ),
    },
    key: {
      type: "input",
      fields: Object.fromEntries(
        input.questions.map((question, index) => {
          if (question.kind === "text") {
            return [ids[index], { kind: "text" as const, accept: question.accept, knownErrors: cleanTextErrors(question.accept, question.errors ?? []) }];
          }
          const correct = OPTION_IDS[question.options.indexOf(question.correct)];
          return [
            ids[index],
            {
              kind: "select" as const,
              correct,
              knownErrors: question.options
                .map((_, position) => OPTION_IDS[position])
                .filter((id) => id !== correct)
                .map((option) => ({ option, tag: "eng_task_check", message: question.hint })),
            },
          ];
        }),
      ),
      ...(allowed > 0
        ? {
            threshold: {
              min: input.questions.length - allowed,
              tag: "eng_task_threshold",
              message: "Più di una risposta non va: rileggi le domande e cerca nel testo le loro parole (nomi, numeri, giorni).",
            },
          }
        : {}),
    },
    solution: input.solution,
  };
}

export function shuffle<T>(random: Random, values: readonly T[]): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const swap = random.int(0, index);
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function distinctOptions(random: Random, correct: string, wrong: readonly string[], count = 4) {
  const unique = [...new Set(wrong.filter((text) => text !== correct))].slice(0, count - 1);
  const texts = shuffle(random, [correct, ...unique]);
  const ids = ["a", "b", "c", "d", "e"];
  const options = texts.map((text, index) => ({ id: ids[index], text }));
  const idOf = (text: string) => options.find((option) => option.text === text)?.id ?? "";
  return { options, correctId: idOf(correct), idOf };
}

export function retry<T>(random: Random, attempt: (random: Random) => T | null, fallback: T): T {
  for (let index = 0; index < 60; index++) {
    const result = attempt(random);
    if (result !== null) return result;
  }
  return fallback;
}
