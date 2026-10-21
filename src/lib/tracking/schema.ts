import { z } from "zod";

export type InteractionKind = "input" | "correction" | "unit";

export const answerStatsSchema = z.object({
  firstInputMs: z.number().int().min(0).max(3_600_000).nullable(),
  inputs: z.number().int().min(0).max(10_000),
  corrections: z.number().int().min(0).max(10_000),
  unitChanges: z.number().int().min(0).max(1_000),
  idleCount: z.number().int().min(0).max(1_000).default(0),
  idleMs: z.number().int().min(0).max(3_600_000).default(0),
  awayCount: z.number().int().min(0).max(1_000).default(0),
  awayMs: z.number().int().min(0).max(3_600_000).default(0),
  audioPlays: z.number().int().min(0).max(1000).default(0),
});
export type AnswerStats = z.infer<typeof answerStatsSchema>;

export const CLIENT_EVENT_TYPES = [
  "feedback_closed",
  "lesson_opened",
  "lesson_step",
  "lesson_try",
  "lesson_completed",
  "pause_started",
  "pause_ended",
  "time_up",
  "away",
  "coach",
] as const;

export const SERVER_EVENT_TYPES = ["session_started", "block_started", "session_completed"] as const;

export type ClientEventType = (typeof CLIENT_EVENT_TYPES)[number];
export type EventType = ClientEventType | (typeof SERVER_EVENT_TYPES)[number];

const payloadValue = z.union([z.string().max(200), z.number(), z.boolean(), z.null()]);

export const clientEventSchema = z.object({
  type: z.enum(CLIENT_EVENT_TYPES),
  sessionId: z.uuid().nullable().optional(),
  skillId: z.string().min(1).max(80).nullable().optional(),
  payload: z.record(z.string().max(40), payloadValue).default({}),
  at: z.iso.datetime(),
});
export type ClientEvent = z.input<typeof clientEventSchema>;

export const clientEventBatchSchema = z.array(clientEventSchema).min(1).max(100);
