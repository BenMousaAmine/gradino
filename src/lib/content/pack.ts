import { z } from "zod";
import { assessmentConfigSchema } from "@/lib/diagnostic/engine";
import { GENERATORS, generateItem, generatorParamsSchema } from "@/lib/generators/registry";
import { gradeItem } from "@/lib/items/grade";
import { formatDecimal } from "@/lib/items/numbers";
import {
  itemContentSchema,
  itemKeySchema,
  levelSchema,
  type FieldResponse,
  type ItemContent,
  type ItemKey,
  type ItemResponse,
} from "@/lib/items/schemas";
import { completeAsItem, lessonSchema } from "@/lib/lessons/schema";

const idSchema = z.string().min(1).max(80);
const titleSchema = z.string().min(1);

const sectionSchema = z.object({
  id: idSchema,
  code: z.string().min(1).max(8),
  areaId: idSchema,
  title: titleSchema,
  part: z.number().int().positive(),
  optionalQuestion: z.string().min(1).nullable().default(null),
  itemIds: z.array(idSchema).min(1),
});

export const packSchema = z.object({
  subjects: z.array(z.object({ id: idSchema, title: titleSchema })).default([]),
  areas: z.array(z.object({ id: idSchema, subjectId: idSchema, title: titleSchema })).default([]),
  skills: z
    .array(
      z.object({
        id: idSchema,
        areaId: idSchema,
        title: titleSchema,
        schoolYear: z.number().int().min(1).max(3).nullable().default(null),
        prerequisites: z.array(idSchema).default([]),
      }),
    )
    .default([]),
  items: z
    .array(
      z.object({
        id: idSchema,
        skillId: idSchema,
        level: levelSchema,
        status: z.enum(["draft", "published"]).default("published"),
        kind: z.enum(["exercise", "problem"]).default("exercise"),
        content: itemContentSchema,
        key: itemKeySchema,
        solution: z.array(z.string().min(1)).default([]),
      }),
    )
    .default([]),
  lessons: z.array(lessonSchema.extend({ skillId: idSchema })).default([]),
  templates: z
    .array(
      z.object({
        id: idSchema,
        skillId: idSchema,
        level: levelSchema,
        generator: z.string().min(1),
        params: generatorParamsSchema,
        status: z.enum(["draft", "published"]).default("published"),
      }),
    )
    .default([]),
  assessments: z
    .array(
      z.object({
        id: idSchema,
        subjectId: idSchema,
        kind: z.literal("diagnostic"),
        title: titleSchema,
        description: z.string().default(""),
        config: assessmentConfigSchema,
        sections: z.array(sectionSchema).min(1),
      }),
    )
    .default([]),
});

export type Pack = z.infer<typeof packSchema>;
export type PackItem = Pack["items"][number];

export function mergePacks(packs: readonly Pack[]): Pack {
  return {
    subjects: packs.flatMap((pack) => pack.subjects),
    areas: packs.flatMap((pack) => pack.areas),
    skills: packs.flatMap((pack) => pack.skills),
    items: packs.flatMap((pack) => pack.items),
    lessons: packs.flatMap((pack) => pack.lessons),
    templates: packs.flatMap((pack) => pack.templates),
    assessments: packs.flatMap((pack) => pack.assessments),
  };
}

function duplicates(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) repeated.add(id);
    seen.add(id);
  }
  return [...repeated];
}

export function correctResponse(content: ItemContent, key: ItemKey): ItemResponse {
  switch (key.type) {
    case "input": {
      const fields: Record<string, FieldResponse> = {};
      for (const [fieldId, fieldKey] of Object.entries(key.fields)) {
        fields[fieldId] =
          fieldKey.kind === "number"
            ? { kind: "number", value: formatDecimal(fieldKey.value), unit: fieldKey.unit }
            : { kind: "fraction", numerator: String(fieldKey.numerator), denominator: String(fieldKey.denominator) };
      }
      return { type: "input", fields };
    }
    case "choice":
      return { type: "choice", option: key.correct };
    case "multi_choice":
      return { type: "multi_choice", options: key.correct };
    case "order":
      return { type: "order", order: content.type === "order" ? key.correct : [] };
  }
}

export function checkItemConsistency(where: string, content: ItemContent, key: ItemKey): string[] {
  const errors: string[] = [];

  if (content.type !== key.type) return [`${where}: content type ${content.type} differs from key type ${key.type}`];

  if (content.type === "input" && key.type === "input") {
    const contentIds = content.fields.map((field) => field.id);
    const keyIds = Object.keys(key.fields);
    for (const id of duplicates(contentIds)) errors.push(`${where}: duplicate field ${id}`);
    for (const field of content.fields) {
      const fieldKey = key.fields[field.id];
      if (!fieldKey) {
        errors.push(`${where}: field ${field.id} has no key`);
        continue;
      }
      if (fieldKey.kind !== field.kind) errors.push(`${where}: field ${field.id} kind mismatch`);
      if (field.kind === "number" && fieldKey.kind === "number") {
        if (field.units && !fieldKey.unit) errors.push(`${where}: field ${field.id} offers units but key has none`);
        if (fieldKey.unit && !field.units?.includes(fieldKey.unit)) {
          errors.push(`${where}: field ${field.id} unit ${fieldKey.unit} is not among the offered units`);
        }
      }
    }
    for (const id of keyIds) if (!contentIds.includes(id)) errors.push(`${where}: key field ${id} not in content`);
    if (key.threshold && key.threshold.min > keyIds.length) errors.push(`${where}: threshold above field count`);
  }

  if ((content.type === "choice" || content.type === "multi_choice") && (key.type === "choice" || key.type === "multi_choice")) {
    const optionIds = content.options.map((option) => option.id);
    for (const id of duplicates(optionIds)) errors.push(`${where}: duplicate option ${id}`);
    const correct = key.type === "choice" ? [key.correct] : key.correct;
    for (const id of correct) if (!optionIds.includes(id)) errors.push(`${where}: correct option ${id} does not exist`);
    for (const error of key.knownErrors) {
      const option = "option" in error ? error.option : error.includes;
      if (!optionIds.includes(option)) errors.push(`${where}: known error option ${option} does not exist`);
      if (correct.includes(option) && key.type === "choice") errors.push(`${where}: known error on the correct option`);
    }
  }

  if (content.type === "order" && key.type === "order") {
    const stepIds = content.steps.map((step) => step.id);
    const sameSteps = stepIds.length === key.correct.length && key.correct.every((id) => stepIds.includes(id));
    if (!sameSteps) errors.push(`${where}: order key must list every step exactly once`);
  }

  if (errors.length > 0) return errors;

  const grade = gradeItem(key, correctResponse(content, key));
  if (grade.score !== 1) errors.push(`${where}: the key does not grade itself as correct (score ${grade.score})`);

  if (key.type === "input") {
    for (const [fieldId, fieldKey] of Object.entries(key.fields)) {
      for (const error of fieldKey.knownErrors) {
        const response = correctResponse(content, key);
        if (response.type !== "input") continue;
        response.fields[fieldId] =
          fieldKey.kind === "number" && "value" in error
            ? { kind: "number", value: formatDecimal(error.value), unit: fieldKey.unit }
            : "numerator" in error
              ? { kind: "fraction", numerator: String(error.numerator), denominator: String(error.denominator) }
              : response.fields[fieldId];
        const fieldGrade = gradeItem(key, response).fields.find((field) => field.fieldId === fieldId);
        if (fieldGrade?.diagnosis?.tag !== error.tag) {
          errors.push(`${where}: known error ${error.tag} on field ${fieldId} is not detected`);
        }
      }
    }
  }

  return errors;
}

export function validatePack(pack: Pack): string[] {
  const errors: string[] = [];
  const subjectIds = new Set(pack.subjects.map((subject) => subject.id));
  const areaIds = new Set(pack.areas.map((area) => area.id));
  const skillIds = new Set(pack.skills.map((skill) => skill.id));
  const itemIds = new Set(pack.items.map((item) => item.id));

  const collections: Array<[string, readonly { id: string }[]]> = [
    ["subject", pack.subjects],
    ["area", pack.areas],
    ["skill", pack.skills],
    ["item", pack.items],
    ["lesson", pack.lessons.map((lesson) => ({ id: lesson.skillId }))],
    ["template", pack.templates],
    ["assessment", pack.assessments],
    ["section", pack.assessments.flatMap((assessment) => assessment.sections)],
  ];
  for (const [name, rows] of collections) {
    for (const id of duplicates(rows.map((row) => row.id))) errors.push(`duplicate ${name} id ${id}`);
  }

  for (const area of pack.areas) {
    if (!subjectIds.has(area.subjectId)) errors.push(`area ${area.id}: unknown subject ${area.subjectId}`);
  }
  for (const skill of pack.skills) {
    if (!areaIds.has(skill.areaId)) errors.push(`skill ${skill.id}: unknown area ${skill.areaId}`);
    for (const prerequisite of skill.prerequisites) {
      if (!skillIds.has(prerequisite)) errors.push(`skill ${skill.id}: unknown prerequisite ${prerequisite}`);
      if (prerequisite === skill.id) errors.push(`skill ${skill.id}: depends on itself`);
    }
  }
  for (const item of pack.items) {
    if (!skillIds.has(item.skillId)) errors.push(`item ${item.id}: unknown skill ${item.skillId}`);
    errors.push(...checkItemConsistency(`item ${item.id}`, item.content, item.key));
  }
  for (const item of pack.items) {
    if (item.kind === "problem" && item.solution.length === 0) errors.push(`item ${item.id}: problems need a solution`);
  }
  for (const lesson of pack.lessons) {
    if (!skillIds.has(lesson.skillId)) errors.push(`lesson ${lesson.skillId}: unknown skill`);
    const { content, key } = completeAsItem(lesson.complete);
    errors.push(...checkItemConsistency(`lesson ${lesson.skillId} complete`, content, key));
  }
  for (const template of pack.templates) {
    if (!skillIds.has(template.skillId)) errors.push(`template ${template.id}: unknown skill ${template.skillId}`);
    if (!GENERATORS[template.generator]) {
      errors.push(`template ${template.id}: unknown generator ${template.generator}`);
      continue;
    }
    for (let seed = 1; seed <= 50; seed++) {
      const generated = generateItem(template.generator, template.params, seed);
      const problems = checkItemConsistency(`template ${template.id} seed ${seed}`, generated.content, generated.key);
      if (problems.length > 0) {
        errors.push(...problems);
        break;
      }
    }
  }
  for (const assessment of pack.assessments) {
    if (!subjectIds.has(assessment.subjectId)) {
      errors.push(`assessment ${assessment.id}: unknown subject ${assessment.subjectId}`);
    }
    const codes = assessment.sections.map((section) => section.code);
    for (const code of duplicates(codes)) errors.push(`assessment ${assessment.id}: duplicate section code ${code}`);
    for (const code of assessment.config.recoveryOrder) {
      if (!codes.includes(code)) errors.push(`assessment ${assessment.id}: recovery order code ${code} has no section`);
    }
    for (const section of assessment.sections) {
      if (!areaIds.has(section.areaId)) errors.push(`section ${section.id}: unknown area ${section.areaId}`);
      for (const id of section.itemIds) if (!itemIds.has(id)) errors.push(`section ${section.id}: unknown item ${id}`);
      for (const id of duplicates(section.itemIds)) errors.push(`section ${section.id}: duplicate item ${id}`);
    }
  }

  return errors;
}
