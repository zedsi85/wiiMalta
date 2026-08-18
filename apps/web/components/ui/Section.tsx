import React from "react";
import { SectionLabel } from "./SectionLabel";

/**
 * Wii Event Malta — layout primitives for the inner (non-cinematic) pages.
 * Mirror the design-system spacing rhythm and editorial whitespace.
 */
export function Section({
  children,
  max = "var(--container)",
  pad = true,
  style,
  id,
}: {
  children: React.ReactNode;
  max?: string;
  pad?: boolean;
  style?: React.CSSProperties;
  id?: string;
}) {
  return (
    <section id={id} style={{ padding: pad ? "var(--section-y) var(--gutter)" : 0, ...style }}>
      <div style={{ maxWidth: max, margin: "0 auto" }}>{children}</div>
    </section>
  );
}

export function SectionHead({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 24,
        flexWrap: "wrap",
        marginBottom: "var(--space-7)",
      }}
    >
      <div>
        {eyebrow ? <SectionLabel style={{ marginBottom: 14 }}>{eyebrow}</SectionLabel> : null}
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontSize: "clamp(2rem,4.5vw,3.5rem)",
            textTransform: "uppercase",
            letterSpacing: "-0.02em",
            lineHeight: 0.95,
            color: "var(--text-strong)",
          }}
        >
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

/** A clearly-marked image/video placeholder zone — replace with real footage. */
export function MediaSlot({
  tint,
  src,
  alt = "",
  label = "Event footage",
  aspect,
  grain = true,
  children,
  style,
}: {
  tint?: string;
  /** Real artwork (poster/photo). Renders as a cover image; label is hidden. */
  src?: string;
  alt?: string;
  label?: string;
  aspect?: string;
  grain?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={grain ? "wii-grain" : ""}
      style={{ position: "relative", overflow: "hidden", aspectRatio: aspect, background: tint || "var(--night-wash)", ...style }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%" }}
        />
      ) : null}
      <div style={{ position: "absolute", inset: 0, background: "var(--glow-ember)", opacity: src ? 0.18 : 0.35, pointerEvents: "none" }} />
      {label && !src ? (
        <span
          style={{
            position: "absolute",
            left: 14,
            bottom: 12,
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.4)",
            zIndex: 2,
          }}
        >
          ▦ {label}
        </span>
      ) : null}
      {children}
    </div>
  );
}
