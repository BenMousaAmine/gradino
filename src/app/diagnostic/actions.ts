"use server";

import { z } from "zod";
import { DIAGNOSTIC_ID } from "@/lib/app";
import { loadAssessment, loadScores } from "@/lib/assessments/queries";
import { toEngineSections } from "@/lib/assessments/view";
import { getCurrentUser } from "@/lib/auth/session";
import {
  nextStep,
  recoveryPlan,
  sectionChoiceSchema,
  sectionChoicesSchema,
  sectionResults,
} from "@/lib/diagnostic/engine";
import { gradeItem } from "@/lib/items/grade";
import { itemKeySchema, itemResponseSchema } from "@/lib/items/schemas";
import { answerStatsSchema } from "@/lib/tracking/schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const UNIQUE_VIOLATION = "23505";

async function ownedAttempt(attemptId: string) {
  const user = await getCurrentUser();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("attempts")
    .select("id, user_id, assessment_id, status, current_part, section_choices")
    .eq("id", attemptId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.user_id !== user.id) throw new Error("Attempt not found.");
  if (data.status !== "in_progress") throw new Error("Attempt already completed.");
  return { user, admin, attempt: data };
}

export async function startDiagnostic(): Promise<{ attemptId: string }> {
  const user = await getCurrentUser();
  const admin = createSupabaseAdminClient();

  const existing = await admin
    .from("attempts")
    .select("id")
    .eq("user_id", user.id)
    .eq("assessment_id", DIAGNOSTIC_ID)
    .eq("status", "in_progress")
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return { attemptId: existing.data.id };

  const { data, error } = await admin
    .from("attempts")
    .insert({ user_id: user.id, assessment_id: DIAGNOSTIC_ID })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { attemptId: data.id };
}

const submitSchema = z.object({
  attemptId: z.uuid(),
  itemId: z.string().min(1).max(80),
  response: itemResponseSchema,
  timeMs: z.number().int().min(0).max(3_600_000),
  stats: answerStatsSchema.nullable().default(null),
});

export async function submitAnswer(input: z.input<typeof submitSchema>): Promise<{ score: number }> {
  const { attemptId, itemId, response, timeMs, stats } = submitSchema.parse(input);
  const { user, admin, attempt } = await ownedAttempt(attemptId);

  const membership = await admin
    .from("assessment_items")
    .select("item_id, assessment_sections!inner(assessment_id)")
    .eq("item_id", itemId)
    .eq("assessment_sections.assessment_id", attempt.assessment_id)
    .limit(1);
  if (membership.error) throw new Error(membership.error.message);
  if (membership.data.length === 0) throw new Error("Item not in this assessment.");

  const existing = await admin
    .from("responses")
    .select("score")
    .eq("attempt_id", attemptId)
    .eq("item_id", itemId)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return { score: existing.data.score };

  const keyRow = await admin.from("item_keys").select("key").eq("item_id", itemId).single();
  if (keyRow.error) throw new Error(keyRow.error.message);

  const grade = gradeItem(itemKeySchema.parse(keyRow.data.key), response);
  const insert = await admin.from("responses").insert({
    attempt_id: attemptId,
    user_id: user.id,
    item_id: itemId,
    answer: response,
    score: grade.score,
    error_tag: grade.diagnosis?.tag ?? null,
    details: { diagnosis: grade.diagnosis, fields: grade.fields, stats },
    time_ms: timeMs,
  });
  if (insert.error && insert.error.code !== UNIQUE_VIOLATION) throw new Error(insert.error.message);

  return { score: grade.score };
}

const chooseSchema = z.object({
  attemptId: z.uuid(),
  sectionId: z.string().min(1).max(80),
  choice: sectionChoiceSchema,
});

export async function chooseSection(input: z.input<typeof chooseSchema>): Promise<void> {
  const { attemptId, sectionId, choice } = chooseSchema.parse(input);
  const { admin, attempt } = await ownedAttempt(attemptId);

  const section = await admin
    .from("assessment_sections")
    .select("id, optional_question")
    .eq("id", sectionId)
    .eq("assessment_id", attempt.assessment_id)
    .maybeSingle();
  if (section.error) throw new Error(section.error.message);
  if (!section.data || section.data.optional_question === null) throw new Error("Section is not optional.");

  const choices = { ...sectionChoicesSchema.parse(attempt.section_choices), [sectionId]: choice };
  const update = await admin.from("attempts").update({ section_choices: choices }).eq("id", attemptId);
  if (update.error) throw new Error(update.error.message);
}

const partSchema = z.object({ attemptId: z.uuid(), part: z.number().int().min(1).max(20) });

export async function startPart(input: z.input<typeof partSchema>): Promise<void> {
  const { attemptId, part } = partSchema.parse(input);
  const { admin, attempt } = await ownedAttempt(attemptId);
  if (part <= attempt.current_part) return;

  const update = await admin.from("attempts").update({ current_part: part }).eq("id", attemptId);
  if (update.error) throw new Error(update.error.message);
}

export async function finishDiagnostic(input: { attemptId: string }): Promise<void> {
  const { attemptId } = z.object({ attemptId: z.uuid() }).parse(input);
  const { admin, attempt } = await ownedAttempt(attemptId);

  const view = await loadAssessment(admin, attempt.assessment_id);
  if (!view) throw new Error("Assessment not found.");

  const scores = await loadScores(admin, attemptId);
  const state = {
    scores: new Map(Object.entries(scores)),
    choices: sectionChoicesSchema.parse(attempt.section_choices),
    currentPart: attempt.current_part,
  };
  const sections = toEngineSections(view);
  if (nextStep(sections, state, view.config).kind !== "done") throw new Error("Assessment not finished yet.");

  const results = sectionResults(sections, state, view.config);
  const update = await admin
    .from("attempts")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      result: { sections: results, recovery: recoveryPlan(results, view.config).map((result) => result.code) },
    })
    .eq("id", attemptId);
  if (update.error) throw new Error(update.error.message);
}
