import { z } from "zod";
import { figureSchema } from "./figure";

export const levelSchema = z.enum(["base", "medium", "advanced"]);
export type Level = z.infer<typeof levelSchema>;

const idSchema = z.string().min(1).max(64);
const textSchema = z.string().min(1);

const optionSchema = z.object({ id: idSchema, text: textSchema });
export type Option = z.infer<typeof optionSchema>;

const numberFieldSchema = z.object({
  kind: z.literal("number"),
  id: idSchema,
  label: z.string(),
  suffix: z.string().optional(),
  units: z.array(textSchema).min(2).optional(),
});

const fractionFieldSchema = z.object({
  kind: z.literal("fraction"),
  id: idSchema,
  label: z.string(),
});

export const fieldSchema = z.discriminatedUnion("kind", [numberFieldSchema, fractionFieldSchema]);
export type Field = z.infer<typeof fieldSchema>;

const figure = figureSchema.optional();

export const itemContentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("input"),
    prompt: textSchema,
    figure,
    fields: z.array(fieldSchema).min(1),
    timeLimitSec: z.number().int().positive().optional(),
  }),
  z.object({ type: z.literal("choice"), prompt: textSchema, figure, options: z.array(optionSchema).min(2) }),
  z.object({ type: z.literal("multi_choice"), prompt: textSchema, figure, options: z.array(optionSchema).min(2) }),
  z.object({ type: z.literal("order"), prompt: textSchema, figure, steps: z.array(optionSchema).min(2) }),
]);
export type ItemContent = z.infer<typeof itemContentSchema>;
export type ItemType = ItemContent["type"];

const diagnosisSchema = { tag: idSchema, message: textSchema };

const numberFieldKeySchema = z.object({
  kind: z.literal("number"),
  value: z.number(),
  tolerance: z.number().nonnegative().optional(),
  unit: textSchema.optional(),
  knownErrors: z
    .array(z.object({ value: z.number(), tolerance: z.number().nonnegative().optional(), ...diagnosisSchema }))
    .default([]),
});

const fractionFieldKeySchema = z.object({
  kind: z.literal("fraction"),
  numerator: z.number().int(),
  denominator: z.number().int().positive(),
  simplified: z.enum(["required", "flag"]),
  knownErrors: z
    .array(z.object({ numerator: z.number().int(), denominator: z.number().int().positive(), ...diagnosisSchema }))
    .default([]),
});

export const fieldKeySchema = z.discriminatedUnion("kind", [numberFieldKeySchema, fractionFieldKeySchema]);
export type FieldKey = z.infer<typeof fieldKeySchema>;
export type NumberFieldKey = z.infer<typeof numberFieldKeySchema>;
export type FractionFieldKey = z.infer<typeof fractionFieldKeySchema>;

export const itemKeySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("input"),
    fields: z.record(idSchema, fieldKeySchema),
    threshold: z.object({ min: z.number().int().positive(), ...diagnosisSchema }).optional(),
  }),
  z.object({
    type: z.literal("choice"),
    correct: idSchema,
    knownErrors: z.array(z.object({ option: idSchema, ...diagnosisSchema })).default([]),
  }),
  z.object({
    type: z.literal("multi_choice"),
    correct: z.array(idSchema).min(1),
    knownErrors: z.array(z.object({ includes: idSchema, ...diagnosisSchema })).default([]),
  }),
  z.object({ type: z.literal("order"), correct: z.array(idSchema).min(2) }),
]);
export type ItemKey = z.infer<typeof itemKeySchema>;
export type ItemKeyInput = z.input<typeof itemKeySchema>;

const shortText = z.string().max(32);

export const fieldResponseSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("number"), value: shortText, unit: shortText.optional() }),
  z.object({ kind: z.literal("fraction"), numerator: shortText, denominator: shortText }),
]);
export type FieldResponse = z.infer<typeof fieldResponseSchema>;

export const itemResponseSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("input"), fields: z.record(idSchema, fieldResponseSchema) }),
  z.object({ type: z.literal("choice"), option: idSchema }),
  z.object({ type: z.literal("multi_choice"), options: z.array(idSchema).max(20) }),
  z.object({ type: z.literal("order"), order: z.array(idSchema).max(20) }),
  z.object({ type: z.literal("skip") }),
]);
export type ItemResponse = z.infer<typeof itemResponseSchema>;
