"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ExerciseFlow } from "@/components/exercise/exercise-flow";
import { LessonView } from "@/components/lesson-view";
import { PauseTimer } from "@/components/pause-timer";
import { Button, buttonClass, Card } from "@/components/ui";
import { advanceSessionBlock, finishLesson, nextSessionStep } from "@/lib/study/actions";
import { LEVEL_LABELS } from "@/lib/study/plan";
import type { PublicExercise, SessionView } from "@/lib/study/types";
import { SUBJECTS } from "@/lib/subjects";
import { track } from "@/lib/tracking/client";

const ERROR_MESSAGE = "Qualcosa non ha funzionato. Controlla la connessione e riprova.";

const PURPOSE_LABELS: Partial<Record<PublicExercise["purpose"], string>> = {
  review: "Ripasso",
  retry: "Errore da rivedere",
  problem: "Problema",
  check: "Verifica",
};

const METHOD = [
  "Leggi due volte",
  "Dati e cosa cerco",
  "Disegna",
  "Piano: scrivi i passi",
  "Calcola con le unità",
  "Controlla e rispondi",
];

type Phase = { kind: "step" } | { kind: "pause" };

function useNow(start: number) {
  const [now, setNow] = useState(start);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function clock(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function TodayRunner({ initial }: { initial: SessionView }) {
  const [view, setView] = useState(initial);
  const [phase, setPhase] = useState<Phase>({ kind: "step" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const now = useNow(initial.serverTime);

  const endsAt = Date.parse(view.block.startedAt) + view.block.minutes * 60_000;
  const timeUp = now >= endsAt;
  const blocks = SUBJECTS[view.subject].blocks;
  const isLastBlock = view.block.index === blocks.length - 1;
  const nextBlock = blocks[view.block.index + 1];
  const pauseStartedAt = useRef<number | null>(null);
  const timeUpTracked = useRef(new Set<number>());

  useEffect(() => {
    if (!timeUp || timeUpTracked.current.has(view.block.index)) return;
    timeUpTracked.current.add(view.block.index);
    track("time_up", { sessionId: view.sessionId, payload: { block: view.block.index } });
  }, [timeUp, view.block.index, view.sessionId]);

  useEffect(() => {
    let hiddenAt: number | null = null;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt === null) return;
      const ms = Date.now() - hiddenAt;
      hiddenAt = null;
      if (ms >= 2000) track("away", { sessionId: view.sessionId, payload: { ms } });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [view.sessionId]);

  const startPause = () => {
    pauseStartedAt.current = Date.now();
    track("pause_started", { sessionId: view.sessionId, payload: { block: view.block.index } });
    setPhase({ kind: "pause" });
  };

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

  const advance = async () => {
    if (pauseStartedAt.current !== null) {
      track("pause_ended", {
        sessionId: view.sessionId,
        payload: { block: view.block.index, ms: Date.now() - pauseStartedAt.current },
      });
      pauseStartedAt.current = null;
    }
    setView(await advanceSessionBlock({ sessionId: view.sessionId, subject: view.subject }));
    setPhase({ kind: "step" });
  };

  const proceed = () =>
    run(async () => {
      const expired = Date.now() >= endsAt;
      if (expired && isLastBlock) return advance();
      if (expired) {
        startPause();
        return;
      }
      setView(await nextSessionStep({ subject: view.subject }));
      setPhase({ kind: "step" });
    });

  const completeLesson = (skillId: string) =>
    run(async () => {
      await finishLesson({ skillId });
      if (Date.now() >= endsAt) {
        startPause();
        return;
      }
      setView(await nextSessionStep({ subject: view.subject }));
      setPhase({ kind: "step" });
    });

  const errorBanner = error && (
    <p role="alert" className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">
      {error}
    </p>
  );

  if (view.step.kind === "done") {
    const { summary } = view.step;
    return (
      <Card className="flex flex-col items-center gap-5 text-center">
        <p className="text-5xl">🎉</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Sessione di oggi completata!</h1>
        <div className="grid w-full grid-cols-3 gap-3">
          <div className="rounded-2xl bg-brand-soft p-3">
            <p className="font-display text-2xl font-extrabold">{summary.answers}</p>
            <p className="text-sm text-ink-soft">esercizi</p>
          </div>
          <div className="rounded-2xl bg-good-soft p-3">
            <p className="font-display text-2xl font-extrabold">{summary.correct}</p>
            <p className="text-sm text-ink-soft">giusti</p>
          </div>
          <div className="rounded-2xl bg-warn-soft p-3">
            <p className="font-display text-2xl font-extrabold">{summary.minutes}</p>
            <p className="text-sm text-ink-soft">minuti</p>
          </div>
        </div>
        {summary.skills.length > 0 && <p className="text-ink-soft">Oggi hai lavorato su: {summary.skills.join(", ")}.</p>}
        <Link href={view.subject === "math" ? "/" : `/?subject=${view.subject}`} className={`${buttonClass()} w-full`}>
          Torna alla home
        </Link>
      </Card>
    );
  }

  const header = (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5">
        {blocks.map((block, index) => (
          <div
            key={block.id}
            title={block.title}
            className={`h-3 flex-1 rounded-full ${
              index < view.block.index ? "bg-step-3" : index === view.block.index ? "bg-brand" : "bg-line"
            }`}
          />
        ))}
      </div>
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-sm font-bold text-ink-soft">
            {SUBJECTS[view.subject].title} · Blocco {view.block.index + 1} di {blocks.length}
          </p>
          <h1 className="text-xl font-extrabold tracking-tight">{view.block.title}</h1>
        </div>
        <p className={`font-display text-2xl font-extrabold tabular-nums ${timeUp ? "text-bad" : "text-brand"}`}>{clock(Math.min(endsAt - now, view.block.minutes * 60_000))}</p>
      </div>
      {timeUp && phase.kind !== "pause" && (
        <p className="rounded-2xl bg-warn-soft px-4 py-2 text-sm font-semibold text-warn">
          Tempo scaduto: finisci questo e poi pausa.
        </p>
      )}
    </div>
  );

  if (phase.kind === "pause") {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <Card className="flex flex-col items-center gap-5 text-center">
          <p className="text-4xl">💪</p>
          <h2 className="text-2xl font-extrabold">Blocco finito!</h2>
          <p className="text-ink-soft">
            Pausa di {view.block.pauseMinutes} minuti: alzati, bevi un bicchiere d’acqua, muoviti un po’.
          </p>
          <PauseTimer minutes={view.block.pauseMinutes} />
          <Button onClick={() => run(advance)} loading={pending} className="w-full">
            Riprendo: {nextBlock?.title}
          </Button>
        </Card>
        {errorBanner}
      </div>
    );
  }

  if (view.step.kind === "lesson") {
    const { lesson, skillId } = view.step;
    return (
      <div className="flex flex-col gap-5">
        {header}
        <Card>
          <LessonView
            key={skillId}
            lesson={lesson}
            skillId={skillId}
            sessionId={view.sessionId}
            pending={pending}
            onComplete={() => completeLesson(skillId)}
          />
        </Card>
        {errorBanner}
      </div>
    );
  }

  const { exercise } = view.step;
  const exerciseKey = exercise.ref.source === "template" ? `${exercise.ref.id}:${exercise.ref.seed}` : exercise.ref.id;
  const purposeLabel = PURPOSE_LABELS[exercise.purpose];

  return (
    <div className="flex flex-col gap-5">
      {header}
      {view.block.id === "problems" && (
        <details className="rounded-3xl border-2 border-line bg-surface p-4">
          <summary className="cursor-pointer font-semibold">Il metodo in 6 passi</summary>
          <ol className="mt-3 grid list-decimal grid-cols-1 gap-1 pl-5 text-ink-soft sm:grid-cols-2">
            {METHOD.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </details>
      )}
      <Card className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2 text-sm" data-exercise-ref={JSON.stringify(exercise.ref)}>
          <span className="font-semibold text-ink">{exercise.skillTitle}</span>
          <span className="text-ink-soft">· {LEVEL_LABELS[exercise.level]}</span>
          {purposeLabel && (
            <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-dark">{purposeLabel}</span>
          )}
        </div>
        <ExerciseFlow
          key={`${exerciseKey}:${view.serverTime}`}
          exercise={exercise}
          sessionId={view.sessionId}
          pending={pending}
          run={run}
          onNext={proceed}
        />
      </Card>
      {errorBanner}
    </div>
  );
}
