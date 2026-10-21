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

const textFieldSchema = z.object({
  kind: z.literal("text"),
  id: idSchema,
  label: z.string(),
  placeholder: z.string().optional(),
});

const selectFieldSchema = z.object({
  kind: z.literal("select"),
  id: idSchema,
  label: z.string(),
  options: z.array(optionSchema).min(2),
});

export const fieldSchema = z.discriminatedUnion("kind", [numberFieldSchema, fractionFieldSchema, textFieldSchema, selectFieldSchema]);
export type Field = z.infer<typeof fieldSchema>;

const figure = figureSchema.optional();

export const audioSchema = z.object({
  text: textSchema,
  lang: z.enum(["en-GB", "en-US"]).default("en-GB"),
  dialogue: z
    .array(z.object({ voice: z.union([z.literal(0), z.literal(1)]), text: textSchema }))
    .min(1)
    .optional(),
  maxPlays: z.number().int().positive().optional(),
});
export type Audio = z.infer<typeof audioSchema>;

const audio = audioSchema.optional();
const passage = z.string().min(1).optional();

export const itemContentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("input"),
    prompt: textSchema,
    figure,
    audio,
    passage,
    fields: z.array(fieldSchema).min(1),
    timeLimitSec: z.number().int().positive().optional(),
  }),
  z.object({ type: z.literal("choice"), prompt: textSchema, figure, audio, passage, options: z.array(optionSchema).min(2) }),
  z.object({ type: z.literal("multi_choice"), prompt: textSchema, figure, audio, passage, options: z.array(optionSchema).min(2) }),
  z.object({ type: z.literal("order"), prompt: textSchema, figure, audio, passage, steps: z.array(optionSchema).min(2) }),
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

const textFieldKeySchema = z.object({
  kind: z.literal("text"),
  accept: z.array(textSchema).min(1),
  knownErrors: z.array(z.object({ answers: z.array(textSchema).min(1), ...diagnosisSchema })).default([]),
});

const selectFieldKeySchema = z.object({
  kind: z.literal("select"),
  correct: idSchema,
  knownErrors: z.array(z.object({ option: idSchema, ...diagnosisSchema })).default([]),
});

export const fieldKeySchema = z.discriminatedUnion("kind", [
  numberFieldKeySchema,
  fractionFieldKeySchema,
  textFieldKeySchema,
  selectFieldKeySchema,
]);
export type FieldKey = z.infer<typeof fieldKeySchema>;

export const blankKeySchema = z.discriminatedUnion("kind", [numberFieldKeySchema, fractionFieldKeySchema, textFieldKeySchema]);
export type NumberFieldKey = z.infer<typeof numberFieldKeySchema>;
export type FractionFieldKey = z.infer<typeof fractionFieldKeySchema>;
export type TextFieldKey = z.infer<typeof textFieldKeySchema>;
export type SelectFieldKey = z.infer<typeof selectFieldKeySchema>;

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
  z.object({ kind: z.literal("text"), value: z.string().max(200) }),
  z.object({ kind: z.literal("select"), option: z.string().max(64) }),
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
