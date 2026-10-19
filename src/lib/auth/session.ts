import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; displayName: string; role: "student" | "admin" };

export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("display_name, role").eq("id", userId).single();
  if (!profile) redirect("/login");

  return { id: userId, displayName: profile.display_name, role: profile.role === "admin" ? "admin" : "student" };
});
