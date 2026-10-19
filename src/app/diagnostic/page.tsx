import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { APP_NAME, DIAGNOSTIC_ID } from "@/lib/app";
import { loadAssessment, loadLatestAttempt } from "@/lib/assessments/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DiagnosticRunner } from "./diagnostic-runner";

export const metadata: Metadata = { title: `Test iniziale · ${APP_NAME}` };

async function Diagnostic() {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  const view = await loadAssessment(supabase, DIAGNOSTIC_ID);
  if (!view) throw new Error("Diagnostic test not found. Run pnpm content:import.");

  const attempt = await loadLatestAttempt(supabase, user.id, DIAGNOSTIC_ID);
  if (attempt?.status === "completed") redirect("/diagnostic/results");

  return (
    <>
      <AppHeader name={user.displayName} />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-6">
        <DiagnosticRunner view={view} attempt={attempt} />
      </main>
    </>
  );
}

function Loading() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-xl px-4 py-6">
        <div className="h-64 animate-pulse rounded-3xl bg-line/60" />
      </main>
    </>
  );
}

export default function DiagnosticPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Diagnostic />
    </Suspense>
  );
}
