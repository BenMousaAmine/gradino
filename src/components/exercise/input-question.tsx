"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { applyKey, Keypad, keyFromKeyboard, type KeypadKey } from "@/components/keypad";
import { MathText } from "@/components/math-text";
import { Button } from "@/components/ui";
import type { Field, FieldResponse, ItemContent, ItemResponse } from "@/lib/items/schemas";
import type { InteractionKind } from "@/lib/tracking/schema";

type InputContent = Extract<ItemContent, { type: "input" }>;
type SlotPart = "value" | "numerator" | "denominator";
type Slot = { fieldId: string; part: SlotPart };

function slotsFor(fields: Field[]): Slot[] {
  return fields.flatMap((field): Slot[] =>
    field.kind === "number"
      ? [{ fieldId: field.id, part: "value" }]
      : [
          { fieldId: field.id, part: "numerator" },
          { fieldId: field.id, part: "denominator" },
        ],
  );
}

function initialValues(fields: Field[]): Record<string, FieldResponse> {
  return Object.fromEntries(
    fields.map((field): [string, FieldResponse] => [
      field.id,
      field.kind === "number" ? { kind: "number", value: "" } : { kind: "fraction", numerator: "", denominator: "" },
    ]),
  );
}

function readSlot(value: FieldResponse, part: SlotPart): string {
  if (value.kind === "number") return value.value;
  return part === "denominator" ? value.denominator : value.numerator;
}

function writeSlot(value: FieldResponse, part: SlotPart, text: string): FieldResponse {
  if (value.kind === "number") return { ...value, value: text };
  return part === "denominator" ? { ...value, denominator: text } : { ...value, numerator: text };
}

function SlotBox({ text, active, onSelect, label }: { text: string; active: boolean; onSelect: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={label}
      className={`flex h-14 min-w-20 items-center justify-center rounded-2xl border-2 px-3 font-display text-2xl font-extrabold tabular-nums transition ${
        active ? "border-brand bg-brand-soft ring-4 ring-brand/18" : "border-line bg-surface"
      }`}
    >
      {text === "" ? <span className="text-ink-soft/40">?</span> : text}
      {active && <span className="ml-0.5 h-7 w-0.5 animate-pulse bg-brand" />}
    </button>
  );
}

export function InputQuestion({
  content,
  pending,
  onSubmit,
  onInteract,
}: {
  content: InputContent;
  pending: boolean;
  onSubmit: (response: ItemResponse) => void;
  onInteract?: (kind: InteractionKind) => void;
}) {
  const [slots] = useState(() => slotsFor(content.fields));
  const [values, setValues] = useState(() => initialValues(content.fields));
  const [activeIndex, setActiveIndex] = useState(0);
  const [remaining, setRemaining] = useState(content.timeLimitSec ?? null);
  const submitted = useRef(false);

  const submit = useCallback(() => {
    if (submitted.current) return;
    submitted.current = true;
    onSubmit({ type: "input", fields: values });
  }, [onSubmit, values]);

  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);

  useEffect(() => {
    const limit = content.timeLimitSec;
    if (!limit) return;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const left = Math.max(0, limit - Math.floor((Date.now() - startedAt) / 1000));
      setRemaining(left);
      if (left === 0) {
        clearInterval(timer);
        submitRef.current();
      }
    }, 250);
    return () => clearInterval(timer);
  }, [content.timeLimitSec]);

  const press = useCallback(
    (key: KeypadKey) => {
      if (key === "next") {
        if (activeIndex < slots.length - 1) setActiveIndex(activeIndex + 1);
        else submitRef.current();
        return;
      }
      onInteract?.(key === "backspace" ? "correction" : "input");
      const slot = slots[activeIndex];
      setValues((previous) => {
        const current = previous[slot.fieldId];
        const text = applyKey(readSlot(current, slot.part), key, current.kind === "number");
        return { ...previous, [slot.fieldId]: writeSlot(current, slot.part, text) };
      });
    },
    [activeIndex, slots, onInteract],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = keyFromKeyboard(event);
      if (!key) return;
      event.preventDefault();
      press(key);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [press]);

  const setUnit = (fieldId: string, unit: string) => {
    onInteract?.("unit");
    setValues((previous) => {
      const current = previous[fieldId];
      if (current.kind !== "number") return previous;
      return { ...previous, [fieldId]: { ...current, unit: current.unit === unit ? undefined : unit } };
    });
  };

  const activeSlot = slots[activeIndex];
  const activeField = content.fields.find((field) => field.id === activeSlot.fieldId);
  const isDrill = content.fields.length > 4;
  const isActive = (fieldId: string, part: SlotPart) =>
    activeSlot.fieldId === fieldId && activeSlot.part === part;
  const select = (fieldId: string, part: SlotPart) =>
    setActiveIndex(slots.findIndex((slot) => slot.fieldId === fieldId && slot.part === part));

  return (
    <div className="flex flex-col gap-5">
      {remaining !== null && (
        <div
          className={`self-start rounded-full px-3 py-1 text-sm font-bold tabular-nums ${
            remaining <= 10 ? "bg-bad-soft text-bad" : "bg-brand-soft text-brand-dark"
          }`}
        >
          {remaining} secondi
        </div>
      )}

      <div className={isDrill ? "grid grid-cols-2 gap-3" : "flex flex-col gap-4"}>
        {content.fields.map((field) => {
          const value = values[field.id];
          return (
            <div key={field.id} className="flex flex-col gap-2" data-field-id={field.id}>
              <div className={`flex flex-wrap items-center gap-3 ${isDrill ? "justify-between" : ""}`}>
                {field.label && <MathText text={field.label} className="text-lg font-medium" />}
                {value.kind === "number" ? (
                  <SlotBox
                    text={value.value}
                    active={isActive(field.id, "value")}
                    onSelect={() => select(field.id, "value")}
                    label={field.label || "risposta"}
                  />
                ) : (
                  <div className="flex flex-col items-stretch gap-1.5">
                    <SlotBox
                      text={value.numerator}
                      active={isActive(field.id, "numerator")}
                      onSelect={() => select(field.id, "numerator")}
                      label="numeratore"
                    />
                    <div className="h-0.5 rounded bg-ink" />
                    <SlotBox
                      text={value.denominator}
                      active={isActive(field.id, "denominator")}
                      onSelect={() => select(field.id, "denominator")}
                      label="denominatore"
                    />
                  </div>
                )}
                {field.kind === "number" && field.suffix && (
                  <span className="text-lg font-medium text-ink-soft">{field.suffix}</span>
                )}
              </div>
              {field.kind === "number" && field.units && value.kind === "number" && (
                <div className="flex flex-wrap gap-2" role="group" aria-label="unità di misura">
                  {field.units.map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => setUnit(field.id, unit)}
                      className={`h-10 min-w-14 rounded-xl border-2 px-3 text-base font-bold transition ${
                        value.unit === unit ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink"
                      }`}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Keypad
        onKey={press}
        allowDecimal={activeField?.kind === "number"}
        showNext={slots.length > 1}
        disabled={pending}
      />

      <Button onClick={submit} disabled={pending} className="w-full">
        Conferma
      </Button>
    </div>
  );
}
