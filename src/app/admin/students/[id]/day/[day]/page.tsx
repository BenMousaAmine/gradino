import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { MathText } from "@/components/math-text";
import { formatDay, formatTime } from "@/lib/admin/format";
import { requireAdmin, studentDay, type AttemptView } from "@/lib/admin/queries";
import { APP_NAME } from "@/lib/app";
import { LEVEL_LABELS } from "@/lib/study/plan";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: `Diario · ${APP_NAME}` };

const NOTE_SOURCES: Record<string, string> = { typed: "scritto", voice: "dettato", mixed: "scritto e dettato" };

function tone(score: number) {
  return score === 1 ? "bg-good-soft text-good" : score > 0 ? "bg-warn-soft text-warn" : "bg-bad-soft text-bad";
}

function verdict(score: number) {
  return score === 1 ? "Giusta" : score > 0 ? "In parte" : "Sbagliata";
}

function Lines({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-2xl bg-canvas p-3">
      <p className="text-xs font-semibold text-ink-soft">{title}</p>
      {lines.map((line, index) => (
        <MathText key={index} text={line} className="block font-medium" />
      ))}
    </div>
  );
}

function timing(attempt: Pick<AttemptView, "seconds" | "firstInputSeconds" | "corrections" | "idleSeconds" | "awaySeconds">) {
  return [
    `${attempt.seconds} s per rispondere`,
    attempt.firstInputSeconds !== null ? `${attempt.firstInputSeconds} s a pensare prima di scrivere` : null,
    attempt.seconds > 0 && attempt.firstInputSeconds !== null ? `${Math.max(0, attempt.seconds - attempt.firstInputSeconds)} s a scrivere` : null,
    attempt.corrections > 0 ? `${attempt.corrections} correzioni` : null,
    attempt.idleSeconds > 0 ? `fermo ${attempt.idleSeconds} s a metà` : null,
    attempt.awaySeconds > 0 ? `${attempt.awaySeconds} s fuori dall’app` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

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
            {data.summary.minutes} min di studio attivo · {data.summary.correct} giuste su {data.summary.answers} esercizi al primo
            tentativo{data.summary.recovered > 0 ? ` · ${data.summary.recovered} recuperate al secondo` : ""}
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
                    entry.finalScore === 1 ? "border-good-soft" : entry.finalScore > 0 ? "border-warn-soft" : "border-bad-soft"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="tabular-nums text-ink-soft">{formatTime(entry.at)}</span>
                    <span className="font-semibold">{entry.skill}</span>
                    <span className="text-ink-soft">· {LEVEL_LABELS[entry.level]}</span>
                    <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-dark">{entry.purpose}</span>
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${tone(entry.finalScore)}`}>
                      {entry.retry ? (entry.retry.score === 1 ? "Giusta al 2° tentativo" : `${verdict(entry.retry.score)} anche al 2° tentativo`) : verdict(entry.score)}
                    </span>
                  </div>
                  <MathText text={entry.prompt} className="block" />
                  <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <Lines title={entry.retry ? "1° tentativo" : "Ha risposto"} lines={entry.given} />
                    {entry.retry && <Lines title={`2° tentativo, dopo ${entry.retry.hintSeconds} s sull’aiuto`} lines={entry.retry.given} />}
                    {entry.finalScore < 1 && entry.correct.length > 0 && <Lines title="Risposta giusta" lines={entry.correct} />}
                  </div>
                  {entry.message && <MathText text={entry.message} className="block text-sm text-ink" />}
                  {entry.retry?.message && entry.retry.message !== entry.message && (
                    <MathText text={entry.retry.message} className="block text-sm text-ink" />
                  )}
                  <p className="text-xs text-ink-soft">
                    {entry.retry ? "1° tentativo: " : ""}
                    {timing(entry)}
                  </p>
                  {entry.retry && <p className="text-xs text-ink-soft">2° tentativo: {timing(entry.retry)}</p>}
                  {entry.note && (
                    <div className="rounded-2xl bg-brand-soft p-3 text-sm">
                      <p className="text-xs font-semibold text-brand-dark">
                        Come l’ha pensata
                        {entry.note.source ? ` · ${NOTE_SOURCES[entry.note.source] ?? entry.note.source}` : ""}
                        {entry.note.seconds !== null ? ` · ${entry.note.seconds} s` : ""}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-ink">{entry.note.text}</p>
                    </div>
                  )}
                  {(entry.feedbackSeconds !== null || entry.solutionOpen !== null) && (
                    <p className="text-xs text-ink-soft">
                      {entry.feedbackSeconds !== null ? `${entry.feedbackSeconds} s sulla correzione` : ""}
                      {entry.solutionOpen !== null && entry.finalScore < 1 ? (entry.solutionOpen ? " · “Come si fa” aperto" : " · “Come si fa” chiuso") : ""}
                    </p>
                  )}
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
