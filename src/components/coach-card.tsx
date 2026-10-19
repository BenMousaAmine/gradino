import Link from "next/link";
import { buttonClass } from "@/components/ui";
import type { Tip } from "@/lib/insights/tips";

export function CoachCard({ tip, cheer }: { tip: Tip | null; cheer: Tip | null }) {
  if (!tip && !cheer) return null;
  return (
    <section className="flex flex-col gap-4 rounded-3xl border-2 border-sun bg-surface p-5">
      <p className="w-fit rounded-full bg-sun px-3 py-1 text-sm font-bold text-ink">💡 Il consiglio di oggi</p>
      {tip && (
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-extrabold">{tip.title}</h2>
          <p className="text-ink-soft">{tip.body}</p>
        </div>
      )}
      {tip?.action && (
        <Link href={tip.action.href} className={`${buttonClass("secondary")} w-full`}>
          {tip.action.label}
        </Link>
      )}
      {cheer && (
        <p className="rounded-2xl bg-good-soft px-4 py-3 text-good">
          <span className="font-bold">{cheer.title}</span> {cheer.body}
        </p>
      )}
    </section>
  );
}
