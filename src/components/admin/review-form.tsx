"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import { reviewWriting, type ReviewState } from "@/lib/writing/actions";

const initialState: ReviewState = { error: null };

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function ReviewForm({ id, score, comment }: { id: string; score: number | null; comment: string | null }) {
  const [state, formAction, pending] = useActionState(reviewWriting, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-bold">Voto</legend>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {SCORES.map((value) => (
            <label
              key={value}
              className="flex h-12 cursor-pointer items-center justify-center rounded-2xl border-2 border-line font-display text-lg font-extrabold has-checked:border-brand has-checked:bg-brand-soft has-focus-visible:ring-4 has-focus-visible:ring-brand/18"
            >
              <input type="radio" name="score" value={value} required defaultChecked={score === value} className="sr-only" />
              {value}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Commento per lo studente</span>
        <textarea
          name="comment"
          rows={5}
          maxLength={4000}
          defaultValue={comment ?? ""}
          placeholder="Cosa ha fatto bene, cosa deve ripassare…"
          className="w-full rounded-2xl border-2 border-line bg-surface px-4 py-3 text-base text-ink outline-none placeholder:text-ink-soft/60 focus:border-brand focus:ring-4 focus:ring-brand/18"
        />
      </label>
      {state.error && (
        <p role="alert" className="rounded-2xl bg-bad-soft px-4 py-3 text-sm font-medium text-bad">
          {state.error}
        </p>
      )}
      <Button type="submit" loading={pending} className="w-full">
        {pending ? "Salvo…" : "Salva la correzione"}
      </Button>
    </form>
  );
}
