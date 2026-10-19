import "server-only";
import { randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { generateItem } from "@/lib/generators/registry";
import { describeAnswer } from "@/lib/items/describe";
import { GENERIC_TAGS, gradeItem, type Diagnosis } from "@/lib/items/grade";
import {
  itemContentSchema,
  itemKeySchema,
  levelSchema,
  type ItemContent,
  type ItemKey,
  type ItemResponse,
  type Level,
} from "@/lib/items/schemas";
import type { Database } from "@/lib/supabase/database.types";
import type { AnswerStats } from "@/lib/tracking/schema";
import type { AnswerFeedback, ExercisePurpose, ExerciseRef, PublicExercise } from "./types";

export type Admin = SupabaseClient<Database>;

type Resolved = { skillId: string; level: Level; content: ItemContent; key: ItemKey; solution: string[] };

const solutionSchema = z.array(z.string());

export async function resolveExercise(admin: Admin, ref: ExerciseRef): Promise<Resolved> {
  if (ref.source === "template") {
    const { data, error } = await admin
      .from("item_templates")
      .select("skill_id, level, generator, params")
      .eq("id", ref.id)
      .single();
    if (error) throw new Error(error.message);
    const generated = generateItem(data.generator, data.params, ref.seed);
    return { skillId: data.skill_id, level: levelSchema.parse(data.level), ...generated };
  }

  const { data, error } = await admin
    .from("items")
    .select("skill_id, level, content, item_keys(key, solution)")
    .eq("id", ref.id)
    .single();
  if (error) throw new Error(error.message);
  if (!data.item_keys) throw new Error(`Item ${ref.id} has no key`);
  return {
    skillId: data.skill_id,
    level: levelSchema.parse(data.level),
    content: itemContentSchema.parse(data.content),
    key: itemKeySchema.parse(data.item_keys.key),
    solution: solutionSchema.parse(data.item_keys.solution),
  };
}

export function newSeed(): number {
  return randomInt(1, 2_147_483_647);
}

export async function templateExercise(
  admin: Admin,
  skill: { id: string; title: string },
  level: Level,
  purpose: ExercisePurpose,
  templateId?: string,
): Promise<PublicExercise | null> {
  let query = admin.from("item_templates").select("id, level, generator, params").eq("status", "published");
  query = templateId ? query.eq("id", templateId) : query.eq("skill_id", skill.id).eq("level", level);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (data.length === 0) return null;
  const template = data[randomInt(0, data.length)];
  const ref: ExerciseRef = { source: "template", id: template.id, seed: newSeed() };
  const { content } = generateItem(template.generator, template.params, ref.seed);
  return { ref, skillId: skill.id, skillTitle: skill.title, level: levelSchema.parse(template.level), purpose, content };
}

export async function itemExercise(
  admin: Admin,
  itemId: string,
  skillTitle: string,
  purpose: ExercisePurpose,
): Promise<PublicExercise> {
  const ref: ExerciseRef = { source: "item", id: itemId };
  const resolved = await resolveExercise(admin, ref);
  return { ref, skillId: resolved.skillId, skillTitle, level: resolved.level, purpose, content: resolved.content };
}

export async function gradeAndStore(input: {
  admin: Admin;
  userId: string;
  ref: ExerciseRef;
  purpose: ExercisePurpose;
  sessionId: string | null;
  response: ItemResponse;
  timeMs: number;
  stats: AnswerStats | null;
  resolved?: Resolved;
}): Promise<{ resolved: Resolved; feedback: Omit<AnswerFeedback, "event"> }> {
  const resolved = input.resolved ?? (await resolveExercise(input.admin, input.ref));
  const grade = gradeItem(resolved.key, input.response);
  const canRetry = grade.score < 1 && input.response.type !== "skip";
  const { data, error } = await input.admin.from("practice_answers").insert({
    user_id: input.userId,
    skill_id: resolved.skillId,
    level: resolved.level,
    source: input.ref.source,
    source_id: input.ref.id,
    seed: input.ref.source === "template" ? input.ref.seed : null,
    purpose: input.purpose,
    session_id: input.sessionId,
    content: resolved.content,
    answer: input.response,
    score: grade.score,
    error_tag: grade.diagnosis?.tag ?? null,
    details: { diagnosis: grade.diagnosis, fields: grade.fields, stats: input.stats },
    time_ms: input.timeMs,
    attempts: 1,
    final_score: grade.score,
  }).select("id").single();
  if (error) throw new Error(error.message);
  if (canRetry) {
    return {
      resolved,
      feedback: {
        answerId: data.id,
        attempt: 1,
        canRetry: true,
        needsNote: false,
        score: grade.score,
        diagnosis: hintFor(grade.diagnosis),
        correctAnswer: [],
        solution: [],
      },
    };
  }
  return {
    resolved,
    feedback: {
      answerId: data.id,
      attempt: 1,
      canRetry: false,
      needsNote: noteRequired(input.purpose, resolved.level, grade.score),
      score: grade.score,
      diagnosis: grade.diagnosis,
      correctAnswer: grade.score < 1 ? describeAnswer(resolved.content, resolved.key) : [],
      solution: resolved.solution,
    },
  };
}

const GENERIC_HINT = "Ricontrolla i passaggi e riprova.";
const SILENT_TAGS = new Set<string>([GENERIC_TAGS.wrong, GENERIC_TAGS.empty, GENERIC_TAGS.invalid]);

function hintFor(diagnosis: Diagnosis | null): Diagnosis {
  if (diagnosis?.message && !SILENT_TAGS.has(diagnosis.tag)) return diagnosis;
  return { tag: diagnosis?.tag ?? GENERIC_TAGS.wrong, message: GENERIC_HINT };
}

export function noteRequired(purpose: string, level: Level, finalScore: number): boolean {
  return purpose === "problem" || (level === "advanced" && finalScore < 1);
}

export async function gradeSecondAttempt(input: {
  admin: Admin;
  userId: string;
  answerId: string;
  response: ItemResponse;
  timeMs: number;
  stats: AnswerStats | null;
  hintMs: number;
}): Promise<Omit<AnswerFeedback, "event">> {
  const { data: row, error } = await input.admin
    .from("practice_answers")
    .select("id, user_id, source, source_id, seed, purpose, level, score, attempts, details")
    .eq("id", input.answerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row || row.user_id !== input.userId) throw new Error("Answer not found.");
  if (row.attempts !== 1 || row.score >= 1) throw new Error("No second attempt available.");

  const ref: ExerciseRef =
    row.source === "template" && row.seed !== null
      ? { source: "template", id: row.source_id, seed: row.seed }
      : { source: "item", id: row.source_id };
  const resolved = await resolveExercise(input.admin, ref);
  const grade = gradeItem(resolved.key, input.response);
  const previous = row.details && typeof row.details === "object" && !Array.isArray(row.details) ? row.details : {};
  const update = await input.admin
    .from("practice_answers")
    .update({
      attempts: 2,
      final_score: grade.score,
      details: {
        ...previous,
        retry: {
          response: input.response,
          score: grade.score,
          diagnosis: grade.diagnosis,
          fields: grade.fields,
          timeMs: input.timeMs,
          stats: input.stats,
          hintMs: input.hintMs,
          at: new Date().toISOString(),
        },
      },
    })
    .eq("id", row.id);
  if (update.error) throw new Error(update.error.message);

  const level = levelSchema.parse(row.level);
  return {
    answerId: row.id,
    attempt: 2,
    canRetry: false,
    needsNote: noteRequired(row.purpose, level, grade.score),
    score: grade.score,
    diagnosis: grade.diagnosis,
    correctAnswer: grade.score < 1 ? describeAnswer(resolved.content, resolved.key) : [],
    solution: resolved.solution,
  };
}

export async function saveNote(input: {
  admin: Admin;
  userId: string;
  answerId: string;
  note: string;
  source: "typed" | "voice" | "mixed";
  ms: number;
}) {
  const { data, error } = await input.admin
    .from("practice_answers")
    .update({ note: input.note, note_source: input.source, note_ms: input.ms })
    .eq("id", input.answerId)
    .eq("user_id", input.userId)
    .select("id");
  if (error) throw new Error(error.message);
  if (data.length === 0) throw new Error("Answer not found.");
}
