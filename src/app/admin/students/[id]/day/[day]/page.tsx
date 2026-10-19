import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { MathText } from "@/components/math-text";
import { formatDay, formatTime } from "@/lib/admin/format";
import { requireAdmin, studentDay } from "@/lib/admin/queries";
import { APP_NAME } from "@/lib/app";
import { LEVEL_LABELS } from "@/lib/study/plan";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: `Diario · ${APP_NAME}` };

async function Day({ params }: { params: Promise<{ id: string; day: string }> }) {
  const { id, day } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) notFound();
  const user = await requireAdmin();
  const data = await studentDay(createSupabaseAdminClient(), id, day);

  return (
    <>
      <AppHeader name={user.displayName} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6">
        <Link href={`/admin/students/${id}`} className="text-sm font-semibold text-ink-soft hover:text-ink">
          ← Scheda di {data.profile.name}
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{formatDay(day)}</h1>
          <p className="text-ink-soft">
            {data.summary.minutes} min di studio attivo · {data.summary.correct} giuste su {data.summary.answers} esercizi
          </p>
        </div>

        {data.timeline.length === 0 ? (
          <p className="rounded-3xl border-2 border-line bg-surface p-5 text-ink-soft">Nessuna attività in questo giorno.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {data.timeline.map((entry, index) =>
              entry.kind === "event" ? (
                <li key={index} className="flex items-center gap-3 px-1 text-sm text-ink-soft">
                  <span className="w-12 shrink-0 tabular-nums">{formatTime(entry.at)}</span>
                  <span className="h-px flex-1 bg-line" aria-hidden="true" />
                  <span className="text-right">{entry.label}</span>
                </li>
              ) : (
                <li
                  key={index}
                  className={`flex flex-col gap-3 rounded-2xl border-2 bg-surface p-4 ${
                    entry.score === 1 ? "border-good-soft" : entry.score > 0 ? "border-warn-soft" : "border-bad-soft"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="tabular-nums text-ink-soft">{formatTime(entry.at)}</span>
                    <span className="font-semibold">{entry.skill}</span>
                    <span className="text-ink-soft">· {LEVEL_LABELS[entry.level]}</span>
                    <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-dark">{entry.purpose}</span>
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${
                        entry.score === 1 ? "bg-good-soft text-good" : entry.score > 0 ? "bg-warn-soft text-warn" : "bg-bad-soft text-bad"
                      }`}
                    >
                      {entry.score === 1 ? "Giusta" : entry.score > 0 ? "In parte" : "Sbagliata"}
                    </span>
                  </div>
                  <MathText text={entry.prompt} className="block" />
                  <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <div className="rounded-2xl bg-canvas p-3">
                      <p className="text-xs font-semibold text-ink-soft">Ha risposto</p>
                      {entry.given.map((line, lineIndex) => (
                        <MathText key={lineIndex} text={line} className="block font-medium" />
                      ))}
                    </div>
                    {entry.score < 1 && entry.correct.length > 0 && (
                      <div className="rounded-2xl bg-canvas p-3">
                        <p className="text-xs font-semibold text-ink-soft">Risposta giusta</p>
                        {entry.correct.map((line, lineIndex) => (
                          <MathText key={lineIndex} text={line} className="block font-medium" />
                        ))}
                      </div>
                    )}
                  </div>
                  {entry.message && <MathText text={entry.message} className="block text-sm text-ink" />}
                  <p className="text-xs text-ink-soft">
                    {entry.seconds} s per rispondere
                    {entry.firstInputSeconds !== null ? ` · inizia a scrivere dopo ${entry.firstInputSeconds} s` : ""}
                    {entry.corrections > 0 ? ` · ${entry.corrections} correzioni` : ""}
                    {entry.feedbackSeconds !== null ? ` · ${entry.feedbackSeconds} s sulla correzione` : ""}
                    {entry.solutionOpen !== null && entry.score < 1 ? (entry.solutionOpen ? " · “Come si fa” aperto" : " · “Come si fa” chiuso") : ""}
                  </p>
                </li>
              ),
            )}
          </ol>
        )}
      </main>
    </>
  );
}

export default function DayPage({ params }: PageProps<"/admin/students/[id]/day/[day]">) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-3xl px-4 py-6">
          <div className="h-96 animate-pulse rounded-3xl bg-line/60" />
        </main>
      }
    >
      <Day params={params} />
    </Suspense>
  );
}
