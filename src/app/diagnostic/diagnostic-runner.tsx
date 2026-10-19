"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { PauseTimer } from "@/components/pause-timer";
import { Button, Card } from "@/components/ui";
import { toEngineSections, type AssessmentView, type AttemptState } from "@/lib/assessments/view";
import { nextStep, progress, type SectionChoices } from "@/lib/diagnostic/engine";
import type { ItemResponse } from "@/lib/items/schemas";
import type { AnswerStats } from "@/lib/tracking/schema";
import { chooseSection, finishDiagnostic, startDiagnostic, startPart, submitAnswer } from "./actions";
import { QuestionCard } from "@/components/exercise/question-card";

const ERROR_MESSAGE = "Qualcosa non ha funzionato. Controlla la connessione e riprova.";

function ProgressBar({ done, total }: { done: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={percent}>
      <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${percent}%` }} />
    </div>
  );
}

export function DiagnosticRunner({ view, attempt }: { view: AssessmentView; attempt: AttemptState | null }) {
  const router = useRouter();
  const sections = useMemo(() => toEngineSections(view), [view]);
  const itemsById = useMemo(
    () => new Map(view.sections.flatMap((section) => section.items.map((item) => [item.id, item] as const))),
    [view],
  );

  const [attemptId, setAttemptId] = useState(attempt?.id ?? null);
  const [scores, setScores] = useState<Record<string, number>>(attempt?.scores ?? {});
  const [choices, setChoices] = useState<SectionChoices>(attempt?.choices ?? {});
  const [currentPart, setCurrentPart] = useState(attempt?.currentPart ?? 1);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const state = useMemo(
    () => ({ scores: new Map(Object.entries(scores)), choices, currentPart }),
    [scores, choices, currentPart],
  );
  const step = nextStep(sections, state, view.config);
  const { done, total } = progress(sections, state, view.config);

  const run = (task: () => Promise<void>) => {
    startTransition(async () => {
      try {
        await task();
        setError(null);
      } catch {
        setError(ERROR_MESSAGE);
      }
    });
  };

  const begin = () =>
    run(async () => {
      const result = await startDiagnostic();
      setAttemptId(result.attemptId);
    });

  const answer = (itemId: string, response: ItemResponse, timeMs: number, stats: AnswerStats) =>
    run(async () => {
      if (!attemptId) return;
      const { score } = await submitAnswer({ attemptId, itemId, response, timeMs, stats });
      setScores((previous) => ({ ...previous, [itemId]: score }));
    });

  const choose = (sectionId: string, choice: "included" | "skipped") =>
    run(async () => {
      if (!attemptId) return;
      await chooseSection({ attemptId, sectionId, choice });
      setChoices((previous) => ({ ...previous, [sectionId]: choice }));
    });

  const resume = (part: number) =>
    run(async () => {
      if (!attemptId) return;
      await startPart({ attemptId, part });
      setCurrentPart(part);
    });

  const finish = () =>
    run(async () => {
      if (!attemptId) return;
      await finishDiagnostic({ attemptId });
      router.push("/diagnostic/results");
    });

  const errorBanner = error && (
    <p role="alert" className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">
      {error}
    </p>
  );

  if (!attemptId) {
    return (
      <Card className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight">{view.title}</h1>
          <p className="text-ink-soft">{view.description}</p>
        </div>
        <ul className="flex flex-col gap-2 text-base">
          <li>📝 Tieni vicino un foglio e una penna per i calcoli.</li>
          <li>🚫 Niente calcolatrice.</li>
          <li>⏸️ Il test ha due parti, con una pausa di {view.config.pauseMinutes} minuti in mezzo.</li>
          <li>🤷 Se non sai una risposta, premi “Non lo so”: va benissimo così.</li>
          <li>💾 Puoi interrompere quando vuoi: riprendi da dove eri rimasto.</li>
        </ul>
        {errorBanner}
        <Button onClick={begin} disabled={pending} className="w-full">
          Inizia
        </Button>
      </Card>
    );
  }

  const header = (title: string) => (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm font-semibold text-ink-soft">
        <span>{title}</span>
        <span className="tabular-nums">
          {done}/{total}
        </span>
      </div>
      <ProgressBar done={done} total={total} />
    </div>
  );

  if (step.kind === "item") {
    const section = view.sections.find((candidate) => candidate.id === step.sectionId);
    const item = itemsById.get(step.itemId);
    if (!section || !item) return null;
    return (
      <div className="flex flex-col gap-5">
        {header(section.title)}
        <Card>
          <QuestionCard
            key={item.id}
            item={item}
            pending={pending}
            onSubmit={(response, timeMs, stats) => answer(item.id, response, timeMs, stats)}
          />
        </Card>
        {errorBanner}
      </div>
    );
  }

  if (step.kind === "optional_section") {
    const section = view.sections.find((candidate) => candidate.id === step.sectionId);
    return (
      <div className="flex flex-col gap-5">
        {header(section?.title ?? "")}
        <Card className="flex flex-col gap-5">
          <p className="text-xl font-medium">{section?.optionalQuestion}</p>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => choose(step.sectionId, "included")} disabled={pending}>
              Sì
            </Button>
            <Button variant="secondary" onClick={() => choose(step.sectionId, "skipped")} disabled={pending}>
              No, non ancora
            </Button>
          </div>
        </Card>
        {errorBanner}
      </div>
    );
  }

  if (step.kind === "pause") {
    return (
      <div className="flex flex-col gap-5">
        {header("Pausa")}
        <Card className="flex flex-col items-center gap-5 text-center">
          <p className="text-4xl">💪</p>
          <h2 className="text-2xl font-extrabold">Prima parte finita!</h2>
          <p className="text-ink-soft">
            Fai una pausa di {view.config.pauseMinutes} minuti: alzati, bevi un bicchiere d’acqua, muoviti un po’.
          </p>
          <PauseTimer minutes={view.config.pauseMinutes} />
          <Button onClick={() => resume(step.nextPart)} disabled={pending} className="w-full">
            Sono pronto, riprendo
          </Button>
        </Card>
        {errorBanner}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {header("Fine")}
      <Card className="flex flex-col items-center gap-5 text-center">
        <p className="text-4xl">🎉</p>
        <h2 className="text-2xl font-extrabold">Hai finito il test!</h2>
        <p className="text-ink-soft">Bravo per l’impegno. Adesso vediamo insieme la tua mappa di partenza.</p>
        <Button onClick={finish} disabled={pending} className="w-full">
          Scopri la tua mappa
        </Button>
      </Card>
      {errorBanner}
    </div>
  );
}
