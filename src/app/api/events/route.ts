import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clientEventBatchSchema } from "@/lib/tracking/schema";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = clientEventBatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const sessionIds = [...new Set(parsed.data.map((event) => event.sessionId).filter((id): id is string => Boolean(id)))];
  const owned = new Set<string>();
  if (sessionIds.length > 0) {
    const sessions = await admin.from("study_sessions").select("id").eq("user_id", userId).in("id", sessionIds);
    if (sessions.error) return NextResponse.json({ error: "failed" }, { status: 500 });
    for (const session of sessions.data) owned.add(session.id);
  }

  const { error } = await admin.from("activity_events").insert(
    parsed.data.map((event) => ({
      user_id: userId,
      type: event.type,
      session_id: event.sessionId && owned.has(event.sessionId) ? event.sessionId : null,
      skill_id: event.skillId ?? null,
      payload: event.payload,
      client_at: event.at,
    })),
  );
  if (error) return NextResponse.json({ error: "failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
