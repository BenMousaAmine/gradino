import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { formatDateTime } from "@/lib/admin/format";
import { listStudents, requireAdmin } from "@/lib/admin/queries";
import { APP_NAME } from "@/lib/app";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: `Admin · ${APP_NAME}` };

async function Students() {
  const user = await requireAdmin();
  const students = await listStudents(createSupabaseAdminClient(), user.id);

  return (
    <>
      <AppHeader name={user.displayName} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight">Pannello admin</h1>
          <p className="text-ink-soft">I tuoi studenti e cosa hanno fatto negli ultimi 7 giorni.</p>
        </div>
        {students.length === 0 ? (
          <p className="rounded-3xl border-2 border-line bg-surface p-5 text-ink-soft">Non ci sono ancora studenti.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {students.map((student) => (
              <li key={student.id}>
                <Link
                  href={`/admin/students/${student.id}`}
                  className={`flex flex-col gap-4 rounded-3xl border-2 bg-surface p-5 transition hover:border-brand/50 ${
                    student.isSelf ? "border-dashed border-brand/40" : "border-line"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xl font-bold">
                        {student.name}
                        {student.isSelf && (
                          <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 align-middle text-xs font-bold text-brand-dark">
                            Tu, in vista studente
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-ink-soft">{student.email}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        student.diagnosticDone ? "bg-good-soft text-good" : "bg-warn-soft text-warn"
                      }`}
                    >
                      {student.diagnosticDone ? "Test iniziale fatto" : "Test iniziale da fare"}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div>
                      <dt className="text-ink-soft">Oggi</dt>
                      <dd className="text-lg font-semibold">{student.minutesToday} min</dd>
                    </div>
                    <div>
                      <dt className="text-ink-soft">7 giorni</dt>
                      <dd className="text-lg font-semibold">{student.minutesWeek} min</dd>
                    </div>
                    <div>
                      <dt className="text-ink-soft">Giuste</dt>
                      <dd className="text-lg font-semibold">{student.accuracyWeek === null ? "—" : `${student.accuracyWeek}%`}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-soft">Sessioni</dt>
                      <dd className="text-lg font-semibold">{student.sessionsWeek}</dd>
                    </div>
                  </dl>
                  <p className="text-sm text-ink-soft">
                    {student.lastActivity ? `Ultima attività: ${formatDateTime(student.lastActivity)}` : "Nessuna attività"}
                    {student.answersWeek > 0 && ` · ${student.answersWeek} esercizi in 7 giorni`}
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

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-5xl px-4 py-6">
          <div className="h-64 animate-pulse rounded-3xl bg-line/60" />
        </main>
      }
    >
      <Students />
    </Suspense>
  );
}
