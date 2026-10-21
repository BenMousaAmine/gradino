"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { submitWriting } from "@/lib/writing/actions";
import { countWords, type WritingPrompt, type WritingStats } from "@/lib/writing/schema";

export function WritingEditor({ prompt, ai }: { prompt: WritingPrompt; ai: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const startedAt = useRef<number | null>(null);
  const hiddenAt = useRef<number | null>(null);
  const stats = useRef<WritingStats>({ pastes: 0, pastedChars: 0, awayMs: 0 });

  useEffect(() => {
    startedAt.current = performance.now();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = performance.now();
      } else if (hiddenAt.current !== null) {
        stats.current.awayMs += Math.round(performance.now() - hiddenAt.current);
        hiddenAt.current = null;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const words = countWords(text);
  const ready = words >= prompt.minWords;

  const submit = () => {
    const timeMs = startedAt.current === null ? 0 : Math.round(performance.now() - startedAt.current);
    setFailed(false);
    startTransition(async () => {
      try {
        const { id } = await submitWriting({ promptId: prompt.id, body: text, timeMs: Math.min(timeMs, 36_000_000), stats: stats.current });
        router.push(`/writing/${id}`);
      } catch {
        setFailed(true);
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-3xl border-2 border-line bg-surface p-5">
        <p className="w-fit rounded-full bg-brand-soft px-3 py-1 text-sm font-bold text-brand-dark">
          {prompt.kind === "email" ? "Email" : "Dialogo"}
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight">{prompt.title}</h1>
        <p>{prompt.task}</p>
        <p className="mt-2 text-sm font-bold">Cosa devi scrivere</p>
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-ink-soft">
          {prompt.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ol>
        <details className="mt-2 rounded-2xl bg-canvas px-4 py-3">
          <summary className="cursor-pointer text-sm font-bold">Frasi utili</summary>
          <ul className="mt-2 flex flex-col gap-1 font-medium" lang="en">
            {prompt.useful.map((phrase) => (
              <li key={phrase}>{phrase}</li>
            ))}
          </ul>
        </details>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-bold">Il tuo testo in inglese</span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onPaste={(event) => {
            stats.current.pastes += 1;
            stats.current.pastedChars += event.clipboardData.getData("text").length;
          }}
          lang="en"
          rows={12}
          maxLength={6000}
          spellCheck={false}
          autoCorrect="off"
          autoComplete="off"
          placeholder={prompt.kind === "email" ? "Hi …," : "A: …\nB: …"}
          className="w-full rounded-2xl border-2 border-line bg-surface px-4 py-3 text-lg leading-relaxed text-ink outline-none placeholder:text-ink-soft/60 focus:border-brand focus:ring-4 focus:ring-brand/18"
        />
      </label>
      <p className={`text-sm font-semibold ${ready ? "text-good" : "text-ink-soft"}`} aria-live="polite">
        {words} {words === 1 ? "parola" : "parole"} · minimo {prompt.minWords}, ideale {prompt.targetWords}
      </p>
      <p className="text-sm text-ink-soft">Scrivi tu, senza traduttore: gli errori servono a capire cosa ripassare.</p>
      {failed && (
        <p role="alert" className="rounded-2xl bg-bad-soft px-4 py-3 text-sm font-medium text-bad">
          Non sono riuscito a consegnare il testo. Riprova.
        </p>
      )}
      <Button onClick={submit} disabled={!ready} loading={pending} className="w-full">
        {pending ? (ai ? "Sto correggendo…" : "Consegno…") : "Consegna"}
      </Button>
    </div>
  );
}
