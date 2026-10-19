import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui";
import { DIAGNOSTIC_ID } from "@/lib/app";
import { loadLatestAttempt } from "@/lib/assessments/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const linkButton =
  "inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand px-5 text-base font-semibold text-white shadow-sm transition active:scale-[0.98]";

async function Home() {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  const attempt = await loadLatestAttempt(supabase, user.id, DIAGNOSTIC_ID);
  const answered = attempt ? Object.keys(attempt.scores).length : 0;

  return (
    <>
      <AppHeader name={user.displayName} />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6">
        <h1 className="text-3xl font-bold">Ciao {user.displayName}! 👋</h1>

        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand">Matematica</p>
            <h2 className="text-xl font-bold">Test iniziale</h2>
            <p className="text-ink-soft">
              {attempt?.status === "completed"
                ? "Hai completato il test. Guarda la tua mappa di partenza."
                : attempt
                  ? `Hai già risposto a ${answered} ${answered === 1 ? "domanda" : "domande"}. Riprendi da dove eri rimasto.`
                  : "Una mappa di partenza per capire da dove cominciare. Non è una verifica e non c’è voto."}
            </p>
          </div>
          {attempt?.status === "completed" ? (
            <Link href="/diagnostic/results" className={linkButton}>
              Vedi la tua mappa
            </Link>
          ) : (
            <Link href="/diagnostic" className={linkButton}>
              {attempt ? "Riprendi il test" : "Inizia il test"}
            </Link>
          )}
        </Card>
      </main>
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-xl px-4 py-6">
          <div className="h-48 animate-pulse rounded-2xl bg-line/60" />
        </main>
      }
    >
      <Home />
    </Suspense>
  );
}
