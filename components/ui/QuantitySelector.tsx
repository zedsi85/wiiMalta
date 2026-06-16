"use client";

import React from "react";

/**
 * Wii Event Malta — QuantitySelector.
 * Stepper for ticket quantity. Controlled or uncontrolled.
 */
export function QuantitySelector({
  value,
  defaultValue = 0,
  min = 0,
  max = 10,
  onChange,
  size = "md",
  style,
}: {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  onChange?: (n: number) => void;
  size?: "sm" | "md";
  style?: React.CSSProperties;
}) {
  const [internal, setInternal] = React.useState(defaultValue);
  const v = value != null ? value : internal;

  const set = (next: number) => {
    const clamped = Math.max(min, Math.min(max, next));
    if (value == null) setInternal(clamped);
    onChange?.(clamped);
  };

  const dim = size === "sm" ? 32 : 40;
  const btn = (label: string, onClick: () => void, disabled: boolean) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label === "−" ? "decrease" : "increase"}
      data-cursor
      style={{
        width: dim,
        height: dim,
        flex: "0 0 auto",
        display: "grid",
        placeItems: "center",
        background: "transparent",
        border: "none",
        color: disabled ? "var(--text-faint)" : "var(--text-strong)",
        fontFamily: "var(--font-mono)",
        fontSize: size === "sm" ? "1rem" : "1.25rem",
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "var(--t-hover)",
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.color = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        if (!disabled) e.currentTarget.style.color = "var(--text-strong)";
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-pill)",
        background: "var(--surface-2)",
        ...style,
      }}
    >
      {btn("−", () => set(v - 1), v <= min)}
      <span
        style={{
          minWidth: size === "sm" ? 24 : 30,
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontSize: size === "sm" ? "0.875rem" : "1rem",
          fontWeight: 700,
          color: "var(--text-strong)",
        }}
      >
        {v}
      </span>
      {btn("+", () => set(v + 1), v >= max)}
    </div>
  );
}
