"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser, MODE_COOKIE } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function switchMode(mode: "admin" | "student") {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/");

  const store = await cookies();
  if (mode === "student") {
    store.set(MODE_COOKIE, "student", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    redirect("/");
  }
  store.delete(MODE_COOKIE);
  redirect("/admin");
}
