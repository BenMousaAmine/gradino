import {
  equivalentFractions,
  isReduced,
  normalizeFraction,
  parseDecimal,
  parseInteger,
  sameNumber,
} from "./numbers";
import type {
  FieldKey,
  FieldResponse,
  FractionFieldKey,
  ItemKey,
  ItemResponse,
  NumberFieldKey,
  SelectFieldKey,
  TextFieldKey,
} from "./schemas";
import { sameText } from "./text";

export type Diagnosis = { tag: string; message: string | null };

export type FieldGrade = { fieldId: string; score: number; diagnosis: Diagnosis | null };

export type Grade = { score: number; diagnosis: Diagnosis | null; fields: FieldGrade[] };

export const GENERIC_TAGS = {
  wrong: "wrong",
  empty: "empty",
  invalid: "invalid",
  skipped: "skipped",
  unitMissing: "unit_missing",
  unitWrong: "unit_wrong",
  notSimplified: "not_simplified",
  wrongOrder: "wrong_order",
} as const;

const genericTagSet = new Set<string>(Object.values(GENERIC_TAGS));

function generic(tag: string, message: string | null = null): Diagnosis {
  return { tag, message };
}

function gradeNumberField(key: NumberFieldKey, response: FieldResponse | undefined): Omit<FieldGrade, "fieldId"> {
  if (!response || response.kind !== "number" || response.value.trim() === "") {
    return { score: 0, diagnosis: generic(GENERIC_TAGS.empty) };
  }
  const value = parseDecimal(response.value);
  if (value === null) return { score: 0, diagnosis: generic(GENERIC_TAGS.invalid) };

  if (sameNumber(value, key.value, key.tolerance)) {
    if (!key.unit || response.unit === key.unit) return { score: 1, diagnosis: null };
    if (!response.unit) {
      return {
        score: 0.5,
        diagnosis: generic(GENERIC_TAGS.unitMissing, "Il numero è giusto, ma manca l'unità di misura."),
      };
    }
    return {
      score: 0.5,
      diagnosis: generic(GENERIC_TAGS.unitWrong, `Il numero è giusto, ma l'unità di misura corretta è ${key.unit}.`),
    };
  }

  const known = key.knownErrors.find((error) => sameNumber(value, error.value, error.tolerance));
  if (known) return { score: 0, diagnosis: { tag: known.tag, message: known.message } };
  return { score: 0, diagnosis: generic(GENERIC_TAGS.wrong) };
}

function gradeFractionField(key: FractionFieldKey, response: FieldResponse | undefined): Omit<FieldGrade, "fieldId"> {
  if (!response || response.kind !== "fraction" || (response.numerator.trim() === "" && response.denominator.trim() === "")) {
    return { score: 0, diagnosis: generic(GENERIC_TAGS.empty) };
  }
  const numerator = parseInteger(response.numerator);
  const denominator = parseInteger(response.denominator);
  const given = numerator === null || denominator === null ? null : normalizeFraction(numerator, denominator);
  if (!given) return { score: 0, diagnosis: generic(GENERIC_TAGS.invalid) };

  const expected = { numerator: key.numerator, denominator: key.denominator };
  if (equivalentFractions(given, expected)) {
    if (isReduced(given)) return { score: 1, diagnosis: null };
    const diagnosis = generic(
      GENERIC_TAGS.notSimplified,
      "Il valore è giusto, ma la frazione va semplificata fino in fondo.",
    );
    return { score: key.simplified === "required" ? 0 : 1, diagnosis };
  }

  const known = key.knownErrors.find((error) => equivalentFractions(given, error));
  if (known) return { score: 0, diagnosis: { tag: known.tag, message: known.message } };
  return { score: 0, diagnosis: generic(GENERIC_TAGS.wrong) };
}

function gradeTextField(key: TextFieldKey, response: FieldResponse | undefined): Omit<FieldGrade, "fieldId"> {
  if (!response || response.kind !== "text" || response.value.trim() === "") {
    return { score: 0, diagnosis: generic(GENERIC_TAGS.empty) };
  }
  if (key.accept.some((answer) => sameText(response.value, answer))) return { score: 1, diagnosis: null };
  const known = key.knownErrors.find((error) => error.answers.some((answer) => sameText(response.value, answer)));
  if (known) return { score: 0, diagnosis: { tag: known.tag, message: known.message } };
  return { score: 0, diagnosis: generic(GENERIC_TAGS.wrong) };
}

function gradeSelectField(key: SelectFieldKey, response: FieldResponse | undefined): Omit<FieldGrade, "fieldId"> {
  if (!response || response.kind !== "select" || response.option === "") {
    return { score: 0, diagnosis: generic(GENERIC_TAGS.empty) };
  }
  if (response.option === key.correct) return { score: 1, diagnosis: null };
  const known = key.knownErrors.find((error) => error.option === response.option);
  if (known) return { score: 0, diagnosis: { tag: known.tag, message: known.message } };
  return { score: 0, diagnosis: generic(GENERIC_TAGS.wrong) };
}

function gradeField(key: FieldKey, response: FieldResponse | undefined) {
  if (key.kind === "number") return gradeNumberField(key, response);
  if (key.kind === "fraction") return gradeFractionField(key, response);
  if (key.kind === "select") return gradeSelectField(key, response);
  return gradeTextField(key, response);
}

function pickDiagnosis(fields: FieldGrade[]): Diagnosis | null {
  const diagnosed = fields.filter((field) => field.diagnosis !== null);
  const failing = diagnosed.filter((field) => field.score < 1);
  const pool = failing.length > 0 ? failing : diagnosed;
  const specific = pool.find((field) => !genericTagSet.has(field.diagnosis!.tag));
  return (specific ?? pool[0])?.diagnosis ?? null;
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  const left = new Set(a);
  const right = new Set(b);
  return left.size === right.size && [...left].every((value) => right.has(value));
}

export function gradeItem(key: ItemKey, response: ItemResponse): Grade {
  if (response.type === "skip") return { score: 0, diagnosis: generic(GENERIC_TAGS.skipped), fields: [] };
  if (response.type !== key.type) return { score: 0, diagnosis: generic(GENERIC_TAGS.invalid), fields: [] };

  switch (key.type) {
    case "input": {
      const answers = response.type === "input" ? response.fields : {};
      const fields = Object.entries(key.fields).map(([fieldId, fieldKey]) => ({
        fieldId,
        ...gradeField(fieldKey, answers[fieldId]),
      }));
      if (key.threshold) {
        const correct = fields.filter((field) => field.score === 1).length;
        const passed = correct >= key.threshold.min;
        return {
          score: passed ? 1 : 0,
          diagnosis: passed ? pickDiagnosis(fields) : { tag: key.threshold.tag, message: key.threshold.message },
          fields,
        };
      }
      const score = fields.reduce((sum, field) => sum + field.score, 0) / fields.length;
      return { score, diagnosis: pickDiagnosis(fields), fields };
    }
    case "choice": {
      const option = response.type === "choice" ? response.option : "";
      if (option === key.correct) return { score: 1, diagnosis: null, fields: [] };
      const known = key.knownErrors.find((error) => error.option === option);
      return {
        score: 0,
        diagnosis: known ? { tag: known.tag, message: known.message } : generic(GENERIC_TAGS.wrong),
        fields: [],
      };
    }
    case "multi_choice": {
      const options = response.type === "multi_choice" ? response.options : [];
      if (sameSet(options, key.correct)) return { score: 1, diagnosis: null, fields: [] };
      const known = key.knownErrors.find((error) => options.includes(error.includes));
      return {
        score: 0,
        diagnosis: known ? { tag: known.tag, message: known.message } : generic(GENERIC_TAGS.wrong),
        fields: [],
      };
    }
    case "order": {
      const order = response.type === "order" ? response.order : [];
      const correct = order.length === key.correct.length && order.every((id, index) => id === key.correct[index]);
      return correct
        ? { score: 1, diagnosis: null, fields: [] }
        : { score: 0, diagnosis: generic(GENERIC_TAGS.wrongOrder), fields: [] };
    }
  }
}
