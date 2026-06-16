import React from "react";

/**
 * Wii Event Malta — SectionLabel (a.k.a. "eyebrow").
 * Uppercase mono kicker with wide tracking, ember by default.
 */
export function SectionLabel({
  children,
  color = "var(--ember-500)",
  style,
}: {
  children: React.ReactNode;
  color?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "0.6875rem",
        fontWeight: 700,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
