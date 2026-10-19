import { z } from "zod";
import type { Diagnosis } from "@/lib/items/grade";
import type { ItemContent, Level } from "@/lib/items/schemas";
import type { Lesson } from "@/lib/lessons/schema";
import type { ProgressEvent, SkillStatus } from "./mastery";

export const exerciseRefSchema = z.discriminatedUnion("source", [
  z.object({ source: z.literal("template"), id: z.string().min(1).max(80), seed: z.number().int() }),
  z.object({ source: z.literal("item"), id: z.string().min(1).max(80) }),
]);
export type ExerciseRef = z.infer<typeof exerciseRefSchema>;

export const purposeSchema = z.enum(["practice", "review", "retry", "warmup", "problem", "check"]);
export type ExercisePurpose = z.infer<typeof purposeSchema>;

export type PublicExercise = {
  ref: ExerciseRef;
  skillId: string;
  skillTitle: string;
  level: Level;
  purpose: ExercisePurpose;
  content: ItemContent;
};

export type AnswerFeedback = {
  answerId: string;
  attempt: 1 | 2;
  canRetry: boolean;
  needsNote: boolean;
  score: number;
  diagnosis: Diagnosis | null;
  correctAnswer: string[];
  solution: string[];
  event: ProgressEvent | null;
};

export type PathEntry = {
  id: string;
  title: string;
  areaTitle: string;
  status: SkillStatus;
  level: Level;
  steps: number;
  nextReviewOn: string | null;
  current: boolean;
};

export type BlockId = "warmup" | "new" | "practice" | "problems" | "check";

export type BlockState = {
  index: number;
  id: BlockId;
  title: string;
  minutes: number;
  pauseMinutes: number;
  startedAt: string;
};

export type SessionSummary = { answers: number; correct: number; minutes: number; skills: string[] };

export type StudyStep =
  | { kind: "exercise"; exercise: PublicExercise }
  | { kind: "lesson"; skillId: string; skillTitle: string; lesson: Lesson }
  | { kind: "done"; summary: SessionSummary };

export type SessionView = { sessionId: string; block: BlockState; step: StudyStep; serverTime: number };
