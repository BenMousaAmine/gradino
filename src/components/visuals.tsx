import { FigureView } from "@/components/figure";
import { MathText } from "@/components/math-text";
import type { Visual } from "@/lib/lessons/schema";

function FractionBars({ bars }: { bars: Extract<Visual, { type: "fraction-bars" }>["bars"] }) {
  return (
    <div className="flex flex-col gap-3">
      {bars.map((bar, index) => (
        <div key={index} className="flex items-center gap-3">
          {bar.label && <MathText text={bar.label} className="w-20 shrink-0 text-right text-lg" />}
          <div className="flex h-10 flex-1 gap-1">
            {Array.from({ length: bar.denominator }, (_, part) => (
              <div
                key={part}
                className={`flex-1 rounded-md border-2 ${part < bar.numerator ? "border-brand bg-brand" : "border-line bg-surface"}`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DecimalGrid({ filled, label }: { filled: number; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="grid w-full max-w-56 grid-cols-10 gap-0.5 rounded-xl border-2 border-ink p-0.5">
        {Array.from({ length: 100 }, (_, cell) => (
          <div key={cell} className={`aspect-square rounded-[2px] ${cell < filled ? "bg-brand" : "bg-line/60"}`} />
        ))}
      </div>
      {label && <MathText text={label} className="text-lg" />}
    </div>
  );
}

export function VisualView({ visual }: { visual: Visual }) {
  return (
    <div className="rounded-2xl bg-canvas p-4">
      {visual.type === "fraction-bars" && <FractionBars bars={visual.bars} />}
      {visual.type === "decimal-grid" && <DecimalGrid filled={visual.filled} label={visual.label} />}
      {visual.type === "figure" && <FigureView figure={visual.figure} />}
    </div>
  );
}
