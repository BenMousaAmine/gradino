"use server";

import { z } from "zod";
import { getUserId } from "@/lib/auth/session";
import { itemResponseSchema } from "@/lib/items/schemas";
import { answerStatsSchema } from "@/lib/tracking/schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { dayInRome, startOfDayInRome } from "./dates";
import { gradeAndStore, gradeSecondAttempt, resolveExercise, saveNote, templateExercise } from "./exercises";
import { applyAnswer, loadProgressInput, loadStudyContext, markLessonDone } from "./progress";
import { advanceBlock, findSession, getOrCreateSession, sessionView, todayAnswers } from "./session";
import { exerciseRefSchema, purposeSchema, type AnswerFeedback, type PublicExercise, type SessionView } from "./types";

async function studyContext() {
  const userId = await getUserId();
  const admin = createSupabaseAdminClient();
  const context = await loadStudyContext(admin, userId);
  if (!context) throw new Error("Complete the diagnostic test first.");
  return { userId, admin, context };
}

async function sessionState() {
  const userId = await getUserId();
  const admin = createSupabaseAdminClient();
  const today = dayInRome();
  const [context, found, answers] = await Promise.all([
    loadStudyContext(admin, userId),
    findSession(admin, userId, today),
    todayAnswers(admin, userId, startOfDayInRome(today)),
  ]);
  if (!context) throw new Error("Complete the diagnostic test first.");
  const session = await getOrCreateSession(admin, userId, context.today, found);
  return { userId, admin, context, session, answers };
}

const answerSchema = z.object({
  sessionId: z.uuid().nullable(),
  ref: exerciseRefSchema,
  purpose: purposeSchema,
  response: itemResponseSchema,
  timeMs: z.number().int().min(0).max(3_600_000),
  stats: answerStatsSchema.nullable().default(null),
});

export async function submitStudyAnswer(input: z.input<typeof answerSchema>): Promise<AnswerFeedback> {
  const { sessionId, ref, purpose, response, timeMs, stats } = answerSchema.parse(input);
  const userId = await getUserId();
  const admin = createSupabaseAdminClient();

  const [session, resolved] = await Promise.all([
    sessionId ? admin.from("study_sessions").select("user_id").eq("id", sessionId).maybeSingle() : null,
    resolveExercise(admin, ref),
  ]);
  if (session?.error) throw new Error(session.error.message);
  if (session && session.data?.user_id !== userId) throw new Error("Session not found.");

  const [{ feedback }, progressInput] = await Promise.all([
    gradeAndStore({ admin, userId, ref, purpose, sessionId, response, timeMs, stats, resolved }),
    loadProgressInput(admin, userId, resolved.skillId, resolved.level, purpose),
  ]);
  const event = await applyAnswer(admin, userId, resolved.skillId, resolved.level, purpose, progressInput, {
    id: feedback.answerId,
    score: feedback.score,
  });
  return { ...feedback, event };
}

const secondAttemptSchema = z.object({
  answerId: z.uuid(),
  response: itemResponseSchema,
  timeMs: z.number().int().min(0).max(3_600_000),
  stats: answerStatsSchema.nullable().default(null),
  hintMs: z.number().int().min(0).max(3_600_000),
});

export async function submitSecondAttempt(input: z.input<typeof secondAttemptSchema>): Promise<AnswerFeedback> {
  const parsed = secondAttemptSchema.parse(input);
  const userId = await getUserId();
  const feedback = await gradeSecondAttempt({ admin: createSupabaseAdminClient(), userId, ...parsed });
  return { ...feedback, event: null };
}

const noteSchema = z.object({
  answerId: z.uuid(),
  note: z
    .string()
    .trim()
    .max(4000)
    .refine((value) => value.split(/\s+/).filter((word) => word.length > 1).length >= 3, "too short"),
  source: z.enum(["typed", "voice", "mixed"]),
  ms: z.number().int().min(0).max(3_600_000),
});

export async function submitNote(input: z.input<typeof noteSchema>): Promise<void> {
  const parsed = noteSchema.parse(input);
  const userId = await getUserId();
  await saveNote({ admin: createSupabaseAdminClient(), userId, ...parsed });
}

export async function nextSessionStep(): Promise<SessionView> {
  const { admin, context, session, answers } = await sessionState();
  return sessionView(admin, context, session, answers);
}

export async function advanceSessionBlock(input: { sessionId: string }): Promise<SessionView> {
  const { sessionId } = z.object({ sessionId: z.uuid() }).parse(input);
  const { userId, admin, context, session, answers } = await sessionState();
  if (session.id !== sessionId) return sessionView(admin, context, session, answers);
  return sessionView(admin, context, await advanceBlock(admin, userId, session), answers);
}

export async function finishLesson(input: { skillId: string }): Promise<void> {
  const { skillId } = z.object({ skillId: z.string().min(1).max(80) }).parse(input);
  const userId = await getUserId();
  await markLessonDone(createSupabaseAdminClient(), userId, skillId);
}

export async function nextSkillExercise(input: { skillId: string }): Promise<PublicExercise> {
  const { skillId } = z.object({ skillId: z.string().min(1).max(80) }).parse(input);
  const { admin, context } = await studyContext();
  const skill = context.skills.get(skillId);
  const progress = context.progress.get(skillId);
  if (!skill || !progress) throw new Error("Skill not available.");
  const level = progress.status === "learning" ? progress.level : "advanced";
  const exercise = await templateExercise(admin, { id: skill.id, title: skill.title }, level, "practice");
  if (!exercise) throw new Error("No exercise for this skill.");
  return exercise;
}
