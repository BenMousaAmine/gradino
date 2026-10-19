import "server-only";
import { randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { generateItem } from "@/lib/generators/registry";
import { describeAnswer } from "@/lib/items/describe";
import { gradeItem } from "@/lib/items/grade";
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
  let query = admin.from("item_templates").select("id").eq("status", "published");
  query = templateId ? query.eq("id", templateId) : query.eq("skill_id", skill.id).eq("level", level);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (data.length === 0) return null;
  const template = data[randomInt(0, data.length)];
  const ref: ExerciseRef = { source: "template", id: template.id, seed: newSeed() };
  const resolved = await resolveExercise(admin, ref);
  return { ref, skillId: skill.id, skillTitle: skill.title, level: resolved.level, purpose, content: resolved.content };
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
}): Promise<{ resolved: Resolved; feedback: Omit<AnswerFeedback, "event"> }> {
  const resolved = await resolveExercise(input.admin, input.ref);
  const grade = gradeItem(resolved.key, input.response);
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
  }).select("id").single();
  if (error) throw new Error(error.message);
  return {
    resolved,
    feedback: {
      answerId: data.id,
      score: grade.score,
      diagnosis: grade.diagnosis,
      correctAnswer: grade.score < 1 ? describeAnswer(resolved.content, resolved.key) : [],
      solution: resolved.solution,
    },
  };
}
