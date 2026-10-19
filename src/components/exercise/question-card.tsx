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

export function QuestionCard({
  item,
  pending,
  onSubmit,
  skipLabel = "Non lo so, vado avanti",
}: {
  item: { id: string; content: ItemContent };
  pending: boolean;
  onSubmit: (response: ItemResponse, timeMs: number, stats: AnswerStats) => void;
  skipLabel?: string;
}) {
  const startedAt = useRef<number | null>(null);
  const stats = useRef<AnswerStats>({ firstInputMs: null, inputs: 0, corrections: 0, unitChanges: 0 });

  useEffect(() => {
    startedAt.current = performance.now();
  }, []);

  const elapsed = () => (startedAt.current === null ? 0 : Math.round(performance.now() - startedAt.current));

  const interact = useCallback((kind: InteractionKind) => {
    const current = stats.current;
    if (current.firstInputMs === null) {
      current.firstInputMs = startedAt.current === null ? 0 : Math.round(performance.now() - startedAt.current);
    }
    if (kind === "input") current.inputs += 1;
    else if (kind === "correction") current.corrections += 1;
    else current.unitChanges += 1;
  }, []);

  const submit = (response: ItemResponse) => {
    onSubmit(response, elapsed(), { ...stats.current });
  };

  const { content } = item;

  return (
    <div className="flex flex-col gap-6" data-item-id={item.id}>
      <MathText text={content.prompt} className="text-xl leading-relaxed font-medium text-ink" />
      {content.figure && <FigureView figure={content.figure} />}

      {content.type === "input" && (
        <InputQuestion content={content} pending={pending} onSubmit={submit} onInteract={interact} />
      )}
      {(content.type === "choice" || content.type === "multi_choice") && (
        <ChoiceQuestion content={content} pending={pending} onSubmit={submit} onInteract={interact} />
      )}
      {content.type === "order" && (
        <OrderQuestion itemId={item.id} content={content} pending={pending} onSubmit={submit} onInteract={interact} />
      )}

      <Button variant="ghost" onClick={() => submit({ type: "skip" })} disabled={pending} className="self-center">
        {skipLabel}
      </Button>
    </div>
  );
}
