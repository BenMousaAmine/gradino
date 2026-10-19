import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const MODE_COOKIE = "gradino-mode";

export type CurrentUser = {
  id: string;
  displayName: string;
  role: "student" | "admin";
  mode: "student" | "admin";
};

export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("display_name, role").eq("id", userId).single();
  if (!profile) redirect("/login");

  const role = profile.role === "admin" ? "admin" : "student";
  const studentMode = (await cookies()).get(MODE_COOKIE)?.value === "student";
  return { id: userId, displayName: profile.display_name, role, mode: role === "admin" && !studentMode ? "admin" : "student" };
});
