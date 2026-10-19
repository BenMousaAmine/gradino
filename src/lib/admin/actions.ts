"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type NewUserState = { error: string | null; name: string; email: string; role: "student" | "admin" };

const newUserSchema = z.object({
  name: z.string().min(1).max(60),
  email: z.email(),
  password: z.string().min(8).max(72),
});

const FIELD_ERRORS: Record<string, string> = {
  name: "Inserisci il nome (massimo 60 caratteri).",
  email: "Inserisci un’email valida.",
  password: "La password deve avere da 8 a 72 caratteri.",
};

export async function createUser(_state: NewUserState, formData: FormData): Promise<NewUserState> {
  const user = await getCurrentUser();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = formData.get("role") === "admin" ? "admin" : "student";
  const keep = { name, email, role } as const;
  if (user.role !== "admin") return { ...keep, error: "Solo un admin può creare utenti." };

  const parsed = newUserSchema.safeParse({ name, email, password: formData.get("password") });
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "name");
    return { ...keep, error: FIELD_ERRORS[field] ?? FIELD_ERRORS.name };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { display_name: parsed.data.name },
  });
  if (error) {
    const duplicate = error.code === "email_exists" || error.code === "user_already_exists";
    return { ...keep, error: duplicate ? "Esiste già un utente con questa email." : "Non sono riuscito a creare l’utente. Riprova." };
  }

  if (role === "admin") {
    const update = await admin.from("profiles").update({ role: "admin" }).eq("id", data.user.id);
    if (update.error) return { ...keep, error: "Utente creato, ma non sono riuscito a renderlo admin." };
  }

  redirect("/admin");
}
