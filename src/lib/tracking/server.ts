import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { EventType } from "./schema";

export async function logEvent(
  admin: SupabaseClient<Database>,
  userId: string,
  type: EventType,
  data: { sessionId?: string | null; skillId?: string | null; payload?: Json } = {},
) {
  const { error } = await admin.from("activity_events").insert({
    user_id: userId,
    type,
    session_id: data.sessionId ?? null,
    skill_id: data.skillId ?? null,
    payload: data.payload ?? {},
  });
  if (error) throw new Error(error.message);
}
