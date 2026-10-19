import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { AppHeader } from "@/components/app-header";
import { MathText } from "@/components/math-text";
import { Card } from "@/components/ui";
import { APP_NAME, DIAGNOSTIC_ID } from "@/lib/app";
import { loadAssessment, loadLatestAttempt } from "@/lib/assessments/queries";
import { toEngineSections } from "@/lib/assessments/view";
import { getCurrentUser } from "@/lib/auth/session";
import { recoveryPlan, sectionResults, type AreaColor } from "@/lib/diagnostic/engine";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: `La tua mappa · ${APP_NAME}` };

const COLOR_STYLES: Record<AreaColor | "skipped", { dot: string; badge: string; label: string }> = {
  green: { dot: "bg-step-3", badge: "bg-good-soft text-good", label: "Sai già bene" },
  yellow: { dot: "bg-step-2", badge: "bg-warn-soft text-warn", label: "Da rinforzare" },
  red: { dot: "bg-step-1", badge: "bg-bad-soft text-bad", label: "Da recuperare" },
  skipped: { dot: "bg-line", badge: "bg-canvas text-ink-soft", label: "Non ancora fatto in classe" },
};

const diagnosisSchema = z.object({ tag: z.string(), message: z.string().nullable() }).nullable();
const detailsSchema = z.object({
  diagnosis: diagnosisSchema.optional(),
  fields: z.array(z.object({ fieldId: z.string(), score: z.number(), diagnosis: diagnosisSchema })).optional(),
});

function formatSeconds(ms: number) {
  return `${Math.round(ms / 1000)} s`;
}

async function Results() {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  const view = await loadAssessment(supabase, DIAGNOSTIC_ID);
  const attempt = await loadLatestAttempt(supabase, user.id, DIAGNOSTIC_ID, "completed");
  if (!view || !attempt) redirect("/diagnostic");

  const engineSections = toEngineSections(view);
  const state = { scores: new Map(Object.entries(attempt.scores)), choices: attempt.choices, currentPart: Infinity };
  const results = sectionResults(engineSections, state, view.config);
  const plan = recoveryPlan(results, view.config);
  const sectionById = new Map(view.sections.map((section) => [section.id, section]));
  const greens = results.filter((result) => result.color === "green").length;
  const evaluated = results.filter((result) => result.color !== null).length;

  const { data: responses, error } = await supabase
    .from("responses")
    .select("item_id, score, details, time_ms")
    .eq("attempt_id", attempt.id);
  if (error) throw new Error(error.message);
  const responseByItem = new Map(responses.map((response) => [response.item_id, response]));

  return (
    <>
      <AppHeader name={user.displayName} />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">La tua mappa di partenza</h1>
          <p className="text-ink-soft">
            {greens > 0
              ? `Hai già ${greens} ${greens === 1 ? "area verde" : "aree verdi"} su ${evaluated}. Da qui partiamo!`
              : "Adesso sappiamo esattamente da dove partire. Un passo alla volta ci arriviamo."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {results.map((result) => {
            const style = COLOR_STYLES[result.color ?? "skipped"];
            return (
              <div key={result.sectionId} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
                <span className={`h-4 w-4 shrink-0 rounded-full ${style.dot}`} />
                <div className="flex flex-col">
                  <span className="font-semibold">{sectionById.get(result.sectionId)?.title}</span>
                  <span className={`mt-1 self-start rounded-full px-2 py-0.5 text-xs font-semibold ${style.badge}`}>
                    {style.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <Card className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">Da dove partiamo</h2>
          {plan.length === 0 ? (
            <p className="text-ink-soft">Le basi ci sono tutte: possiamo partire subito con il programma di terza.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {plan.map((result, index) => (
                <li key={result.sectionId} className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      index < 3 ? "bg-brand text-white" : "bg-canvas text-ink-soft"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className={index < 3 ? "font-semibold" : "text-ink-soft"}>
                    {sectionById.get(result.sectionId)?.title}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <details className="rounded-2xl border border-line bg-surface p-5">
          <summary className="cursor-pointer font-semibold">Dettagli per il genitore o il tutor</summary>
          <div className="mt-4 flex flex-col gap-6">
            {results.map((result) => {
              const section = sectionById.get(result.sectionId);
              if (!section) return null;
              const answered = section.items.filter((item) => responseByItem.has(item.id));
              const totalTime = answered.reduce((sum, item) => sum + (responseByItem.get(item.id)?.time_ms ?? 0), 0);
              const problems = answered.flatMap((item) => {
                const response = responseByItem.get(item.id);
                if (!response) return [];
                const details = detailsSchema.safeParse(response.details);
                const messages = details.success
                  ? [
                      details.data.diagnosis?.message,
                      ...(details.data.fields ?? []).map((field) => field.diagnosis?.message),
                    ].filter((message, index, all): message is string => !!message && all.indexOf(message) === index)
                  : [];
                const tag = details.success ? details.data.diagnosis?.tag : undefined;
                if (response.score === 1 && messages.length === 0) return [];
                return [{ item, score: response.score, messages, skipped: tag === "skipped" }];
              });

              return (
                <section key={result.sectionId} className="flex flex-col gap-2">
                  <h3 className="font-semibold">
                    {section.title}{" "}
                    <span className="font-normal text-ink-soft">
                      {result.color === null
                        ? "· non svolta"
                        : `· ${Math.round(result.ratio * 100)}% · ${answered.length}/${result.total} risposte · ${
                            answered.length > 0 ? `${formatSeconds(totalTime / answered.length)} in media` : ""
                          }`}
                    </span>
                  </h3>
                  {result.closedEarly && (
                    <p className="text-sm text-bad">Sezione chiusa in anticipo: 2 errori nelle domande base.</p>
                  )}
                  {problems.map((problem) => (
                    <div key={problem.item.id} className="rounded-xl bg-canvas p-3 text-sm">
                      <MathText text={problem.item.content.prompt} className="block font-medium" />
                      <p className="mt-1 text-ink-soft">
                        {problem.skipped
                          ? "Ha risposto “Non lo so”."
                          : problem.score === 1
                            ? "Giusta, con una nota:"
                            : problem.score > 0
                              ? "Risposta in parte giusta."
                              : "Risposta sbagliata."}
                      </p>
                      {problem.messages.map((message) => (
                        <MathText key={message} text={message} className="mt-1 block text-ink" />
                      ))}
                    </div>
                  ))}
                </section>
              );
            })}
          </div>
        </details>
      </main>
    </>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-xl px-4 py-6">
          <div className="h-96 animate-pulse rounded-2xl bg-line/60" />
        </main>
      }
    >
      <Results />
    </Suspense>
  );
}
