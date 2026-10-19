"use client";

import { useEffect, useRef } from "react";
import { MathText } from "@/components/math-text";
import { Button } from "@/components/ui";
import type { PublicItem } from "@/lib/assessments/view";
import type { ItemResponse } from "@/lib/items/schemas";
import { ChoiceQuestion } from "./questions/choice-question";
import { InputQuestion } from "./questions/input-question";
import { OrderQuestion } from "./questions/order-question";

export function QuestionCard({
  item,
  pending,
  onSubmit,
}: {
  item: PublicItem;
  pending: boolean;
  onSubmit: (response: ItemResponse, timeMs: number) => void;
}) {
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    startedAt.current = performance.now();
  }, []);

  const submit = (response: ItemResponse) => {
    const elapsed = startedAt.current === null ? 0 : performance.now() - startedAt.current;
    onSubmit(response, Math.round(elapsed));
  };

  const { content } = item;

  return (
    <div className="flex flex-col gap-6" data-item-id={item.id}>
      <MathText text={content.prompt} className="text-xl leading-relaxed font-medium text-ink" />

      {content.type === "input" && <InputQuestion content={content} pending={pending} onSubmit={submit} />}
      {(content.type === "choice" || content.type === "multi_choice") && (
        <ChoiceQuestion content={content} pending={pending} onSubmit={submit} />
      )}
      {content.type === "order" && (
        <OrderQuestion itemId={item.id} content={content} pending={pending} onSubmit={submit} />
      )}

      <Button variant="ghost" onClick={() => submit({ type: "skip" })} disabled={pending} className="self-center">
        Non lo so, vado avanti
      </Button>
    </div>
  );
}
