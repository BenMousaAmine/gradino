"use client";

import { useEffect, useRef, useState } from "react";
import { useTricks } from "@/components/coach";
import { MathText } from "@/components/math-text";
import { TrickCard } from "@/components/trick-card";
import { Button } from "@/components/ui";
import { trickForSkill, trickForTag, type Trick } from "@/lib/insights/tricks";
import type { ItemResponse } from "@/lib/items/schemas";
import { submitNote, submitSecondAttempt, submitStudyAnswer } from "@/lib/study/actions";
import type { AnswerFeedback, PublicExercise } from "@/lib/study/types";
import type { AnswerStats } from "@/lib/tracking/schema";
import { FeedbackPanel } from "./feedback-panel";
import { NotePanel } from "./note-panel";
import { QuestionCard } from "./question-card";

type Stage =
  | { kind: "question" }
  | { kind: "hint"; first: AnswerFeedback; response: ItemResponse }
  | { kind: "retry"; first: AnswerFeedback; response: ItemResponse; hintMs: number }
  | { kind: "note"; feedback: AnswerFeedback }
  | { kind: "feedback"; feedback: AnswerFeedback };

const SKIP_LABEL = "Non lo so: fammi vedere come si fa";

export function ExerciseFlow({
  exercise,
  sessionId,
  pending,
  run,
  onAnswered,
  onNext,
}: {
  exercise: PublicExercise;
  sessionId: string | null;
  pending: boolean;
  run: (task: () => Promise<void>) => void;
  onAnswered?: (feedback: AnswerFeedback) => void;
  onNext: () => void;
}) {
  const [stage, setStage] = useState<Stage>({ kind: "question" });
  const itemId = exercise.ref.source === "template" ? `${exercise.ref.id}:${exercise.ref.seed}` : exercise.ref.id;
  const skillTrick = trickForSkill(useTricks(), exercise.skillId);
  const trickFor = (feedback: AnswerFeedback) => trickForTag(feedback.diagnosis?.tag) ?? skillTrick;

  const conclude = (feedback: AnswerFeedback) =>
    setStage(feedback.needsNote ? { kind: "note", feedback } : { kind: "feedback", feedback });

  const answer = (response: ItemResponse, timeMs: number, stats: AnswerStats) =>
    run(async () => {
      const feedback = await submitStudyAnswer({
        sessionId,
        ref: exercise.ref,
        purpose: exercise.purpose,
        response,
        timeMs,
        stats,
      });
      onAnswered?.(feedback);
      if (feedback.canRetry) setStage({ kind: "hint", first: feedback, response });
      else conclude(feedback);
    });

  const retry = (first: AnswerFeedback, hintMs: number, response: ItemResponse, timeMs: number, stats: AnswerStats) =>
    run(async () => {
      const feedback = await submitSecondAttempt({ answerId: first.answerId, response, timeMs, stats, hintMs });
      conclude({ ...feedback, event: first.event });
    });

  const saveNote = (feedback: AnswerFeedback, note: string, source: "typed" | "voice" | "mixed", ms: number) =>
    run(async () => {
      await submitNote({ answerId: feedback.answerId, note, source, ms });
      setStage({ kind: "feedback", feedback });
    });

  if (stage.kind === "question" || stage.kind === "retry") {
    return (
      <>
        {stage.kind === "question" && skillTrick && <TrickCard trick={skillTrick} where="exercise" item={itemId} />}
        <QuestionCard
        key={stage.kind}
        item={{ id: itemId, content: exercise.content }}
        pending={pending}
        skipLabel={SKIP_LABEL}
        initialResponse={stage.kind === "retry" && stage.response.type !== "skip" ? stage.response : undefined}
        onSubmit={(response, timeMs, stats) =>
          stage.kind === "retry" ? retry(stage.first, stage.hintMs, response, timeMs, stats) : answer(response, timeMs, stats)
        }
        />
      </>
    );
  }

  return (
    <>
      <div className="rounded-2xl bg-canvas px-4 py-3">
        <MathText text={exercise.content.prompt} />
      </div>
      {stage.kind === "hint" && (
        <HintPanel
          feedback={stage.first}
          trick={trickFor(stage.first)}
          item={itemId}
          onRetry={(hintMs) => setStage({ kind: "retry", first: stage.first, response: stage.response, hintMs })}
        />
      )}
      {stage.kind === "note" && (
        <NotePanel
          solved={stage.feedback.score === 1}
          pending={pending}
          onSubmit={(note, source, ms) => saveNote(stage.feedback, note, source, ms)}
        />
      )}
      {stage.kind === "feedback" && (
        <FeedbackPanel
          feedback={stage.feedback}
          onNext={onNext}
          pending={pending}
          sessionId={sessionId}
          trick={stage.feedback.score < 1 ? trickFor(stage.feedback) : null}
          item={itemId}
        />
      )}
    </>
  );
}

function HintPanel({
  feedback,
  trick,
  item,
  onRetry,
}: {
  feedback: AnswerFeedback;
  trick: Trick | null;
  item: string;
  onRetry: (hintMs: number) => void;
}) {
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    shownAt.current = performance.now();
  }, []);

  const partial = feedback.score > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className={`flex flex-col gap-1 rounded-2xl px-4 py-3 ${partial ? "bg-warn-soft text-warn" : "bg-bad-soft text-bad"}`}>
        <p className="font-display text-2xl font-extrabold">{partial ? "Quasi!" : "Non ancora."}</p>
        {feedback.diagnosis?.message && <MathText text={feedback.diagnosis.message} className="text-base" />}
      </div>
      {trick && <TrickCard trick={trick} where="hint" item={item} />}
      <p className="text-ink-soft">Hai un altro tentativo: la tua risposta resta lì, correggi quello che non va.</p>
      <Button
        onClick={() => onRetry(shownAt.current === null ? 0 : Math.round(performance.now() - shownAt.current))}
        className="w-full"
        autoFocus
      >
        Riprova
      </Button>
    </div>
  );
}
