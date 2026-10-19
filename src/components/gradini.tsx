const STEP_COLORS = ["bg-step-1", "bg-step-2", "bg-step-3"];
const HEIGHTS = ["h-2", "h-3.5", "h-5"];

export function Gradini({ steps, mastered = false }: { steps: number; mastered?: boolean }) {
  return (
    <span className="inline-flex items-end gap-0.5" aria-label={`${steps} gradini su 3`} role="img">
      {STEP_COLORS.map((color, index) => (
        <span key={color} className={`w-2.5 rounded-sm ${HEIGHTS[index]} ${index < steps ? color : "bg-line"}`} />
      ))}
      {mastered && <span className="ml-1 text-sm font-bold text-good">✓</span>}
    </span>
  );
}
