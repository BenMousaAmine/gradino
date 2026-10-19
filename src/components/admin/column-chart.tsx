"use client";

import { useState } from "react";

export type ColumnPoint = { label: string; value: number | null; detail: string };

const WIDTH = 640;
const HEIGHT = 200;
const LEFT = 36;
const RIGHT = 8;
const TOP = 14;
const BOTTOM = 28;

function niceMax(value: number): number {
  if (value <= 10) return 10;
  const power = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) if (step * power >= value) return step * power;
  return 10 * power;
}

function columnPath(x: number, y: number, width: number, height: number): string {
  const radius = Math.min(4, width / 2, height);
  return `M${x},${y + height} V${y + radius} Q${x},${y} ${x + radius},${y} H${x + width - radius} Q${x + width},${y} ${x + width},${y + radius} V${y + height} Z`;
}

export function ColumnChart({
  title,
  points,
  unit,
  max,
}: {
  title: string;
  points: ColumnPoint[];
  unit: string;
  max?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const plotWidth = WIDTH - LEFT - RIGHT;
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const peak = max ?? niceMax(Math.max(0, ...points.map((point) => point.value ?? 0)));
  const ticks = [0, peak / 2, peak];
  const slot = plotWidth / Math.max(points.length, 1);
  const barWidth = Math.min(24, slot * 0.62);
  const labelEvery = Math.max(1, Math.ceil(points.length / 8));
  const scale = (value: number) => (value / peak) * plotHeight;
  const activePoint = active === null ? null : points[active];

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm font-semibold text-ink">{title}</figcaption>
      <div className="relative">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="group" aria-label={title}>
          {ticks.map((tick) => {
            const y = TOP + plotHeight - scale(tick);
            return (
              <g key={tick}>
                <line x1={LEFT} x2={WIDTH - RIGHT} y1={y} y2={y} className="stroke-line" strokeWidth={1} />
                <text x={LEFT - 6} y={y} textAnchor="end" dominantBaseline="middle" fontSize={11} className="fill-ink-soft">
                  {Math.round(tick)}
                </text>
              </g>
            );
          })}
          {points.map((point, index) => {
            const x = LEFT + slot * index + (slot - barWidth) / 2;
            const height = point.value === null ? 0 : Math.max(point.value > 0 ? 2 : 0, scale(point.value));
            const y = TOP + plotHeight - height;
            return (
              <g
                key={point.label}
                tabIndex={0}
                role="img"
                aria-label={`${point.label}: ${point.value === null ? "nessun dato" : `${point.value} ${unit}`}`}
                onPointerEnter={() => setActive(index)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                className="outline-none"
              >
                <rect x={LEFT + slot * index} y={TOP} width={slot} height={plotHeight} fill="transparent" />
                {height > 0 && (
                  <path d={columnPath(x, y, barWidth, height)} className={active === index ? "fill-brand-dark" : "fill-brand"} />
                )}
                {index % labelEvery === 0 && (
                  <text x={LEFT + slot * index + slot / 2} y={HEIGHT - 8} textAnchor="middle" fontSize={11} className="fill-ink-soft">
                    {point.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {activePoint && active !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-2xl border-2 border-line bg-surface px-3 py-2 text-sm shadow-lg"
            style={{ left: `${((LEFT + slot * active + slot / 2) / WIDTH) * 100}%` }}
          >
            <p className="font-bold text-ink">{activePoint.value === null ? "—" : `${activePoint.value} ${unit}`}</p>
            <p className="text-ink-soft">{activePoint.detail}</p>
          </div>
        )}
      </div>
      <details className="text-sm text-ink-soft">
        <summary className="cursor-pointer">Vedi i valori in tabella</summary>
        <table className="mt-2 w-full text-left">
          <tbody>
            {points.map((point) => (
              <tr key={point.label} className="border-t border-line">
                <td className="py-1 pr-3">{point.detail}</td>
                <td className="py-1 text-right tabular-nums text-ink">{point.value === null ? "—" : `${point.value} ${unit}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
