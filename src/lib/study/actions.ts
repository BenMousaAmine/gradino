"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { itemResponseSchema } from "@/lib/items/schemas";
import { answerStatsSchema } from "@/lib/tracking/schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { gradeAndStore, gradeSecondAttempt, saveNote, templateExercise } from "./exercises";
import { applyAnswer, loadStudyContext, markLessonDone } from "./progress";
import { advanceBlock, getOrCreateSession, sessionView } from "./session";
import { exerciseRefSchema, purposeSchema, type AnswerFeedback, type PublicExercise, type SessionView } from "./types";

async function studyContext() {
  const user = await getCurrentUser();
  const admin = createSupabaseAdminClient();
  const context = await loadStudyContext(admin, user.id);
  if (!context) throw new Error("Complete the diagnostic test first.");
  return { user, admin, context };
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
  const user = await getCurrentUser();
  const admin = createSupabaseAdminClient();

  if (sessionId) {
    const session = await admin.from("study_sessions").select("user_id").eq("id", sessionId).maybeSingle();
    if (session.error) throw new Error(session.error.message);
    if (session.data?.user_id !== user.id) throw new Error("Session not found.");
  }

  const { resolved, feedback } = await gradeAndStore({ admin, userId: user.id, ref, purpose, sessionId, response, timeMs, stats });
  const event = await applyAnswer(admin, user.id, resolved.skillId, resolved.level, purpose);
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
  const user = await getCurrentUser();
  const feedback = await gradeSecondAttempt({ admin: createSupabaseAdminClient(), userId: user.id, ...parsed });
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
  const user = await getCurrentUser();
  await saveNote({ admin: createSupabaseAdminClient(), userId: user.id, ...parsed });
}

export async function nextSessionStep(): Promise<SessionView> {
  const { user, admin, context } = await studyContext();
  const session = await getOrCreateSession(admin, user.id, context.today);
  return sessionView(admin, context, session);
}

export async function advanceSessionBlock(input: { sessionId: string }): Promise<SessionView> {
  const { sessionId } = z.object({ sessionId: z.uuid() }).parse(input);
  const { user, admin, context } = await studyContext();
  const session = await getOrCreateSession(admin, user.id, context.today);
  if (session.id !== sessionId) return sessionView(admin, context, session);
  return sessionView(admin, context, await advanceBlock(admin, user.id, session));
}

export async function finishLesson(input: { skillId: string }): Promise<void> {
  const { skillId } = z.object({ skillId: z.string().min(1).max(80) }).parse(input);
  const user = await getCurrentUser();
  await markLessonDone(createSupabaseAdminClient(), user.id, skillId);
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
