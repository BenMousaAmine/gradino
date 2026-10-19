import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { CoachProvider } from "@/components/coach";
import { APP_NAME } from "@/lib/app";
import { getCurrentUser, getUserId } from "@/lib/auth/session";
import { loadSignals } from "@/lib/insights/load";
import { coachFlags } from "@/lib/insights/tips";
import { lessonSchema } from "@/lib/lessons/schema";
import { templateExercise } from "@/lib/study/exercises";
import { loadStudyContext, pathEntries } from "@/lib/study/progress";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SkillView } from "./skill-view";

export const metadata: Metadata = { title: `Abilità · ${APP_NAME}` };

async function Skill({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserId();
  const admin = createSupabaseAdminClient();
  const [user, context, lessonRow, signals] = await Promise.all([
    getCurrentUser(),
    loadStudyContext(admin, userId),
    admin.from("lessons").select("content").eq("skill_id", id).maybeSingle(),
    loadSignals(admin, userId),
  ]);
  if (!context) redirect("/diagnostic");

  const entry = pathEntries(context).find((candidate) => candidate.id === id);
  if (!entry) notFound();

  if (lessonRow.error) throw new Error(lessonRow.error.message);
  const lesson = lessonRow.data ? lessonSchema.parse(lessonRow.data.content) : null;
  const level = entry.status === "learning" ? entry.level : "advanced";
  const firstExercise = await templateExercise(admin, { id, title: entry.title }, level, "practice");

  return (
    <>
      <AppHeader name={user.displayName} />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-6">
        <CoachProvider flags={coachFlags(signals)}>
          <SkillView
            entry={entry}
            lesson={lesson}
            lessonDone={Boolean(context.progress.get(id)?.lessonDoneAt)}
            firstExercise={firstExercise}
          />
        </CoachProvider>
      </main>
    </>
  );
}

export default function SkillPage({ params }: PageProps<"/skill/[id]">) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-xl px-4 py-6">
          <div className="h-96 animate-pulse rounded-3xl bg-line/60" />
        </main>
      }
    >
      <Skill params={params} />
    </Suspense>
  );
}
