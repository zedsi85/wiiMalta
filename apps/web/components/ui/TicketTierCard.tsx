"use client";

import React from "react";
import { QuantitySelector } from "./QuantitySelector";

/**
 * Wii Event Malta — TicketTierCard.
 * One purchasable tier. Selectable, with perks and a quantity stepper.
 */
export function TicketTierCard({
  name,
  price,
  note,
  perks = [],
  status = "available",
  vip = false,
  selected = false,
  quantity = 0,
  max = 6,
  onSelect,
  onQuantity,
  style,
}: {
  name: string;
  price: string;
  note?: string;
  perks?: string[];
  status?: string;
  vip?: boolean;
  selected?: boolean;
  quantity?: number;
  max?: number;
  onSelect?: () => void;
  onQuantity?: (n: number) => void;
  style?: React.CSSProperties;
}) {
  const soldout = status === "soldout";
  const accent = vip ? "var(--accent-vip)" : "var(--accent)";
  const active = selected && !soldout;

  return (
    <div
      onClick={() => !soldout && onSelect?.()}
      data-cursor
      style={{
        position: "relative",
        padding: "20px 22px",
        background: active ? "rgba(255,77,31,0.06)" : "var(--surface)",
        border: `1px solid ${active ? accent : "var(--border-soft)"}`,
        borderRadius: "var(--radius-md)",
        cursor: soldout ? "not-allowed" : "pointer",
        opacity: soldout ? 0.55 : 1,
        transition: "var(--t-ui)",
        ...style,
      }}
    >
      {vip ? (
        <span
          style={{
            position: "absolute",
            top: -1,
            right: 18,
            transform: "translateY(-50%)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.5625rem",
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--void)",
            background: accent,
            padding: "4px 9px",
            borderRadius: "999px",
          }}
        >
          VIP
        </span>
      ) : null}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "1.0625rem",
              textTransform: "uppercase",
              letterSpacing: "-0.01em",
              color: "var(--text-strong)",
            }}
          >
            {name}
          </div>
          {note ? <div style={{ fontSize: "0.8125rem", color: "var(--text-faint)", marginTop: 3 }}>{note}</div> : null}
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "1.375rem",
              color: soldout ? "var(--text-muted)" : accent,
            }}
          >
            {soldout ? "—" : price}
          </div>
        </div>
      </div>

      {perks.length ? (
        <ul style={{ listStyle: "none", margin: "16px 0 0", padding: 0, display: "grid", gap: 8 }}>
          {perks.map((p) => (
            <li
              key={p}
              style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: "0.8125rem", color: "var(--text-muted)" }}
            >
              <span style={{ color: accent, flex: "0 0 auto", marginTop: 1 }} aria-hidden>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              {p}
            </li>
          ))}
        </ul>
      ) : null}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.6875rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: soldout ? "var(--text-faint)" : "var(--text-muted)",
          }}
        >
          {soldout ? "Sold out" : status === "limited" ? "Almost gone" : "Available"}
        </span>
        {!soldout ? (
          <div onClick={(e) => e.stopPropagation()}>
            <QuantitySelector value={quantity} min={0} max={max} size="sm" onChange={onQuantity} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
