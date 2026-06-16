"use client";

import React from "react";

/**
 * Wii Event Malta — Tag.
 * Music-style / genre / meta chips. Quiet by default; ember when active.
 */
export function Tag({
  children,
  active = false,
  size = "md",
  onClick,
  style,
}: {
  children: React.ReactNode;
  active?: boolean;
  size?: "sm" | "md";
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  const sizes = {
    sm: { h: "24px", px: "10px", fs: "0.6875rem" },
    md: { h: "30px", px: "14px", fs: "0.75rem" },
  } as const;
  const s = sizes[size];

  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    height: s.h,
    padding: `0 ${s.px}`,
    borderRadius: "var(--radius-pill)",
    fontFamily: "var(--font-mono)",
    fontSize: s.fs,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    cursor: onClick ? "pointer" : "default",
    transition: "var(--t-hover)",
    border: active ? "1px solid var(--accent)" : "1px solid var(--border-strong)",
    background: active ? "var(--accent)" : "transparent",
    color: active ? "var(--on-accent)" : "var(--text-muted)",
    ...style,
  };

  return (
    <button
      type="button"
      style={base}
      onClick={onClick}
      data-cursor
      onMouseEnter={(e) => {
        if (active) return;
        e.currentTarget.style.borderColor = "var(--text)";
        e.currentTarget.style.color = "var(--text-strong)";
      }}
      onMouseLeave={(e) => {
        if (active) return;
        e.currentTarget.style.borderColor = "var(--border-strong)";
        e.currentTarget.style.color = "var(--text-muted)";
      }}
    >
      {children}
    </button>
  );
}
