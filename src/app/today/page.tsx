import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { APP_NAME } from "@/lib/app";
import { getCurrentUser, getUserId } from "@/lib/auth/session";
import { dayInRome, startOfDayInRome } from "@/lib/study/dates";
import { loadStudyContext } from "@/lib/study/progress";
import { findSession, getOrCreateSession, sessionView, todayAnswers } from "@/lib/study/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { TodayRunner } from "./today-runner";

export const metadata: Metadata = { title: `Sessione di oggi · ${APP_NAME}` };

async function Today() {
  const userId = await getUserId();
  const admin = createSupabaseAdminClient();
  const today = dayInRome();
  const [user, context, found, answers] = await Promise.all([
    getCurrentUser(),
    loadStudyContext(admin, userId),
    findSession(admin, userId, today),
    todayAnswers(admin, userId, startOfDayInRome(today)),
  ]);
  if (!context) redirect("/diagnostic");
  const session = await getOrCreateSession(admin, userId, context.today, found);
  const view = await sessionView(admin, context, session, answers);

  return (
    <>
      <AppHeader name={user.displayName} />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-6">
        <TodayRunner initial={view} />
      </main>
    </>
  );
}

export default function TodayPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-xl px-4 py-6">
          <div className="h-96 animate-pulse rounded-3xl bg-line/60" />
        </main>
      }
    >
      <Today />
    </Suspense>
  );
}
