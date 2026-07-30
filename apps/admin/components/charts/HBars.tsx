"use client";

import { useState } from "react";

/**
 * Single-series horizontal bars — magnitude across named categories
 * (revenue by tier). One hue (#ff4d1f, validated); category names + values
 * as direct labels in text ink; hover brightens the row.
 */
export interface HBarsPoint {
  label: string;
  value: number;
}

const EMBER = "#ff4d1f";

export function HBars({
  data,
  format = (v) => String(v),
  emptyText = "No data yet",
}: {
  data: HBarsPoint[];
  format?: (v: number) => string;
  emptyText?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) {
    return (
      <div className="grid h-24 place-items-center font-mono text-xs text-ash">{emptyText}</div>
    );
  }
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="grid gap-2.5">
      {data.map((d, i) => (
        <div
          key={d.label}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
          className="grid grid-cols-[7rem_1fr_auto] items-center gap-3"
        >
          <span className="truncate text-right text-xs text-smoke">{d.label}</span>
          <div className="h-4 overflow-hidden rounded-[4px] bg-graphite">
            <div
              className="h-full rounded-[4px] transition-opacity"
              style={{
                width: `${Math.max(d.value > 0 ? 2 : 0, (d.value / max) * 100)}%`,
                background: EMBER,
                opacity: hover === null || hover === i ? 1 : 0.45,
              }}
            />
          </div>
          <span className="font-mono text-xs tabular-nums text-bone">{format(d.value)}</span>
        </div>
      ))}
    </div>
  );
}
