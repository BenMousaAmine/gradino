import type { Insight } from "@/lib/insights/report";

const TONES: Record<Insight["tone"], { dot: string; label: string }> = {
  bad: { dot: "bg-step-1", label: "Da seguire" },
  warn: { dot: "bg-step-2", label: "Da tenere d’occhio" },
  info: { dot: "bg-sky", label: "Da sapere" },
  good: { dot: "bg-step-3", label: "Va bene" },
};

export function InsightList({ insights, empty }: { insights: Insight[]; empty: string }) {
  if (insights.length === 0) return <p className="text-ink-soft">{empty}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {insights.map((insight) => (
        <li key={insight.id} className="flex flex-col gap-2 rounded-2xl bg-canvas p-4">
          <div className="flex items-start gap-3">
            <span role="img" aria-label={TONES[insight.tone].label} className={`mt-1.5 size-3 shrink-0 rounded-full ${TONES[insight.tone].dot}`} />
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-ink">{insight.title}</p>
              <p className="text-sm text-ink-soft">{insight.detail}</p>
            </div>
          </div>
          {(insight.todo || insight.product) && (
            <div className="grid grid-cols-1 gap-2 pl-6 text-sm sm:grid-cols-2">
              {insight.todo && (
                <p className="rounded-xl bg-surface px-3 py-2">
                  <span className="font-semibold">Cosa puoi fare tu:</span> {insight.todo}
                </p>
              )}
              {insight.product && (
                <p className="rounded-xl bg-surface px-3 py-2">
                  <span className="font-semibold">Nell’app:</span> {insight.product}
                </p>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
