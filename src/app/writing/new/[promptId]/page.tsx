import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { WritingEditor } from "@/components/writing-editor";
import { APP_NAME } from "@/lib/app";
import { getCurrentUser } from "@/lib/auth/session";
import { aiEnabled } from "@/lib/writing/ai";
import { findPrompt } from "@/lib/writing/prompts";

export const metadata: Metadata = { title: `Scrivi · ${APP_NAME}` };

async function NewWriting({ params }: { params: Promise<{ promptId: string }> }) {
  const { promptId } = await params;
  const user = await getCurrentUser();
  const prompt = findPrompt(promptId);
  if (!prompt) notFound();

  return (
    <>
      <AppHeader name={user.displayName} />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6">
        <Link href="/writing" className="text-sm font-semibold text-ink-soft hover:text-ink">
          ← Tutte le tracce
        </Link>
        <WritingEditor prompt={prompt} ai={aiEnabled()} />
      </main>
    </>
  );
}

export default function NewWritingPage({ params }: PageProps<"/writing/new/[promptId]">) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-xl px-4 py-6">
          <div className="h-96 animate-pulse rounded-3xl bg-line/60" />
        </main>
      }
    >
      <NewWriting params={params} />
    </Suspense>
  );
}
