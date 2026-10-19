"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { InputQuestion } from "@/components/exercise/input-question";
import { MathText } from "@/components/math-text";
import { Button } from "@/components/ui";
import { VisualView } from "@/components/visuals";
import { gradeItem, type Grade } from "@/lib/items/grade";
import { formatDecimal } from "@/lib/items/numbers";
import type { FieldKey } from "@/lib/items/schemas";
import { completeAsItem, type Lesson } from "@/lib/lessons/schema";
import { track } from "@/lib/tracking/client";

const STEPS = ["Capire", "Ricetta", "Esempio", "Prova tu"];

function keyText(key: FieldKey): string {
  return key.kind === "number" ? formatDecimal(key.value) : `$\\frac{${key.numerator}}{${key.denominator}}$`;
}

export function LessonView({
  lesson,
  skillId,
  sessionId = null,
  onComplete,
  pending,
  completeLabel = "Inizia a esercitarti",
}: {
  lesson: Lesson;
  skillId: string;
  sessionId?: string | null;
  onComplete: () => void;
  pending: boolean;
  completeLabel?: string;
}) {
  const [step, setStep] = useState(0);
  const openedAt = useRef<number | null>(null);
  const stepStartedAt = useRef<number | null>(null);

  useEffect(() => {
    openedAt.current = performance.now();
    stepStartedAt.current = performance.now();
    track("lesson_opened", { sessionId, skillId, payload: { context: sessionId ? "session" : "skill" } });
  }, [sessionId, skillId]);

  const leaveStep = () => {
    const now = performance.now();
    track("lesson_step", {
      sessionId,
      skillId,
      payload: { step, ms: Math.round(now - (stepStartedAt.current ?? now)) },
    });
    stepStartedAt.current = now;
  };

  const goTo = (next: number) => {
    leaveStep();
    setStep(next);
  };

  const complete = () => {
    leaveStep();
    const now = performance.now();
    track("lesson_completed", { sessionId, skillId, payload: { ms: Math.round(now - (openedAt.current ?? now)) } });
    onComplete();
  };

  const check = (nextGrade: Grade) => {
    track("lesson_try", {
      sessionId,
      skillId,
      payload: {
        attempt: attempt + 1,
        correct: nextGrade.fields.filter((field) => field.score === 1).length,
        total: nextGrade.fields.length,
      },
    });
    setGrade(nextGrade);
  };
  const [revealed, setRevealed] = useState(1);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [attempt, setAttempt] = useState(0);
  const item = useMemo(() => completeAsItem(lesson.complete), [lesson.complete]);
  const allCorrect = grade !== null && grade.fields.every((field) => field.score === 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="w-fit rounded-full bg-brand-soft px-3 py-1 text-sm font-bold text-brand-dark">Lezione</p>
        <h2 className="text-2xl font-extrabold">{lesson.title}</h2>
        <div className="flex gap-1.5">
          {STEPS.map((label, index) => (
            <div key={label} className="flex flex-1 flex-col gap-1">
              <div className={`h-2.5 rounded-full ${index <= step ? "bg-brand" : "bg-line"}`} />
              <span className={`text-xs ${index === step ? "font-semibold text-ink" : "text-ink-soft"}`}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {step === 0 && (
        <div className="flex flex-col gap-4">
          {lesson.understand.paragraphs.map((paragraph) => (
            <MathText key={paragraph} text={paragraph} className="block text-lg leading-relaxed" />
          ))}
          {lesson.understand.visual && <VisualView visual={lesson.understand.visual} />}
          <Button onClick={() => goTo(1)} className="w-full">
            Ho capito, avanti
          </Button>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <p className="font-semibold text-ink-soft">La ricetta, sempre uguale:</p>
          <ol className="flex flex-col gap-3">
            {lesson.recipe.map((line, index) => (
              <li key={line} className="flex gap-3 rounded-2xl bg-canvas p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand font-display text-sm font-extrabold text-white">
                  {index + 1}
                </span>
                <MathText text={line} className="text-lg" />
              </li>
            ))}
          </ol>
          {lesson.watchOut.length > 0 && (
            <div className="flex flex-col gap-2 rounded-2xl bg-warn-soft p-4">
              <p className="font-semibold text-warn">⚠️ Attenzione</p>
              {lesson.watchOut.map((line) => (
                <MathText key={line} text={line} className="block" />
              ))}
            </div>
          )}
          <Button onClick={() => goTo(2)} className="w-full">
            Vediamo un esempio
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <MathText text={lesson.example.prompt} className="text-xl font-medium" />
          <ol className="flex flex-col gap-2">
            {lesson.example.steps.slice(0, revealed).map((line, index) => (
              <li key={line} className="flex gap-3 rounded-2xl border-2 border-line p-3">
                <span className="font-bold text-brand">{index + 1}.</span>
                <MathText text={line} className="text-lg" />
              </li>
            ))}
          </ol>
          {revealed < lesson.example.steps.length ? (
            <Button variant="secondary" onClick={() => setRevealed(revealed + 1)} className="w-full">
              Passo successivo
            </Button>
          ) : (
            <>
              <p className="rounded-2xl bg-good-soft px-4 py-3 text-lg font-semibold text-good">
                Risultato: <MathText text={lesson.example.answer} />
              </p>
              <Button onClick={() => goTo(3)} className="w-full">
                Adesso prova tu
              </Button>
            </>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <MathText text={lesson.complete.prompt} className="text-xl font-medium" />
          {lesson.complete.given.map((line) => (
            <MathText key={line} text={line} className="block rounded-2xl bg-canvas px-4 py-3 text-lg" />
          ))}
          {grade === null ? (
            item.content.type === "input" && (
              <InputQuestion
                key={attempt}
                content={item.content}
                pending={pending}
                onSubmit={(response) => check(gradeItem(item.key, response))}
              />
            )
          ) : (
            <div className="flex flex-col gap-3">
              {lesson.complete.blanks.map((blank, index) => {
                const ok = grade.fields[index]?.score === 1;
                return (
                  <div key={blank.label} className={`rounded-2xl px-4 py-3 ${ok ? "bg-good-soft" : "bg-bad-soft"}`}>
                    <MathText text={blank.label} />{" "}
                    <span className={`font-bold ${ok ? "text-good" : "text-bad"}`}>
                      {ok ? "✓" : <>✗ era <MathText text={keyText(blank.key)} /></>}
                    </span>
                  </div>
                );
              })}
              {allCorrect ? (
                <>
                  <p className="text-lg font-semibold text-good">Perfetto, hai capito il metodo!</p>
                  <Button onClick={complete} loading={pending} className="w-full">
                    {completeLabel}
                  </Button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setGrade(null);
                      setAttempt(attempt + 1);
                    }}
                  >
                    Riprova
                  </Button>
                  <Button onClick={complete} loading={pending}>
                    Continua
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
