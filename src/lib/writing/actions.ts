"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/queries";
import { getUserId } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { aiEnabled, correctWriting } from "./ai";
import { findPrompt } from "./prompts";
import { countWords, writingStatsSchema } from "./schema";

const submitSchema = z.object({
  promptId: z.string().min(1).max(80),
  body: z.string().trim().min(1).max(6000),
  timeMs: z.number().int().min(0).max(36_000_000),
  stats: writingStatsSchema,
});

export async function submitWriting(input: z.input<typeof submitSchema>): Promise<{ id: string }> {
  const { promptId, body, timeMs, stats } = submitSchema.parse(input);
  const prompt = findPrompt(promptId);
  if (!prompt) throw new Error("Unknown writing prompt.");
  const words = countWords(body);
  if (words < prompt.minWords) throw new Error("Text too short.");
  const userId = await getUserId();
  const admin = createSupabaseAdminClient();
  const ai = aiEnabled();
  const { data, error } = await admin
    .from("writing_submissions")
    .insert({
      user_id: userId,
      subject_id: "english",
      prompt_id: prompt.id,
      prompt,
      body,
      words,
      time_ms: timeMs,
      stats,
      ai_status: ai ? "pending" : "none",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  if (ai) {
    const update = await correctWriting(prompt, body).then(
      ({ feedback, model }) => ({ ai_status: "done", ai_feedback: feedback, ai_model: model }),
      (cause: unknown) => ({ ai_status: "error", ai_error: (cause instanceof Error ? cause.message : String(cause)).slice(0, 500) }),
    );
    const saved = await admin.from("writing_submissions").update(update).eq("id", data.id);
    if (saved.error) throw new Error(saved.error.message);
  }
  return { id: data.id };
}

export type ReviewState = { error: string | null };

const reviewSchema = z.object({
  id: z.uuid(),
  score: z.coerce.number().int().min(1).max(10),
  comment: z.string().trim().max(4000),
});

export async function reviewWriting(_state: ReviewState, formData: FormData): Promise<ReviewState> {
  const user = await requireAdmin();
  const parsed = reviewSchema.safeParse({
    id: formData.get("id"),
    score: formData.get("score"),
    comment: formData.get("comment") ?? "",
  });
  if (!parsed.success) return { error: "Scegli un voto da 1 a 10 (il commento può avere al massimo 4000 caratteri)." };
  const { id, score, comment } = parsed.data;
  const { error } = await createSupabaseAdminClient()
    .from("writing_submissions")
    .update({
      review_status: "done",
      review_score: score,
      review_comment: comment || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: "Non sono riuscito a salvare la correzione. Riprova." };
  redirect("/admin/writing");
}
