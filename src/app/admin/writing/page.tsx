import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { WritingBadge } from "@/components/writing-feedback";
import { formatDateTime } from "@/lib/admin/format";
import { requireAdmin } from "@/lib/admin/queries";
import { APP_NAME } from "@/lib/app";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writingQueue } from "@/lib/writing/queries";

export const metadata: Metadata = { title: `Scritture · ${APP_NAME}` };

async function Queue() {
  const user = await requireAdmin();
  const writings = await writingQueue(createSupabaseAdminClient());
  const pending = writings.filter((writing) => !writing.review).length;

  return (
    <>
      <AppHeader name={user.displayName} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6">
        <Link href="/admin" className="text-sm font-semibold text-ink-soft hover:text-ink">
          ← Tutti gli studenti
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight">Scritture</h1>
          <p className="text-ink-soft">
            {pending === 0 ? "Nessun testo da correggere." : `${pending} ${pending === 1 ? "testo da correggere" : "testi da correggere"}.`}
          </p>
        </div>
        {writings.length === 0 ? (
          <p className="rounded-3xl border-2 border-line bg-surface p-5 text-ink-soft">Ancora nessun testo consegnato.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {writings.map((writing) => (
              <li key={writing.id}>
                <Link
                  href={`/admin/writing/${writing.id}`}
                  className={`flex flex-col gap-2 rounded-2xl border-2 bg-surface p-4 transition hover:border-brand/50 ${
                    writing.review ? "border-line" : "border-warn-soft"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{writing.student}</span>
                    <span className="text-ink-soft">· {writing.prompt.title}</span>
                    <span className="ml-auto flex gap-2">
                      {!writing.review && (
                        <span className="rounded-full bg-warn-soft px-2.5 py-1 text-xs font-bold text-warn">Da correggere</span>
                      )}
                      <WritingBadge writing={writing} />
                    </span>
                  </div>
                  <p lang="en" className="line-clamp-2 text-sm text-ink-soft">
                    {writing.body}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {formatDateTime(writing.createdAt)} · {writing.words} parole
                    {writing.stats.pastes > 0 ? ` · incollato ${writing.stats.pastes} ${writing.stats.pastes === 1 ? "volta" : "volte"}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

export default function WritingQueuePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-3xl px-4 py-6">
          <div className="h-96 animate-pulse rounded-3xl bg-line/60" />
        </main>
      }
    >
      <Queue />
    </Suspense>
  );
}
