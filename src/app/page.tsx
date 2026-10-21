import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { CoachCard } from "@/components/coach-card";
import { Gradini } from "@/components/gradini";
import { buttonClass, Card } from "@/components/ui";
import { loadLatestAttempt } from "@/lib/assessments/queries";
import { getCurrentUser, getUserId } from "@/lib/auth/session";
import { loadSignals } from "@/lib/insights/load";
import { cheer, coachTips, tipOfDay } from "@/lib/insights/tips";
import { dayInRome } from "@/lib/study/dates";
import { LEVEL_LABELS } from "@/lib/study/plan";
import { loadStudyContext, pathEntries } from "@/lib/study/progress";
import type { PathEntry } from "@/lib/study/types";
import { parseSubject, SUBJECT_IDS, SUBJECTS, type SubjectId } from "@/lib/subjects";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const linkButton = `${buttonClass()} w-full`;

const eyebrow = "w-fit rounded-full bg-brand-soft px-3 py-1 text-sm font-bold text-brand-dark";

const STAIR_COLORS = ["bg-lime", "bg-sky", "bg-coral", "bg-sun"];

type Stair = { done: boolean; current: boolean };

function Stairs({ stairs }: { stairs: Stair[] }) {
  return (
    <div aria-hidden="true" className="flex h-36 items-end gap-1.5">
      {stairs.map((stair, index) => (
        <div
          key={index}
          style={{ height: `${18 + (44 * index) / Math.max(1, stairs.length - 1)}%` }}
          className={`relative flex-1 rounded-t-lg ${
            stair.done || stair.current ? STAIR_COLORS[index % STAIR_COLORS.length] : "bg-white/15"
          }`}
        >
          {stair.current && (
            <div className="absolute -top-[52px] left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5">
              <span className="rounded-[10px] bg-white px-2 py-0.5 text-xs font-extrabold whitespace-nowrap text-brand-deep">
                Sei qui
              </span>
              <span className="size-5 rounded-full border-3 border-ink bg-sun" />
            </div>
          )}
        </div>
      ))}
      <div className="flex h-[72%] flex-1 justify-center rounded-t-lg bg-white pt-2 text-brand-deep">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
        >
          <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
          <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
        </svg>
      </div>
    </div>
  );
}

function subjectHref(subject: SubjectId, path: "/" | "/today") {
  return subject === "math" ? path : (`${path}?subject=${subject}` as const);
}

function SubjectTabs({ active }: { active: SubjectId }) {
  return (
    <nav aria-label="Materia" className="flex gap-2">
      {SUBJECT_IDS.map((subject) => (
        <Link
          key={subject}
          href={subjectHref(subject, "/")}
          aria-current={subject === active ? "page" : undefined}
          className={`rounded-full px-4 py-1.5 font-display text-base font-extrabold transition ${
            subject === active ? "bg-white text-brand-deep" : "bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          {SUBJECTS[subject].title}
        </Link>
      ))}
    </nav>
  );
}

function HomeLayout({
  name,
  subject,
  intro,
  stairs,
  children,
}: {
  name: string;
  subject: SubjectId;
  intro: string;
  stairs: Stair[];
  children: ReactNode;
}) {
  return (
    <>
      <AppHeader name={name} />
      <div className="flex flex-1 flex-col bg-brand-deep">
        <section className="mx-auto flex w-full max-w-xl flex-col gap-2 px-4 pt-4 text-white">
          <h1 className="text-4xl font-extrabold tracking-tight">Ciao {name}! 👋</h1>
          <SubjectTabs active={subject} />
          <p className="text-brand-soft">{intro}</p>
          <div className="mt-2">
            <Stairs stairs={stairs} />
          </div>
        </section>
        <main className="flex flex-1 flex-col rounded-t-[28px] bg-canvas">
          <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">{children}</div>
        </main>
      </div>
    </>
  );
}

function statusText(entry: PathEntry) {
  if (entry.status === "mastered") return "Sai già bene";
  if (entry.status === "review") return "Manca il ripasso di conferma";
  return LEVEL_LABELS[entry.level];
}

function DiagnosticCard({ subject, status, answered }: { subject: SubjectId; status: "none" | "in_progress"; answered: number }) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className={eyebrow}>{SUBJECTS[subject].title}</p>
        <h2 className="text-xl font-extrabold">Test iniziale</h2>
        <p className="text-ink-soft">
          {status === "in_progress"
            ? `Hai già risposto a ${answered} ${answered === 1 ? "domanda" : "domande"}. Riprendi da dove eri rimasto.`
            : "Una mappa di partenza per capire da dove cominciare. Non è una verifica e non c’è voto."}
        </p>
      </div>
      <Link href={subject === "math" ? "/diagnostic" : `/diagnostic?subject=${subject}`} className={linkButton}>
        {status === "in_progress" ? "Riprendi il test" : "Inizia il test"}
      </Link>
    </Card>
  );
}

async function Home({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const subject = parseSubject((await searchParams).subject);
  const config = SUBJECTS[subject];
  const userId = await getUserId();
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const [user, attempt, studyContext, session, signals] = await Promise.all([
    getCurrentUser(),
    config.diagnosticId ? loadLatestAttempt(supabase, userId, config.diagnosticId) : null,
    loadStudyContext(admin, userId, subject),
    admin
      .from("study_sessions")
      .select("block, status")
      .eq("user_id", userId)
      .eq("subject_id", subject)
      .eq("day", dayInRome())
      .maybeSingle(),
    loadSignals(admin, userId, subject),
  ]);
  if (user.mode === "admin") redirect("/admin");
  const context = !config.diagnosticId || attempt?.status === "completed" ? studyContext : null;

  if (!context) {
    return (
      <HomeLayout
        name={user.displayName}
        subject={subject}
        intro="Si parte dal test iniziale: così capiamo da quale gradino cominciare."
        stairs={Array.from({ length: 6 }, (_, index) => ({ done: false, current: index === 0 }))}
      >
        <DiagnosticCard
          subject={subject}
          status={attempt ? "in_progress" : "none"}
          answered={attempt ? Object.keys(attempt.scores).length : 0}
        />
      </HomeLayout>
    );
  }

  if (session.error) throw new Error(session.error.message);
  const path = pathEntries(context);
  if (path.length === 0) {
    return (
      <HomeLayout name={user.displayName} subject={subject} intro="Questa materia è in preparazione." stairs={[]}>
        <Card className="flex flex-col gap-2">
          <h2 className="text-xl font-extrabold">{config.title}: in arrivo</h2>
          <p className="text-ink-soft">Stiamo preparando le lezioni e gli esercizi. Intanto continua con le altre materie.</p>
        </Card>
      </HomeLayout>
    );
  }
  const mastered = path.filter((entry) => entry.status !== "learning").length;
  const tip = tipOfDay(
    coachTips(signals, (skillId) => context.skills.has(skillId)),
    context.today,
  );
  const strength = cheer(signals, (skillId) => context.skills.get(skillId)?.title ?? skillId);

  return (
    <HomeLayout
      name={user.displayName}
      subject={subject}
      intro={
        mastered === 0
          ? `Il tuo percorso ha ${path.length} ${path.length === 1 ? "gradino" : "gradini"}: si parte dal primo!`
          : `Hai già salito ${mastered} ${mastered === 1 ? "gradino" : "gradini"} su ${path.length}. Avanti così!`
      }
      stairs={path.map((entry) => ({ done: entry.status !== "learning", current: entry.current }))}
    >
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className={eyebrow}>Oggi</p>
          <h2 className="text-xl font-extrabold">La sessione di oggi</h2>
          <p className="text-ink-soft">
            {session.data?.status === "completed"
              ? "Fatta! Ottimo lavoro. Domani ti aspetta la prossima."
              : session.data
                ? `Riprendi dal blocco ${session.data.block + 1} di ${config.blocks.length}: ${config.blocks[session.data.block]?.title}.`
                : config.sessionSummary}
          </p>
        </div>
        {session.data?.status === "completed" ? (
          context.current && (
            <Link href={`/skill/${context.current}`} className={linkButton}>
              Esercitati ancora
            </Link>
          )
        ) : (
          <Link href={subjectHref(subject, "/today")} className={linkButton}>
            {session.data ? "Riprendi la sessione" : "Inizia la sessione"}
          </Link>
        )}
      </Card>

      <CoachCard tip={tip} cheer={strength} />

      <Card className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-extrabold">Il tuo percorso</h2>
          <span className="text-sm text-ink-soft">
            {mastered}/{path.length} completate
          </span>
        </div>
        <ul className="flex flex-col gap-2">
          {path.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/skill/${entry.id}`}
                className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 transition hover:border-brand/40 ${
                  entry.current ? "border-brand bg-brand-soft" : "border-line"
                }`}
              >
                <Gradini steps={entry.steps} mastered={entry.status === "mastered"} />
                <span className="flex flex-1 flex-col">
                  <span className="font-semibold">{entry.title}</span>
                  <span className="text-xs text-ink-soft">
                    {entry.areaTitle} · {statusText(entry)}
                  </span>
                </span>
                {entry.current && (
                  <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-bold text-white">Sei qui</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      {config.diagnosticId && (
        <Link
          href={subject === "math" ? "/diagnostic/results" : `/diagnostic/results?subject=${subject}`}
          className="text-center text-sm font-semibold text-ink-soft hover:text-ink"
        >
          Rivedi la tua mappa di partenza
        </Link>
      )}
    </HomeLayout>
  );
}

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-xl px-4 py-6">
          <div className="h-48 animate-pulse rounded-3xl bg-line/60" />
        </main>
      }
    >
      <Home searchParams={searchParams} />
    </Suspense>
  );
}
