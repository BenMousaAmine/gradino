import { z } from "zod";
import { figureSchema } from "@/lib/items/figure";
import { fieldKeySchema, type ItemContent, type ItemKey } from "@/lib/items/schemas";

const text = z.string().min(1);

export const visualSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("fraction-bars"),
    bars: z
      .array(
        z.object({
          numerator: z.number().int().min(0),
          denominator: z.number().int().min(1).max(24),
          label: z.string().optional(),
        }),
      )
      .min(1)
      .max(4),
  }),
  z.object({
    type: z.literal("decimal-grid"),
    filled: z.number().int().min(0).max(100),
    label: z.string().optional(),
  }),
  z.object({ type: z.literal("figure"), figure: figureSchema }),
]);
export type Visual = z.infer<typeof visualSchema>;

export const lessonSchema = z.object({
  title: text,
  understand: z.object({ paragraphs: z.array(text).min(1), visual: visualSchema.optional() }),
  recipe: z.array(text).min(2),
  example: z.object({ prompt: text, steps: z.array(text).min(1), answer: text }),
  complete: z.object({
    prompt: text,
    given: z.array(text).default([]),
    blanks: z.array(z.object({ label: text, key: fieldKeySchema })).min(1).max(4),
  }),
  watchOut: z.array(text).default([]),
});
export type Lesson = z.infer<typeof lessonSchema>;

export function completeAsItem(complete: Lesson["complete"]): { content: ItemContent; key: ItemKey } {
  const ids = complete.blanks.map((_, index) => `b${index}`);
  return {
    content: {
      type: "input",
      prompt: complete.prompt,
      fields: complete.blanks.map((blank, index) => ({ kind: blank.key.kind, id: ids[index], label: blank.label })),
    },
    key: {
      type: "input",
      fields: Object.fromEntries(complete.blanks.map((blank, index) => [ids[index], blank.key])),
    },
  };
}
