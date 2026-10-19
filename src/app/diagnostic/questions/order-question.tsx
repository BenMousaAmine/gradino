"use client";

import { useMemo, useState } from "react";
import { MathText } from "@/components/math-text";
import { Button } from "@/components/ui";
import type { ItemContent, ItemResponse, Option } from "@/lib/items/schemas";

type OrderContent = Extract<ItemContent, { type: "order" }>;

function seededRandom(seed: string) {
  let state = 2166136261;
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  return () => {
    state = Math.imul(state ^ (state >>> 15), 2246822507);
    state = Math.imul(state ^ (state >>> 13), 3266489909);
    state ^= state >>> 16;
    return (state >>> 0) / 4294967296;
  };
}

function shuffle(steps: Option[], seed: string): Option[] {
  const random = seededRandom(seed);
  const result = [...steps];
  for (let index = result.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  const unchanged = result.every((step, index) => step.id === steps[index].id);
  return unchanged ? [...result.slice(1), result[0]] : result;
}

export function OrderQuestion({
  itemId,
  content,
  pending,
  onSubmit,
}: {
  itemId: string;
  content: OrderContent;
  pending: boolean;
  onSubmit: (response: ItemResponse) => void;
}) {
  const shuffled = useMemo(() => shuffle(content.steps, itemId), [content.steps, itemId]);
  const [chosen, setChosen] = useState<string[]>([]);
  const byId = new Map(content.steps.map((step) => [step.id, step]));
  const remaining = shuffled.filter((step) => !chosen.includes(step.id));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-ink-soft">Il tuo ordine</p>
        {chosen.length === 0 && (
          <p className="rounded-xl border-2 border-dashed border-line px-4 py-5 text-center text-ink-soft">
            Tocca i passi qui sotto nell’ordine giusto
          </p>
        )}
        {chosen.map((id, index) => (
          <button
            key={id}
            type="button"
            onClick={() => setChosen((previous) => previous.filter((value) => value !== id))}
            className="flex min-h-14 items-center gap-3 rounded-xl border-2 border-brand bg-brand-soft px-4 py-3 text-left text-lg"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-base font-bold text-white">
              {index + 1}
            </span>
            <MathText text={byId.get(id)?.text ?? ""} />
          </button>
        ))}
      </div>

      {remaining.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-ink-soft">Passi da sistemare</p>
          {remaining.map((step) => (
            <button
              key={step.id}
              data-step-id={step.id}
              type="button"
              onClick={() => setChosen((previous) => [...previous, step.id])}
              className="flex min-h-14 items-center rounded-xl border-2 border-line bg-surface px-4 py-3 text-left text-lg"
            >
              <MathText text={step.text} />
            </button>
          ))}
        </div>
      )}

      <Button
        onClick={() => onSubmit({ type: "order", order: chosen })}
        disabled={pending || remaining.length > 0}
        className="w-full"
      >
        Conferma
      </Button>
    </div>
  );
}
