import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { AppHeader } from "@/components/app-header";
import { WritingFeedback, WritingText } from "@/components/writing-feedback";
import { formatDateTime } from "@/lib/admin/format";
import { APP_NAME } from "@/lib/app";
import { getCurrentUser, getUserId } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { loadWriting } from "@/lib/writing/queries";

export const metadata: Metadata = { title: `Il tuo testo · ${APP_NAME}` };

async function WritingResult({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserId();
  if (!z.uuid().safeParse(id).success) notFound();
  const [user, writing] = await Promise.all([getCurrentUser(), loadWriting(createSupabaseAdminClient(), id)]);
  if (!writing || writing.userId !== userId) notFound();

  return (
    <>
      <AppHeader name={user.displayName} />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6">
        <Link href="/writing" className="text-sm font-semibold text-ink-soft hover:text-ink">
          ← Scrittura libera
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight">{writing.prompt.title}</h1>
          <p className="text-ink-soft">
            Consegnato {formatDateTime(writing.createdAt)} · {writing.words} parole
          </p>
        </div>
        <WritingFeedback writing={writing} />
        <section className="flex flex-col gap-2">
          <h2 className="text-xl font-extrabold">Il tuo testo</h2>
          <WritingText writing={writing} />
        </section>
        <Link href={`/writing/new/${writing.prompt.id}`} className="text-center text-sm font-semibold text-ink-soft hover:text-ink">
          Riscrivi questa traccia
        </Link>
      </main>
    </>
  );
}

export default function WritingResultPage({ params }: PageProps<"/writing/[id]">) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-xl px-4 py-6">
          <div className="h-96 animate-pulse rounded-3xl bg-line/60" />
        </main>
      }
    >
      <WritingResult params={params} />
    </Suspense>
  );
}
