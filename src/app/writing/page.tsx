import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui";
import { WritingBadge } from "@/components/writing-feedback";
import { formatDateTime } from "@/lib/admin/format";
import { APP_NAME } from "@/lib/app";
import { getCurrentUser, getUserId } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { WRITING_PROMPTS } from "@/lib/writing/prompts";
import { listWritings } from "@/lib/writing/queries";

export const metadata: Metadata = { title: `Scrittura · ${APP_NAME}` };

async function Writing() {
  const userId = await getUserId();
  const [user, writings] = await Promise.all([getCurrentUser(), listWritings(createSupabaseAdminClient(), userId)]);

  return (
    <>
      <AppHeader name={user.displayName} />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6">
        <Link href="/?subject=english" className="text-sm font-semibold text-ink-soft hover:text-ink">
          ← Inglese
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight">Scrittura libera</h1>
          <p className="text-ink-soft">Scegli una traccia come quelle dell’esame di terza: scrivi, consegna e ricevi la correzione.</p>
        </div>

        {writings.length > 0 && (
          <Card className="flex flex-col gap-3">
            <h2 className="text-xl font-extrabold">I tuoi testi</h2>
            <ul className="flex flex-col gap-2">
              {writings.map((writing) => (
                <li key={writing.id}>
                  <Link
                    href={`/writing/${writing.id}`}
                    className="flex items-center gap-3 rounded-2xl border-2 border-line px-4 py-3 transition hover:border-brand/40"
                  >
                    <span className="flex flex-1 flex-col">
                      <span className="font-semibold">{writing.prompt.title}</span>
                      <span className="text-xs text-ink-soft">
                        {formatDateTime(writing.createdAt)} · {writing.words} parole
                      </span>
                    </span>
                    <WritingBadge writing={writing} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-extrabold">Tracce</h2>
          <ul className="flex flex-col gap-2">
            {WRITING_PROMPTS.map((prompt) => (
              <li key={prompt.id}>
                <Link
                  href={`/writing/new/${prompt.id}`}
                  className="flex items-center gap-3 rounded-2xl border-2 border-line bg-surface px-4 py-3 transition hover:border-brand/40"
                >
                  <span className="flex flex-1 flex-col">
                    <span className="font-semibold">{prompt.title}</span>
                    <span className="text-xs text-ink-soft">
                      {prompt.kind === "email" ? "Email" : "Dialogo"} · almeno {prompt.minWords} parole
                    </span>
                  </span>
                  <span aria-hidden="true" className="font-bold text-brand">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}

export default function WritingPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-xl px-4 py-6">
          <div className="h-96 animate-pulse rounded-3xl bg-line/60" />
        </main>
      }
    >
      <Writing />
    </Suspense>
  );
}
