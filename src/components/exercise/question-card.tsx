"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCoach } from "@/components/coach";
import { FigureView } from "@/components/figure";
import { MathText } from "@/components/math-text";
import { Button } from "@/components/ui";
import type { ItemContent, ItemResponse } from "@/lib/items/schemas";
import { track } from "@/lib/tracking/client";
import type { AnswerStats, InteractionKind } from "@/lib/tracking/schema";
import { ChoiceQuestion } from "./choice-question";
import { InputQuestion } from "./input-question";
import { OrderQuestion } from "./order-question";

const IDLE_GAP_MS = 30_000;
const HESITATION_MS = 30_000;

const START_HINTS: Record<ItemContent["type"], string> = {
  input: "Non sai da dove partire? Scrivi i dati che hai, anche uno solo: spesso il resto arriva da sé.",
  choice: "Non sai quale scegliere? Prima escludi quelle che di sicuro sono sbagliate.",
  multi_choice: "Guarda le risposte una alla volta e chiediti: questa è vera?",
  order: "Trova prima il passo che viene per primo: poi il resto si mette in fila.",
};

export function QuestionCard({
  item,
  pending,
  onSubmit,
  skipLabel = "Non lo so, vado avanti",
  initialResponse,
}: {
  item: { id: string; content: ItemContent };
  pending: boolean;
  onSubmit: (response: ItemResponse, timeMs: number, stats: AnswerStats) => void;
  skipLabel?: string;
  initialResponse?: ItemResponse;
}) {
  const coach = useCoach();
  const firstTry = initialResponse === undefined;
  const [hint, setHint] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const startedAt = useRef<number | null>(null);
  const lastInteraction = useRef<number | null>(null);
  const hiddenAt = useRef<number | null>(null);
  const stats = useRef<AnswerStats>({
    firstInputMs: null,
    inputs: 0,
    corrections: 0,
    unitChanges: 0,
    idleCount: 0,
    idleMs: 0,
    awayCount: 0,
    awayMs: 0,
  });

  useEffect(() => {
    startedAt.current = performance.now();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = performance.now();
        return;
      }
      if (hiddenAt.current === null) return;
      stats.current.awayCount += 1;
      stats.current.awayMs += Math.round(performance.now() - hiddenAt.current);
      hiddenAt.current = null;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!coach.hesitation || !firstTry) return;
    const timer = setTimeout(() => {
      if (stats.current.firstInputMs !== null || document.visibilityState !== "visible") return;
      setHint(true);
      track("coach", { payload: { kind: "hesitation", action: "shown", item: item.id } });
    }, HESITATION_MS);
    return () => clearTimeout(timer);
  }, [coach.hesitation, firstTry, item.id]);

  const elapsed = () => (startedAt.current === null ? 0 : Math.round(performance.now() - startedAt.current));

  const interact = useCallback((kind: InteractionKind) => {
    const current = stats.current;
    const now = performance.now();
    if (current.firstInputMs === null) {
      current.firstInputMs = startedAt.current === null ? 0 : Math.round(now - startedAt.current);
    } else if (lastInteraction.current !== null && now - lastInteraction.current > IDLE_GAP_MS) {
      current.idleCount += 1;
      current.idleMs += Math.round(now - lastInteraction.current);
    }
    lastInteraction.current = now;
    setHint(false);
    if (kind === "input") current.inputs += 1;
    else if (kind === "correction") current.corrections += 1;
    else current.unitChanges += 1;
  }, []);

  const submit = (response: ItemResponse) => {
    onSubmit(response, elapsed(), { ...stats.current });
  };

  const skip = () => {
    if (coach.skips && firstTry && !confirmSkip && stats.current.inputs + stats.current.corrections === 0) {
      setConfirmSkip(true);
      track("coach", { payload: { kind: "skip", action: "shown", item: item.id } });
      return;
    }
    if (confirmSkip) track("coach", { payload: { kind: "skip", action: "skipped", item: item.id } });
    submit({ type: "skip" });
  };

  const tryFirst = () => {
    setConfirmSkip(false);
    track("coach", { payload: { kind: "skip", action: "tried", item: item.id } });
  };

  const { content } = item;
  const initialFields = initialResponse?.type === "input" ? initialResponse.fields : undefined;
  const initialOptions =
    initialResponse?.type === "choice" ? [initialResponse.option] : initialResponse?.type === "multi_choice" ? initialResponse.options : undefined;
  const initialOrder = initialResponse?.type === "order" ? initialResponse.order : undefined;

  return (
    <div className="flex flex-col gap-6" data-item-id={item.id}>
      <MathText text={content.prompt} className="text-xl leading-relaxed font-medium text-ink" />
      {content.figure && <FigureView figure={content.figure} />}

      {content.type === "input" && (
        <InputQuestion content={content} pending={pending} onSubmit={submit} onInteract={interact} initial={initialFields} />
      )}
      {(content.type === "choice" || content.type === "multi_choice") && (
        <ChoiceQuestion content={content} pending={pending} onSubmit={submit} onInteract={interact} initial={initialOptions} />
      )}
      {content.type === "order" && (
        <OrderQuestion itemId={item.id} content={content} pending={pending} onSubmit={submit} onInteract={interact} initial={initialOrder} />
      )}

      {hint && (
        <p role="status" className="rounded-2xl bg-sun/25 px-4 py-3 text-ink">
          💡 {START_HINTS[content.type]}
        </p>
      )}

      {confirmSkip ? (
        <div role="status" className="flex flex-col gap-3 rounded-2xl border-2 border-sun bg-sun/15 p-4">
          <p className="font-bold text-ink">Prima di arrenderti 💪</p>
          <p className="text-ink-soft">Prova a scrivere il primo passaggio: anche se è sbagliato, ti aiuta a capire.</p>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={tryFirst}>Ci provo</Button>
            <Button variant="secondary" onClick={skip} disabled={pending}>
              Fammi vedere
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" onClick={skip} disabled={pending} className="self-center">
          {skipLabel}
        </Button>
      )}
    </div>
  );
}
