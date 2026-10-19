"use client";

import { useCallback, useEffect, useRef } from "react";
import { FigureView } from "@/components/figure";
import { MathText } from "@/components/math-text";
import { Button } from "@/components/ui";
import type { ItemContent, ItemResponse } from "@/lib/items/schemas";
import type { AnswerStats, InteractionKind } from "@/lib/tracking/schema";
import { ChoiceQuestion } from "./choice-question";
import { InputQuestion } from "./input-question";
import { OrderQuestion } from "./order-question";

const IDLE_GAP_MS = 30_000;

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
    if (kind === "input") current.inputs += 1;
    else if (kind === "correction") current.corrections += 1;
    else current.unitChanges += 1;
  }, []);

  const submit = (response: ItemResponse) => {
    onSubmit(response, elapsed(), { ...stats.current });
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

      <Button variant="ghost" onClick={() => submit({ type: "skip" })} disabled={pending} className="self-center">
        {skipLabel}
      </Button>
    </div>
  );
}
