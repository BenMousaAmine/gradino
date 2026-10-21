import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { CoachProvider } from "@/components/coach";
import { APP_NAME } from "@/lib/app";
import { getCurrentUser, getUserId } from "@/lib/auth/session";
import { loadCoach } from "@/lib/insights/load";
import { coachFlags } from "@/lib/insights/tips";
import { dayInRome, startOfDayInRome } from "@/lib/study/dates";
import { loadStudyContext } from "@/lib/study/progress";
import { findSession, getOrCreateSession, sessionView, todayAnswers } from "@/lib/study/session";
import { parseSubject } from "@/lib/subjects";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { TodayRunner } from "./today-runner";

export const metadata: Metadata = { title: `Sessione di oggi · ${APP_NAME}` };

async function Today({ searchParams }: { searchParams: PageProps<"/today">["searchParams"] }) {
  const subject = parseSubject((await searchParams).subject);
  const userId = await getUserId();
  const admin = createSupabaseAdminClient();
  const today = dayInRome();
  const [user, context, found, answers, coach] = await Promise.all([
    getCurrentUser(),
    loadStudyContext(admin, userId, subject),
    findSession(admin, { userId, subject, day: today }),
    todayAnswers(admin, userId, startOfDayInRome(today)),
    loadCoach(admin, userId, subject),
  ]);
  if (!context) redirect("/diagnostic");
  const session = await getOrCreateSession(admin, { userId, subject, day: context.today }, found);
  const view = await sessionView(admin, context, session, answers);

  return (
    <>
      <AppHeader name={user.displayName} />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-6">
        <CoachProvider flags={coachFlags(coach.signals)} tricks={coach.tricks}>
          <TodayRunner initial={view} />
        </CoachProvider>
      </main>
    </>
  );
}

export default function TodayPage({ searchParams }: PageProps<"/today">) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-xl px-4 py-6">
          <div className="h-96 animate-pulse rounded-3xl bg-line/60" />
        </main>
      }
    >
      <Today searchParams={searchParams} />
    </Suspense>
  );
}
