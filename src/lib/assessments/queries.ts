import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assessmentConfigSchema, sectionChoicesSchema } from "@/lib/diagnostic/engine";
import { itemContentSchema, levelSchema } from "@/lib/items/schemas";
import type { Database } from "@/lib/supabase/database.types";
import type { AssessmentView, AttemptState } from "./view";

type Client = SupabaseClient<Database>;

export async function loadAssessment(supabase: Client, assessmentId: string): Promise<AssessmentView | null> {
  const { data, error } = await supabase
    .from("assessments")
    .select(
      "id, title, description, config, assessment_sections(id, code, title, part, position, optional_question, assessment_items(position, items(id, level, content)))",
    )
    .eq("id", assessmentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const sections = [...data.assessment_sections]
    .sort((a, b) => a.position - b.position)
    .map((section) => ({
      id: section.id,
      code: section.code,
      title: section.title,
      part: section.part,
      optionalQuestion: section.optional_question,
      items: [...section.assessment_items]
        .sort((a, b) => a.position - b.position)
        .map(({ items: item }) => ({
          id: item.id,
          level: levelSchema.parse(item.level),
          content: itemContentSchema.parse(item.content),
        })),
    }));

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    config: assessmentConfigSchema.parse(data.config),
    sections,
  };
}

export async function loadScores(supabase: Client, attemptId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("responses").select("item_id, score").eq("attempt_id", attemptId);
  if (error) throw new Error(error.message);
  return Object.fromEntries(data.map((row) => [row.item_id, row.score]));
}

export async function loadLatestAttempt(
  supabase: Client,
  userId: string,
  assessmentId: string,
  status?: "in_progress" | "completed",
): Promise<AttemptState | null> {
  let query = supabase
    .from("attempts")
    .select("id, status, current_part, section_choices, completed_at, responses(item_id, score)")
    .eq("user_id", userId)
    .eq("assessment_id", assessmentId);
  if (status) query = query.eq("status", status);
  const { data, error } = await query.order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    status: data.status === "completed" ? "completed" : "in_progress",
    currentPart: data.current_part,
    choices: sectionChoicesSchema.parse(data.section_choices),
    scores: Object.fromEntries(data.responses.map((row) => [row.item_id, row.score])),
    completedAt: data.completed_at,
  };
}
