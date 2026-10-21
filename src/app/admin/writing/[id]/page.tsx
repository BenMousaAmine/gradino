import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { ReviewForm } from "@/components/admin/review-form";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui";
import { WritingFeedback, WritingText } from "@/components/writing-feedback";
import { formatDateTime } from "@/lib/admin/format";
import { requireAdmin } from "@/lib/admin/queries";
import { APP_NAME } from "@/lib/app";
import { dayInRome } from "@/lib/study/dates";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadWriting, studentName } from "@/lib/writing/queries";

export const metadata: Metadata = { title: `Correggi · ${APP_NAME}` };

async function ReviewWriting({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAdmin();
  if (!z.uuid().safeParse(id).success) notFound();
  const admin = createSupabaseAdminClient();
  const writing = await loadWriting(admin, id);
  if (!writing) notFound();
  const student = await studentName(admin, writing.userId);
  const { stats } = writing;
  const awayMinutes = Math.round(stats.awayMs / 60_000);
  const facts = [
    `${writing.words} parole (minimo ${writing.prompt.minWords})`,
    `${Math.max(1, Math.round(writing.seconds / 60))} min per scriverlo`,
    stats.pastes > 0 ? `incollato ${stats.pastes} ${stats.pastes === 1 ? "volta" : "volte"} (${stats.pastedChars} caratteri)` : "niente incollato",
    stats.awayMs >= 10_000 ? `fuori dall’app ${awayMinutes >= 2 ? `${awayMinutes} min` : `${Math.round(stats.awayMs / 1000)} s`}` : null,
  ].filter(Boolean);

  return (
    <>
      <AppHeader name={user.displayName} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6">
        <Link href="/admin/writing" className="text-sm font-semibold text-ink-soft hover:text-ink">
          ← Scritture
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight">{writing.prompt.title}</h1>
          <p className="text-ink-soft">
            {student} · {formatDateTime(writing.createdAt)} ·{" "}
            <Link href={`/admin/students/${writing.userId}/day/${dayInRome(new Date(writing.createdAt))}`} className="font-semibold underline">
              diario del giorno
            </Link>
          </p>
        </div>

        <details className="rounded-3xl border-2 border-line bg-surface p-5">
          <summary className="cursor-pointer font-bold">La traccia</summary>
          <p className="mt-2">{writing.prompt.task}</p>
          <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 text-ink-soft">
            {writing.prompt.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ol>
        </details>

        <section className="flex flex-col gap-2">
          <h2 className="text-xl font-extrabold">Il testo</h2>
          <WritingText writing={writing} />
          <p className={`text-sm ${stats.pastes > 0 ? "font-semibold text-warn" : "text-ink-soft"}`}>{facts.join(" · ")}</p>
        </section>

        {writing.aiStatus === "error" && (
          <p className="rounded-2xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">La correzione automatica non è riuscita: correggilo tu.</p>
        )}
        {(writing.ai || writing.review) && <WritingFeedback writing={writing} />}

        <Card className="flex flex-col gap-4">
          <h2 className="text-xl font-extrabold">{writing.review ? "Modifica la tua correzione" : "La tua correzione"}</h2>
          <ReviewForm id={writing.id} score={writing.review?.score ?? writing.ai?.score ?? null} comment={writing.review?.comment ?? null} />
        </Card>
      </main>
    </>
  );
}

export default function ReviewWritingPage({ params }: PageProps<"/admin/writing/[id]">) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-3xl px-4 py-6">
          <div className="h-96 animate-pulse rounded-3xl bg-line/60" />
        </main>
      }
    >
      <ReviewWriting params={params} />
    </Suspense>
  );
}
