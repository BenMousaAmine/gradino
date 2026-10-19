"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { FeedbackPanel } from "@/components/exercise/feedback-panel";
import { QuestionCard } from "@/components/exercise/question-card";
import { Gradini } from "@/components/gradini";
import { LessonView } from "@/components/lesson-view";
import { MathText } from "@/components/math-text";
import { Card } from "@/components/ui";
import type { ItemResponse, Level } from "@/lib/items/schemas";
import type { Lesson } from "@/lib/lessons/schema";
import type { AnswerStats } from "@/lib/tracking/schema";
import { finishLesson, nextSkillExercise, submitStudyAnswer } from "@/lib/study/actions";
import { LEVELS, type SkillStatus } from "@/lib/study/mastery";
import { LEVEL_LABELS } from "@/lib/study/plan";
import type { AnswerFeedback, PathEntry, PublicExercise } from "@/lib/study/types";

const ERROR_MESSAGE = "Qualcosa non ha funzionato. Controlla la connessione e riprova.";

function statusText(status: SkillStatus, level: Level) {
  if (status === "mastered") return "Sai già bene ✓";
  if (status === "review") return "Completata: manca il ripasso di conferma";
  return LEVEL_LABELS[level];
}

export function SkillView({
  entry,
  lesson,
  lessonDone,
  firstExercise,
}: {
  entry: PathEntry;
  lesson: Lesson | null;
  lessonDone: boolean;
  firstExercise: PublicExercise | null;
}) {
  const [tab, setTab] = useState<"lesson" | "practice">(lesson && !lessonDone ? "lesson" : "practice");
  const [exercise, setExercise] = useState(firstExercise);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [progress, setProgress] = useState({ status: entry.status, level: entry.level, steps: entry.steps });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

  const answer = (current: PublicExercise, response: ItemResponse, timeMs: number, stats: AnswerStats) =>
    run(async () => {
      const result = await submitStudyAnswer({
        sessionId: null,
        ref: current.ref,
        purpose: current.purpose,
        response,
        timeMs,
        stats,
      });
      if (result.event?.type === "level_up") {
        setProgress({ status: "learning", level: result.event.to, steps: LEVELS.indexOf(result.event.to) });
      }
      if (result.event?.type === "completed") setProgress({ status: "review", level: "advanced", steps: 3 });
      setFeedback(result);
    });

  const next = () =>
    run(async () => {
      setExercise(await nextSkillExercise({ skillId: entry.id }));
      setFeedback(null);
    });

  const exerciseKey =
    exercise && (exercise.ref.source === "template" ? `${exercise.ref.id}:${exercise.ref.seed}` : exercise.ref.id);

  return (
    <div className="flex flex-col gap-5">
      <Link href="/" className="text-sm font-semibold text-ink-soft hover:text-ink">
        ← Torna alla home
      </Link>
      <div className="flex flex-col gap-2">
        <p className="w-fit rounded-full bg-brand-soft px-3 py-1 text-sm font-bold text-brand-dark">{entry.areaTitle}</p>
        <h1 className="text-2xl font-extrabold tracking-tight">{entry.title}</h1>
        <div className="flex items-center gap-3 text-ink-soft">
          <Gradini steps={progress.steps} mastered={progress.status === "mastered"} />
          <span>{statusText(progress.status, progress.level)}</span>
        </div>
      </div>

      {lesson && (
        <div className="grid grid-cols-2 gap-1.5 rounded-2xl border-2 border-line bg-surface p-1">
          {(["lesson", "practice"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`h-11 rounded-xl font-display text-base font-extrabold transition ${
                tab === value ? "bg-brand text-white" : "text-ink-soft hover:text-ink"
              }`}
            >
              {value === "lesson" ? "Lezione" : "Esercizi"}
            </button>
          ))}
        </div>
      )}

      {tab === "lesson" && lesson ? (
        <Card>
          <LessonView
            lesson={lesson}
            skillId={entry.id}
            pending={pending}
            completeLabel="Vai agli esercizi"
            onComplete={() =>
              run(async () => {
                await finishLesson({ skillId: entry.id });
                setTab("practice");
              })
            }
          />
        </Card>
      ) : exercise && exerciseKey ? (
        <Card className="flex flex-col gap-5">
          <p className="text-sm text-ink-soft" data-exercise-ref={JSON.stringify(exercise.ref)}>
            {LEVEL_LABELS[exercise.level]}
          </p>
          {feedback ? (
            <>
              <div className="rounded-2xl bg-canvas px-4 py-3">
                <MathText text={exercise.content.prompt} />
              </div>
              <FeedbackPanel feedback={feedback} onNext={next} pending={pending} />
            </>
          ) : (
            <QuestionCard
              key={exerciseKey}
              item={{ id: exerciseKey, content: exercise.content }}
              pending={pending}
              skipLabel="Non lo so: fammi vedere come si fa"
              onSubmit={(response, timeMs, stats) => answer(exercise, response, timeMs, stats)}
            />
          )}
        </Card>
      ) : (
        <Card>Per questa abilità non ci sono ancora esercizi.</Card>
      )}

      {error && (
        <p role="alert" className="rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
