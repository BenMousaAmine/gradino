import "server-only";
import type { Admin } from "@/lib/study/exercises";
import {
  aiFeedbackSchema,
  aiStatusSchema,
  writingPromptSchema,
  writingStatsSchema,
  type AiFeedback,
  type AiStatus,
  type WritingPrompt,
  type WritingStats,
} from "./schema";

export const WRITING_COLUMNS =
  "id, user_id, prompt_id, prompt, body, words, time_ms, stats, ai_status, ai_feedback, ai_model, review_status, review_score, review_comment, reviewed_at, created_at";

type WritingDbRow = {
  id: string;
  user_id: string;
  prompt_id: string;
  prompt: unknown;
  body: string;
  words: number;
  time_ms: number;
  stats: unknown;
  ai_status: string;
  ai_feedback: unknown;
  ai_model: string | null;
  review_status: string;
  review_score: number | null;
  review_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type WritingView = {
  id: string;
  userId: string;
  prompt: WritingPrompt;
  body: string;
  words: number;
  seconds: number;
  stats: WritingStats;
  aiStatus: AiStatus;
  ai: AiFeedback | null;
  aiModel: string | null;
  review: { score: number; comment: string | null; at: string } | null;
  createdAt: string;
};

export function toWriting(row: WritingDbRow): WritingView {
  const ai = aiFeedbackSchema.safeParse(row.ai_feedback);
  const stats = writingStatsSchema.safeParse(row.stats);
  return {
    id: row.id,
    userId: row.user_id,
    prompt: writingPromptSchema.parse(row.prompt),
    body: row.body,
    words: row.words,
    seconds: Math.round(row.time_ms / 1000),
    stats: stats.success ? stats.data : { pastes: 0, pastedChars: 0, awayMs: 0 },
    aiStatus: aiStatusSchema.catch("none").parse(row.ai_status),
    ai: ai.success ? ai.data : null,
    aiModel: row.ai_model,
    review:
      row.review_status === "done" && row.review_score !== null && row.reviewed_at
        ? { score: row.review_score, comment: row.review_comment, at: row.reviewed_at }
        : null,
    createdAt: row.created_at,
  };
}

export async function listWritings(admin: Admin, userId: string): Promise<WritingView[]> {
  const { data, error } = await admin
    .from("writing_submissions")
    .select(WRITING_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data.map(toWriting);
}

export async function loadWriting(admin: Admin, id: string): Promise<WritingView | null> {
  const { data, error } = await admin.from("writing_submissions").select(WRITING_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toWriting(data) : null;
}

export async function studentName(admin: Admin, userId: string): Promise<string> {
  const { data, error } = await admin.from("profiles").select("display_name").eq("id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.display_name ?? "Studente";
}

export async function writingQueue(admin: Admin): Promise<(WritingView & { student: string })[]> {
  const { data, error } = await admin.from("writing_submissions").select(WRITING_COLUMNS).order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  const userIds = [...new Set(data.map((row) => row.user_id))];
  const profiles = userIds.length > 0 ? await admin.from("profiles").select("id, display_name").in("id", userIds) : { data: [], error: null };
  if (profiles.error) throw new Error(profiles.error.message);
  const names = new Map((profiles.data ?? []).map((row) => [row.id, row.display_name]));
  const writings = data.map((row) => ({ ...toWriting(row), student: names.get(row.user_id) ?? "Studente" }));
  return [...writings.filter((writing) => !writing.review), ...writings.filter((writing) => writing.review)];
}

export async function pendingWritingCount(admin: Admin): Promise<number> {
  const { count, error } = await admin
    .from("writing_submissions")
    .select("id", { count: "exact", head: true })
    .eq("review_status", "pending");
  if (error) throw new Error(error.message);
  return count ?? 0;
}
