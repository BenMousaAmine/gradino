import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { APP_NAME } from "@/lib/app";
import { loadAssessment, loadLatestAttempt } from "@/lib/assessments/queries";
import { getCurrentUser, getUserId } from "@/lib/auth/session";
import { parseSubject, SUBJECTS } from "@/lib/subjects";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DiagnosticRunner } from "./diagnostic-runner";

export const metadata: Metadata = { title: `Test iniziale · ${APP_NAME}` };

async function Diagnostic({ searchParams }: { searchParams: PageProps<"/diagnostic">["searchParams"] }) {
  const subject = parseSubject((await searchParams).subject);
  const diagnosticId = SUBJECTS[subject].diagnosticId;
  if (!diagnosticId) redirect("/");
  const userId = await getUserId();
  const supabase = await createSupabaseServerClient();
  const [user, view, attempt] = await Promise.all([
    getCurrentUser(),
    loadAssessment(supabase, diagnosticId),
    loadLatestAttempt(supabase, userId, diagnosticId),
  ]);
  if (!view) throw new Error("Diagnostic test not found. Run pnpm content:import.");
  if (attempt?.status === "completed") redirect(subject === "math" ? "/diagnostic/results" : `/diagnostic/results?subject=${subject}`);

  return (
    <>
      <AppHeader name={user.displayName} />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-6">
        <DiagnosticRunner subject={subject} view={view} attempt={attempt} />
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

export default function DiagnosticPage({ searchParams }: PageProps<"/diagnostic">) {
  return (
    <Suspense fallback={<Loading />}>
      <Diagnostic searchParams={searchParams} />
    </Suspense>
  );
}
