"use client";

import React from "react";
import { pad } from "@/lib/utils";

/**
 * Wii Event Malta — Countdown.
 * Live countdown to the next event. Mono digits in segmented blocks.
 * Hydration-safe: starts blank until mounted to avoid SSR/client mismatch.
 */
export function Countdown({
  target,
  label = "Doors in",
  compact = false,
  style,
}: {
  target: string;
  label?: string;
  compact?: boolean;
  style?: React.CSSProperties;
}) {
  const targetTime = React.useMemo(() => new Date(target).getTime(), [target]);
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = now == null ? 0 : Math.max(0, targetTime - now);
  const units = [
    { v: Math.floor(diff / 86400000), l: "Days" },
    { v: Math.floor((diff % 86400000) / 3600000), l: "Hrs" },
    { v: Math.floor((diff % 3600000) / 60000), l: "Min" },
    { v: Math.floor((diff % 60000) / 1000), l: "Sec" },
  ];

  return (
    <div style={style}>
      {label ? (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.625rem",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--ember-500)",
            marginBottom: 10,
          }}
        >
          {label}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: compact ? 8 : 12 }}>
        {units.map((u) => (
          <div
            key={u.l}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              minWidth: compact ? 48 : 64,
              padding: compact ? "10px 8px" : "16px 12px",
              background: "var(--surface-2)",
              border: "1px solid var(--border-soft)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 900,
                fontSize: compact ? "1.5rem" : "2.25rem",
                lineHeight: 1,
                color: "var(--text-strong)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {now == null ? "––" : pad(u.v)}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.5625rem",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--text-faint)",
              }}
            >
              {u.l}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
