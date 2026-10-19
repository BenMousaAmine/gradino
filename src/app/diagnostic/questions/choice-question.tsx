"use client";

import { useState } from "react";
import { MathText } from "@/components/math-text";
import { Button } from "@/components/ui";
import type { ItemContent, ItemResponse } from "@/lib/items/schemas";

type ChoiceContent = Extract<ItemContent, { type: "choice" | "multi_choice" }>;

export function ChoiceQuestion({
  content,
  pending,
  onSubmit,
}: {
  content: ChoiceContent;
  pending: boolean;
  onSubmit: (response: ItemResponse) => void;
}) {
  const multiple = content.type === "multi_choice";
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    if (!multiple) {
      setSelected([id]);
      return;
    }
    setSelected((previous) => (previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id]));
  };

  const submit = () => {
    onSubmit(multiple ? { type: "multi_choice", options: selected } : { type: "choice", option: selected[0] });
  };

  return (
    <div className="flex flex-col gap-3">
      {content.options.map((option) => {
        const active = selected.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => toggle(option.id)}
            aria-pressed={active}
            data-option-id={option.id}
            className={`flex min-h-14 items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-lg transition ${
              active ? "border-brand bg-brand-soft" : "border-line bg-surface"
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center border-2 ${
                multiple ? "rounded-md" : "rounded-full"
              } ${active ? "border-brand bg-brand" : "border-line"}`}
            >
              {active && <span className={`h-2.5 w-2.5 bg-white ${multiple ? "rounded-sm" : "rounded-full"}`} />}
            </span>
            <MathText text={option.text} />
          </button>
        );
      })}
      <Button onClick={submit} disabled={pending || selected.length === 0} className="mt-2 w-full">
        Conferma
      </Button>
    </div>
  );
}
