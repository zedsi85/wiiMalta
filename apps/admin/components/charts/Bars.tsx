"use client";

import { useState } from "react";

/**
 * Single-series vertical bar chart (SVG). Mark color #ff4d1f — validated
 * against the charcoal surface (dataviz six-checks). One measure → one hue,
 * no legend (the title names the series). Hover: per-bar tooltip with a hit
 * target wider than the mark. Text wears text tokens only.
 */
export interface BarsPoint {
  label: string;
  value: number;
}

const EMBER = "#ff4d1f";

export function Bars({
  data,
  format = (v) => String(v),
  height = 160,
  emptyText = "No data yet",
}: {
  data: BarsPoint[];
  format?: (v: number) => string;
  height?: number;
  emptyText?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) {
    return (
      <div className="grid h-32 place-items-center font-mono text-xs text-ash">{emptyText}</div>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 100; // viewBox percent-ish units
  const gap = Math.min(2, (W / data.length) * 0.15);
  const barW = W / data.length - gap;
  const plotH = height - 34; // room for x labels
  const y = (v: number) => (v / max) * (plotH - 14); // headroom for value label

  // Selective direct labels: max point only (plus hovered)
  const maxIdx = data.findIndex((d) => d.value === Math.max(...data.map((x) => x.value)));
  const labelEvery = Math.ceil(data.length / 8);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${height}`}
        preserveAspectRatio="none"
        className="block w-full"
        style={{ height }}
        role="img"
      >
        {/* recessive gridlines */}
        {[0.5, 1].map((f) => (
          <line
            key={f}
            x1={0}
            x2={W}
            y1={plotH - y(max * f)}
            y2={plotH - y(max * f)}
            stroke="var(--slate)"
            strokeWidth={0.3}
          />
        ))}
        {data.map((d, i) => {
          const h = Math.max(d.value > 0 ? 1.5 : 0, y(d.value));
          const x = i * (barW + gap) + gap / 2;
          return (
            <g key={i}>
              {/* rounded data-end anchored to baseline: rounded rect clipped at bottom */}
              {d.value > 0 && (
                <path
                  d={`M ${x} ${plotH} v ${-(h - 1.2)} q 0 -1.2 1.2 -1.2 h ${barW - 2.4} q 1.2 0 1.2 1.2 v ${h - 1.2} z`}
                  fill={EMBER}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              )}
              {/* hit target wider than the mark */}
              <rect
                x={i * (barW + gap)}
                y={0}
                width={barW + gap}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          );
        })}
      </svg>
      {/* x labels (thinned) + selective value label */}
      <div className="flex">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center font-mono text-[0.5625rem] text-ash">
            {i % labelEvery === 0 ? d.label : ""}
          </div>
        ))}
      </div>
      {(hover !== null || maxIdx >= 0) && (
        <Tooltip
          data={data}
          index={hover ?? maxIdx}
          format={format}
          pinned={hover === null}
          plotH={plotH}
          height={height}
          max={max}
        />
      )}
    </div>
  );
}

function Tooltip({
  data,
  index,
  format,
  pinned,
  plotH,
  max,
}: {
  data: BarsPoint[];
  index: number;
  format: (v: number) => string;
  pinned: boolean;
  plotH: number;
  height: number;
  max: number;
}) {
  const d = data[index];
  if (!d || (pinned && d.value === 0)) return null;
  const left = ((index + 0.5) / data.length) * 100;
  const bottom = plotH ? (d.value / max) * (plotH - 14) + 40 : 40;
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-md border border-slate bg-void/95 px-2 py-1 text-center shadow-md"
      style={{ left: `${Math.min(92, Math.max(8, left))}%`, bottom }}
    >
      <div className="font-mono text-[0.625rem] text-fog">{d.label}</div>
      <div className="text-sm font-bold tabular-nums text-bone">{format(d.value)}</div>
    </div>
  );
}
