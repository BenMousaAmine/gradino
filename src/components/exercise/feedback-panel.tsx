"use client";

import { useEffect, useRef } from "react";
import { MathText } from "@/components/math-text";
import { Button } from "@/components/ui";
import { LEVEL_LABELS } from "@/lib/study/plan";
import type { AnswerFeedback } from "@/lib/study/types";
import { track } from "@/lib/tracking/client";

function formatDay(day: string) {
  const [, month, date] = day.split("-");
  return `${date}/${month}`;
}

function EventBanner({ event }: { event: NonNullable<AnswerFeedback["event"]> }) {
  const text =
    event.type === "level_up"
      ? `🎉 Hai salito un gradino! Adesso sei al ${LEVEL_LABELS[event.to]}.`
      : event.type === "completed"
        ? "🏁 Abilità completata! Domani un ripasso veloce per confermarla."
        : event.type === "review_passed"
          ? `✅ Ripasso superato! Il prossimo il ${formatDay(event.nextReviewOn)}.`
          : `🔁 Il ripasso non è andato: riprendiamo dal ${LEVEL_LABELS[event.level]}.`;
  return <p className="rounded-2xl bg-brand-soft px-4 py-3 font-semibold text-brand-dark">{text}</p>;
}

export function FeedbackPanel({
  feedback,
  onNext,
  pending,
  sessionId = null,
}: {
  feedback: AnswerFeedback;
  onNext: () => void;
  pending: boolean;
  sessionId?: string | null;
}) {
  const shownAt = useRef<number | null>(null);
  const solution = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    shownAt.current = performance.now();
  }, []);

  const next = () => {
    const ms = shownAt.current === null ? 0 : Math.round(performance.now() - shownAt.current);
    track("feedback_closed", {
      sessionId,
      payload: { answerId: feedback.answerId, ms, score: feedback.score, solutionOpen: solution.current?.open ?? false },
    });
    onNext();
  };

  const correct = feedback.score === 1;
  const partial = feedback.score > 0 && feedback.score < 1;
  const skipped = feedback.diagnosis?.tag === "skipped";
  const headline = correct ? "Giusto!" : partial ? "Quasi!" : skipped ? "Nessun problema, ecco come si fa." : "Non ancora.";
  const tone = correct
    ? "bg-good-soft text-good"
    : partial
      ? "bg-warn-soft text-warn"
      : skipped
        ? "bg-canvas text-ink"
        : "bg-bad-soft text-bad";

  return (
    <div className="flex flex-col gap-4">
      <div className={`flex flex-col gap-1 rounded-2xl px-4 py-3 ${tone}`}>
        <p className="font-display text-2xl font-extrabold">{headline}</p>
        {feedback.diagnosis?.message && <MathText text={feedback.diagnosis.message} className="text-base" />}
      </div>

      {feedback.event && <EventBanner event={feedback.event} />}

      {feedback.correctAnswer.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-ink-soft">La risposta giusta è</p>
          {feedback.correctAnswer.map((line) => (
            <MathText key={line} text={line} className="text-lg font-semibold" />
          ))}
        </div>
      )}

      {feedback.solution.length > 0 && (
        <details ref={solution} open={!correct} className="rounded-2xl border-2 border-line p-4">
          <summary className="cursor-pointer font-semibold">Come si fa</summary>
          <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5">
            {feedback.solution.map((step) => (
              <li key={step}>
                <MathText text={step} />
              </li>
            ))}
          </ol>
        </details>
      )}

      <Button onClick={next} disabled={pending} className="w-full" autoFocus>
        Avanti
      </Button>
    </div>
  );
}
