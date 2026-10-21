"use client";

import { useEffect } from "react";
import { MathText } from "@/components/math-text";
import type { Trick } from "@/lib/insights/tricks";
import { track } from "@/lib/tracking/client";

const HEADINGS = {
  exercise: "💡 Il trucco",
  hint: "💡 Prova con il trucco",
  feedback: "💡 Il trucco per la prossima volta",
} as const;

export function TrickCard({ trick, where, item }: { trick: Trick; where: keyof typeof HEADINGS; item: string }) {
  useEffect(() => {
    track("coach", { payload: { kind: "trick", action: "shown", trick: trick.id, where, item } });
  }, [trick.id, where, item]);

  return (
    <aside className="flex flex-col gap-1.5 rounded-2xl border-2 border-sun bg-sun/15 px-4 py-3">
      <p className="text-sm font-bold text-ink">
        {HEADINGS[where]}: {trick.title}
      </p>
      <MathText text={trick.body} className="block text-ink" />
      {trick.example && <MathText text={trick.example} className="block font-medium text-ink-soft" />}
    </aside>
  );
}
