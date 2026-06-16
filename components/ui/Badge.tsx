import React from "react";

/**
 * Wii Event Malta — Badge.
 * Ticket availability + access states. Pill, mono, uppercase, with a live dot.
 */
type Status = "available" | "limited" | "soldout" | "invite" | "earlybird" | "live";

const map: Record<Status, { c: string; label: string }> = {
  available: { c: "var(--status-available)", label: "Available" },
  limited: { c: "var(--status-limited)", label: "Almost gone" },
  soldout: { c: "var(--ash)", label: "Sold out" },
  invite: { c: "var(--status-invite)", label: "Invite only" },
  earlybird: { c: "var(--status-earlybird)", label: "Early bird" },
  live: { c: "var(--ember-500)", label: "Live now" },
};

export function Badge({
  status = "available",
  children,
  dot = true,
  solid = false,
  style,
}: {
  status?: Status;
  children?: React.ReactNode;
  dot?: boolean;
  solid?: boolean;
  style?: React.CSSProperties;
}) {
  const m = map[status] ?? map.available;
  const label = children ?? m.label;
  const pulse = status === "live" || status === "limited";

  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    height: "26px",
    padding: "0 11px",
    borderRadius: "var(--radius-pill)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.6875rem",
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    lineHeight: 1,
    whiteSpace: "nowrap",
    ...(solid
      ? { background: m.c, color: "var(--void)", border: "1px solid transparent" }
      : { background: "rgba(255,255,255,0.04)", color: m.c, border: `1px solid ${m.c}` }),
    ...style,
  };

  return (
    <span style={base}>
      {dot ? (
        <span
          style={{
            width: "7px",
            height: "7px",
            borderRadius: "999px",
            background: solid ? "var(--void)" : m.c,
            animation: pulse ? "bpulse 1.6s var(--ease-out) infinite" : "none",
          }}
        />
      ) : null}
      {label}
    </span>
  );
}
