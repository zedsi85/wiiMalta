import React from "react";
import { qrCells } from "@/lib/qr";

/**
 * Wii Event Malta — QRTicket.
 * Ticket stub with a stylized QR + wallet CTAs. Concept preview, NOT scannable.
 * The matrix is a deterministic pseudo-QR derived from a seed (see lib/qr).
 */
const QR_N = 21;

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: "0.5625rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ash)" }}>
        {label}
      </div>
      <div style={{ fontWeight: 700, marginTop: 1 }}>{value}</div>
    </div>
  );
}

function WalletBtn({ label }: { label: string }) {
  return (
    <span
      data-cursor
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        height: 30,
        borderRadius: "999px",
        background: "var(--ink)",
        color: "var(--bone)",
        fontSize: "0.625rem",
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        cursor: "pointer",
      }}
    >
      + {label}
    </span>
  );
}

export function QRTicket({
  event = "Sunset Sessions VOL.IV",
  date = "SAT · 12 JUL · 22:00",
  venue = "Cave 12 — Gozo",
  tier = "General Admission",
  ticketId = "GA-0427",
  holder = "A. Borg",
  state = "valid",
  seed,
  style,
}: {
  event?: string;
  date?: string;
  venue?: string;
  tier?: string;
  ticketId?: string;
  holder?: string;
  state?: "valid" | "used";
  seed?: string;
  style?: React.CSSProperties;
}) {
  const cells = React.useMemo(() => qrCells(seed || ticketId, QR_N), [seed, ticketId]);
  const n = QR_N;
  const used = state === "used";
  const dim: React.CSSProperties = used ? { filter: "grayscale(1)", opacity: 0.55 } : {};

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 340,
        background: "var(--bone)",
        color: "var(--ink)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        boxShadow: "var(--shadow-lg)",
        fontFamily: "var(--font-mono)",
        ...style,
      }}
    >
      <div
        style={{
          background: "var(--ink)",
          color: "var(--bone)",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1rem", letterSpacing: "-0.01em" }}>WII</span>
        <span
          style={{
            fontSize: "0.625rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: state === "valid" ? "var(--go-500)" : "var(--ash)",
          }}
        >
          {used ? "Scanned" : "Valid"}
        </span>
      </div>

      <div style={{ padding: "18px 20px 12px" }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "1.125rem",
            textTransform: "uppercase",
            letterSpacing: "-0.01em",
            lineHeight: 1.05,
          }}
        >
          {event}
        </div>
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px", fontSize: "0.6875rem" }}>
          <Field label="Date" value={date} />
          <Field label="Venue" value={venue} />
          <Field label="Tier" value={tier} />
          <Field label="Holder" value={holder} />
        </div>
      </div>

      {/* Perforation */}
      <div style={{ position: "relative", height: 22 }}>
        <span style={{ position: "absolute", left: -11, top: 0, width: 22, height: 22, borderRadius: "999px", background: "var(--ink)" }} />
        <span style={{ position: "absolute", right: -11, top: 0, width: 22, height: 22, borderRadius: "999px", background: "var(--ink)" }} />
        <span style={{ position: "absolute", left: 16, right: 16, top: 10, borderTop: "2px dashed rgba(0,0,0,0.25)" }} />
      </div>

      <div style={{ padding: "8px 20px 20px", display: "flex", gap: 16, alignItems: "center" }}>
        <div
          style={{
            ...dim,
            width: 96,
            height: 96,
            flex: "0 0 auto",
            display: "grid",
            gridTemplateColumns: `repeat(${n}, 1fr)`,
            gap: 0,
            background: "var(--bone)",
          }}
        >
          {cells.map((v, i) => (
            <span key={i} style={{ background: v ? "var(--ink)" : "transparent", aspectRatio: "1/1" }} />
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.5625rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ash)" }}>Ticket ID</div>
          <div style={{ fontWeight: 700, fontSize: "0.9375rem", letterSpacing: "0.04em" }}>{ticketId}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
            <WalletBtn label="Apple Wallet" />
            <WalletBtn label="Google Wallet" />
          </div>
        </div>
      </div>
    </div>
  );
}
