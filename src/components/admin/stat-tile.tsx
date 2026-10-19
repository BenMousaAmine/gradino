export function StatTile({
  label,
  value,
  delta,
  upIsGood = true,
}: {
  label: string;
  value: string;
  delta?: number | null;
  upIsGood?: boolean;
}) {
  const showDelta = delta !== undefined && delta !== null && delta !== 0;
  const good = showDelta && (delta > 0) === upIsGood;
  return (
    <div className="flex flex-col gap-1 rounded-2xl border-2 border-line bg-surface p-4">
      <span className="text-sm text-ink-soft">{label}</span>
      <span className="font-display text-3xl font-extrabold text-ink">{value}</span>
      {showDelta && (
        <span className={`text-sm font-semibold ${good ? "text-good" : "text-bad"}`}>
          {delta > 0 ? "▲" : "▼"} {delta > 0 ? "+" : ""}
          {delta} rispetto alla settimana prima
        </span>
      )}
    </div>
  );
}
