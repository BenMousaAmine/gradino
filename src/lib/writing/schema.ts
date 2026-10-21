import { z } from "zod";

export const writingPromptSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,80}$/),
  kind: z.enum(["email", "dialogue"]),
  title: z.string().min(1).max(80),
  task: z.string().min(1).max(600),
  points: z.array(z.string().min(1).max(200)).min(2).max(6),
  useful: z.array(z.string().min(1).max(120)).min(3).max(12),
  minWords: z.number().int().min(20).max(200),
  targetWords: z.number().int().min(30).max(250),
});
export type WritingPrompt = z.infer<typeof writingPromptSchema>;

export const writingStatsSchema = z.object({
  pastes: z.number().int().min(0).max(1000),
  pastedChars: z.number().int().min(0).max(100_000),
  awayMs: z.number().int().min(0).max(36_000_000).default(0),
});
export type WritingStats = z.infer<typeof writingStatsSchema>;

export const aiFeedbackSchema = z.object({
  score: z.number().int().min(1).max(10),
  summary: z.string().min(1).max(800),
  covered: z.array(z.object({ point: z.string().min(1).max(300), done: z.boolean() })).max(8),
  strengths: z.array(z.string().min(1).max(400)).max(3),
  fixes: z
    .array(
      z.object({
        original: z.string().min(1).max(400),
        corrected: z.string().min(1).max(400),
        explanation: z.string().min(1).max(500),
      }),
    )
    .max(5),
  nextStep: z.string().min(1).max(500),
});
export type AiFeedback = z.infer<typeof aiFeedbackSchema>;

export const aiStatusSchema = z.enum(["none", "pending", "done", "error"]);
export type AiStatus = z.infer<typeof aiStatusSchema>;

export const FEEDBACK_TOOL = {
  name: "submit_feedback",
  description: "Invia la correzione del testo dello studente.",
  input_schema: {
    type: "object",
    properties: {
      score: { type: "integer", minimum: 1, maximum: 10, description: "Voto da 1 a 10 come all'esame di terza media (livello A2)." },
      summary: { type: "string", description: "Due o tre frasi in italiano: com'è andata in generale." },
      covered: {
        type: "array",
        description: "Per ogni punto della traccia, se lo studente l'ha svolto.",
        items: {
          type: "object",
          properties: { point: { type: "string" }, done: { type: "boolean" } },
          required: ["point", "done"],
        },
      },
      strengths: { type: "array", maxItems: 3, items: { type: "string" }, description: "Fino a 3 cose fatte bene, in italiano." },
      fixes: {
        type: "array",
        maxItems: 5,
        description: "Fino a 5 errori, dal più importante. original = il pezzo esatto copiato dal testo.",
        items: {
          type: "object",
          properties: {
            original: { type: "string" },
            corrected: { type: "string" },
            explanation: { type: "string", description: "Perché, in italiano semplice, con il trucco per ricordarlo." },
          },
          required: ["original", "corrected", "explanation"],
        },
      },
      nextStep: { type: "string", description: "Una sola cosa su cui lavorare la prossima volta, in italiano." },
    },
    required: ["score", "summary", "covered", "strengths", "fixes", "nextStep"],
  },
} as const;

const messageSchema = z.object({
  model: z.string(),
  content: z.array(z.object({ type: z.string(), name: z.string().optional(), input: z.unknown().optional() })),
});

export function feedbackFromMessage(data: unknown): { feedback: AiFeedback; model: string } {
  const message = messageSchema.parse(data);
  const block = message.content.find((part) => part.type === "tool_use" && part.name === FEEDBACK_TOOL.name);
  if (!block) throw new Error("No feedback in the AI response.");
  return { feedback: aiFeedbackSchema.parse(block.input), model: message.model };
}

export function countWords(text: string): number {
  return text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length ?? 0;
}
