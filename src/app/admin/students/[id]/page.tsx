import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ColumnChart } from "@/components/admin/column-chart";
import { StatTile } from "@/components/admin/stat-tile";
import { AppHeader } from "@/components/app-header";
import { Gradini } from "@/components/gradini";
import { MathText } from "@/components/math-text";
import { formatDateTime, formatDay, shortDay } from "@/lib/admin/format";
import { requireAdmin, studentOverview } from "@/lib/admin/queries";
import { APP_NAME } from "@/lib/app";
import { LEVEL_LABELS } from "@/lib/study/plan";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: `Scheda studente · ${APP_NAME}` };

const COLOR_LABELS = {
  green: { dot: "bg-step-3", text: "Sa già bene" },
  yellow: { dot: "bg-step-2", text: "Da rinforzare" },
  red: { dot: "bg-step-1", text: "Da recuperare" },
} as const;

const STATUS_TEXT = {
  not_started: "Non iniziata",
  learning: "In corso",
  review: "Manca il ripasso di conferma",
  mastered: "Padroneggiata",
} as const;

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-3xl border-2 border-line bg-surface p-5">
      <div>
        <h2 className="text-xl font-extrabold">{title}</h2>
        {subtitle && <p className="text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

const NOTE_SOURCES: Record<string, string> = { typed: "scritto", voice: "dettato", mixed: "scritto e dettato" };

const OUTCOMES = {
  first: { text: "Giusta al primo tentativo", style: "bg-good-soft text-good" },
  second: { text: "Giusta al secondo tentativo", style: "bg-warn-soft text-warn" },
  unsolved: { text: "Non risolta", style: "bg-bad-soft text-bad" },
} as const;

function delta(current: number | null, previous: number | null) {
  return current === null || previous === null ? null : current - previous;
}

async function Overview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAdmin();
  const data = await studentOverview(createSupabaseAdminClient(), id);
  const { week, previousWeek, habits } = data;
  const activeDays = data.series.filter((point) => point.minutes > 0 || point.answers > 0).reverse();
  const peakHour = habits.hours.indexOf(Math.max(...habits.hours));

  return (
    <>
      <AppHeader name={user.displayName} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6">
        <Link href="/admin" className="text-sm font-semibold text-ink-soft hover:text-ink">
          ← Tutti gli studenti
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{data.profile.name}</h1>
          <p className="text-ink-soft">{data.profile.email}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Minuti negli ultimi 7 giorni" value={`${week.minutes}`} delta={week.minutes - previousWeek.minutes} />
          <StatTile label="Giorni in cui ha studiato" value={`${week.daysActive} su 7`} delta={week.daysActive - previousWeek.daysActive} />
          <StatTile label="Risposte giuste" value={week.accuracy === null ? "—" : `${week.accuracy}%`} delta={delta(week.accuracy, previousWeek.accuracy)} />
          <StatTile label="Risposte “Non lo so”" value={week.helpRate === null ? "—" : `${week.helpRate}%`} delta={delta(week.helpRate, previousWeek.helpRate)} upIsGood={false} />
        </div>

        <Section title="Andamento" subtitle="Ultimi 30 giorni">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ColumnChart
              title="Minuti di studio attivo al giorno"
              unit="min"
              points={data.series.map((point) => ({
                label: shortDay(point.day),
                value: point.minutes,
                detail: `${formatDay(point.day)} · ${point.answers} esercizi`,
              }))}
            />
            <ColumnChart
              title="Risposte giuste al giorno"
              unit="%"
              max={100}
              points={data.series.map((point) => ({
                label: shortDay(point.day),
                value: point.accuracy,
                detail: point.answers > 0 ? `${formatDay(point.day)} · ${point.correct} giuste su ${point.answers}` : `${formatDay(point.day)} · nessun esercizio`,
              }))}
            />
          </div>
        </Section>

        <Section title="Punti deboli" subtitle="Le abilità dove fa più fatica negli ultimi 30 giorni (almeno 3 esercizi)">
          {data.weak.length === 0 ? (
            <p className="text-ink-soft">Nessuna difficoltà evidente: servono almeno 3 esercizi per abilità.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {data.weak.map((skill, index) => (
                <li key={skill.skillId} className="flex flex-col gap-2 rounded-2xl bg-canvas p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">
                      {index + 1}. {skill.title}
                    </p>
                    <p className="text-sm text-ink-soft">
                      {skill.answers} esercizi · {skill.accuracy}% giuste · {skill.avgSeconds} s di media
                    </p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${skill.accuracy}%` }} />
                  </div>
                  {skill.reasons.length > 0 && <p className="text-sm text-ink">{skill.reasons.join(" · ")}</p>}
                </li>
              ))}
            </ol>
          )}
        </Section>

        <Section title="Errori ricorrenti" subtitle="Gli sbagli tipici che fa più spesso">
          {data.errors.length === 0 ? (
            <p className="text-ink-soft">Nessun errore tipico registrato.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.errors.map((group) => (
                <li key={group.tag} className="flex gap-4 rounded-2xl bg-canvas p-4">
                  <span className="font-display text-2xl font-extrabold text-ink tabular-nums">{group.count}×</span>
                  <div className="flex flex-col gap-1">
                    {group.message ? <MathText text={group.message} className="font-medium" /> : <span className="font-medium">{group.tag}</span>}
                    <span className="text-sm text-ink-soft">In: {group.skills.join(", ")}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Section title="Come studia" subtitle="Ultimi 30 giorni">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-ink-soft">Uscite dall’app durante lo studio</dt>
                <dd className="text-lg font-semibold">
                  {habits.awayCount} ({habits.awayMinutes} min)
                </dd>
              </div>
              <div>
                <dt className="text-ink-soft">Durata media delle pause</dt>
                <dd className="text-lg font-semibold">{habits.avgPauseMinutes === null ? "—" : `${habits.avgPauseMinutes} min`}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Tempo speso a leggere la correzione quando sbaglia</dt>
                <dd className="text-lg font-semibold">{habits.feedbackSeconds === null ? "—" : `${habits.feedbackSeconds} s`}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">“Come si fa” tenuto aperto quando sbaglia</dt>
                <dd className="text-lg font-semibold">{habits.solutionOpenedRate === null ? "—" : `${habits.solutionOpenedRate}%`}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Blocchi finiti per tempo scaduto</dt>
                <dd className="text-lg font-semibold">{habits.timeUps}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Ora in cui studia di più</dt>
                <dd className="text-lg font-semibold">{habits.hours[peakHour] > 0 ? `${peakHour}:00–${peakHour + 1}:00` : "—"}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Secondi prima di iniziare a rispondere (mediana)</dt>
                <dd className="text-lg font-semibold">{habits.thinkSeconds === null ? "—" : `${habits.thinkSeconds} s`}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Giuste al secondo tentativo, dopo l’aiuto</dt>
                <dd className="text-lg font-semibold">
                  {habits.recoveredRate === null ? "—" : `${habits.recoveredRate}% (su ${habits.retried})`}
                </dd>
              </div>
              <div>
                <dt className="text-ink-soft">Fermo più di 30 s a metà esercizio</dt>
                <dd className="text-lg font-semibold">
                  {habits.idleCount} volte ({habits.idleMinutes} min)
                </dd>
              </div>
              <div>
                <dt className="text-ink-soft">Tempo medio per raccontare il ragionamento</dt>
                <dd className="text-lg font-semibold">
                  {habits.noteSeconds === null ? "—" : `${habits.noteSeconds} s`}
                  {habits.voiceNoteRate !== null && habits.voiceNoteRate > 0 ? ` · ${habits.voiceNoteRate}% dettati` : ""}
                </dd>
              </div>
            </dl>
          </Section>

          <Section title="Test iniziale">
            {data.diagnostic ? (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {data.diagnostic.sections.map((section) => (
                  <li key={section.code} className="flex items-center gap-2 text-sm">
                    <span className={`h-3 w-3 shrink-0 rounded-full ${section.color ? COLOR_LABELS[section.color].dot : "bg-line"}`} />
                    <span className="font-medium">{section.title}</span>
                    <span className="text-ink-soft">
                      {section.color ? `${section.ratio}%${section.closedEarly ? " · chiusa in anticipo" : ""}` : "non svolta"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : data.diagnosticProgress ? (
              <div className="flex flex-col gap-3">
                <p className="w-fit rounded-full bg-brand-soft px-3 py-1 text-sm font-bold text-brand-dark">
                  In corso · parte {data.diagnosticProgress.part}
                </p>
                <dl className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="text-ink-soft">Risposte</dt>
                    <dd className="text-lg font-semibold">{data.diagnosticProgress.answers}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">Giuste</dt>
                    <dd className="text-lg font-semibold">
                      {data.diagnosticProgress.correct}
                      {data.diagnosticProgress.answers > 0 &&
                        ` (${Math.round((data.diagnosticProgress.correct / data.diagnosticProgress.answers) * 100)}%)`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">Tempo</dt>
                    <dd className="text-lg font-semibold">{data.diagnosticProgress.minutes} min</dd>
                  </div>
                </dl>
                <p className="text-sm text-ink-soft">
                  Iniziato {formatDateTime(data.diagnosticProgress.startedAt)}
                  {data.diagnosticProgress.lastAt && ` · ultima risposta ${formatDateTime(data.diagnosticProgress.lastAt)}`}
                </p>
                <Link
                  href={`/admin/students/${id}/day/${data.diagnosticProgress.day}`}
                  className="text-sm font-semibold text-brand hover:text-brand-dark"
                >
                  Vedi le risposte una per una →
                </Link>
              </div>
            ) : (
              <p className="text-ink-soft">Non ancora iniziato.</p>
            )}
          </Section>
        </div>

        <Section title="Ragionamenti" subtitle="Come ha pensato i problemi e gli esercizi avanzati sbagliati, con le sue parole">
          {data.notes.length === 0 ? (
            <p className="text-ink-soft">Ancora nessun ragionamento raccontato.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.notes.map((note) => (
                <li key={note.id} className="flex flex-col gap-2 rounded-2xl bg-canvas p-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Link href={`/admin/students/${id}/day/${note.day}`} className="tabular-nums text-ink-soft hover:text-ink">
                      {formatDateTime(note.at)}
                    </Link>
                    <span className="font-semibold">{note.skill}</span>
                    <span className="text-ink-soft">
                      · {LEVEL_LABELS[note.level]} · {note.purpose}
                    </span>
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${OUTCOMES[note.outcome].style}`}>
                      {OUTCOMES[note.outcome].text}
                    </span>
                  </div>
                  <MathText text={note.prompt} className="block text-sm text-ink-soft" />
                  <blockquote className="border-l-4 border-brand pl-3 whitespace-pre-wrap text-ink">{note.note}</blockquote>
                  <p className="text-xs text-ink-soft">
                    {note.source ? NOTE_SOURCES[note.source] ?? note.source : ""}
                    {note.seconds !== null ? ` · ${note.seconds} s` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Percorso" subtitle="Gradini di ogni abilità">
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {data.progress.map((skill) => (
              <li key={skill.skillId} className="flex items-center gap-3 rounded-2xl border-2 border-line px-3 py-2">
                <Gradini steps={skill.steps} mastered={skill.status === "mastered"} />
                <span className="flex flex-1 flex-col">
                  <span className="text-sm font-semibold">{skill.title}</span>
                  <span className="text-xs text-ink-soft">
                    {skill.area} · {skill.status === "learning" ? LEVEL_LABELS[skill.level] : STATUS_TEXT[skill.status]}
                    {skill.nextReviewOn && skill.status !== "learning" ? ` · ripasso ${shortDay(skill.nextReviewOn)}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Lezioni" subtitle="Secondi medi su ogni passo e risultati del “Prova tu”">
          {data.lessons.length === 0 ? (
            <p className="text-ink-soft">Nessuna lezione aperta.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-ink-soft">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Lezione</th>
                    <th className="py-2 pr-3 font-medium">Aperta</th>
                    <th className="py-2 pr-3 font-medium">Capire</th>
                    <th className="py-2 pr-3 font-medium">Ricetta</th>
                    <th className="py-2 pr-3 font-medium">Esempio</th>
                    <th className="py-2 pr-3 font-medium">Prova tu</th>
                    <th className="py-2 font-medium">Prova tu giusta</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lessons.map((lesson) => (
                    <tr key={lesson.skillId} className="border-t border-line tabular-nums">
                      <td className="py-2 pr-3 font-medium">{lesson.title}</td>
                      <td className="py-2 pr-3">{lesson.opened}×</td>
                      {lesson.stepSeconds.map((seconds, index) => (
                        <td key={index} className="py-2 pr-3">
                          {seconds > 0 ? `${seconds} s` : "—"}
                        </td>
                      ))}
                      <td className="py-2">{lesson.tries > 0 ? `${lesson.triesCorrect} su ${lesson.tries}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Diario" subtitle="Apri un giorno per vedere ogni esercizio, risposta e tempo">
          {activeDays.length === 0 ? (
            <p className="text-ink-soft">Nessuna attività negli ultimi 30 giorni.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {activeDays.map((point) => {
                const session = data.sessions.find((candidate) => candidate.day === point.day);
                return (
                  <li key={point.day}>
                    <Link
                      href={`/admin/students/${id}/day/${point.day}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-line px-4 py-3 transition hover:border-brand/50"
                    >
                      <span className="font-semibold">{formatDay(point.day)}</span>
                      <span className="text-sm text-ink-soft">
                        {point.minutes} min · {point.answers} esercizi
                        {point.accuracy !== null ? ` · ${point.accuracy}% giuste` : ""}
                        {session
                          ? ` · sessione ${session.status === "completed" ? "completata" : session.status === "abandoned" ? `lasciata al blocco “${session.blockTitle}”` : "in corso"}`
                          : ""}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </main>
    </>
  );
}

export default function StudentPage({ params }: PageProps<"/admin/students/[id]">) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-5xl px-4 py-6">
          <div className="h-96 animate-pulse rounded-3xl bg-line/60" />
        </main>
      }
    >
      <Overview params={params} />
    </Suspense>
  );
}
