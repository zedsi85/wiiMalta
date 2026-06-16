import React from "react";
import { WiiMark } from "./WiiMark";

/**
 * Wii Event Malta — MembershipPass.
 * Future-facing digital access pass. Framed strictly as access / utility, never
 * investment. Keep the "Soon" framing until it ships.
 */
export function MembershipPass({
  tier = "Resident",
  holder = "Member",
  memberId = "WII-0000",
  perks = ["Early ticket access", "Private drops", "Partner perks"],
  comingSoon = true,
  style,
}: {
  tier?: string;
  holder?: string;
  memberId?: string;
  perks?: string[];
  comingSoon?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="wii-grain"
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 380,
        aspectRatio: "1.586 / 1",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        padding: "22px 24px",
        color: "var(--bone)",
        background: "linear-gradient(135deg, #1a0d0a 0%, #2a1230 55%, #0a0a12 100%)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "var(--shadow-lg)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        ...style,
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: "var(--glow-ember)", opacity: 0.4, pointerEvents: "none" }} />
      <div
        style={{
          position: "absolute",
          right: -40,
          bottom: -40,
          width: 200,
          height: 200,
          borderRadius: "999px",
          background: "var(--glow-haze)",
          opacity: 0.5,
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.625rem",
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.65)",
            }}
          >
            WII · Digital Pass
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: "1.6rem",
              textTransform: "uppercase",
              letterSpacing: "-0.02em",
              marginTop: 6,
            }}
          >
            {tier}
          </div>
        </div>
        <WiiMark size={40} color="var(--bone)" />
      </div>

      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {perks.slice(0, 3).map((p) => (
            <span
              key={p}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.5625rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.85)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "999px",
                padding: "3px 8px",
              }}
            >
              {p}
            </span>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            letterSpacing: "0.08em",
          }}
        >
          <div>
            <div style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.18em" }}>
              Holder
            </div>
            <div style={{ marginTop: 2 }}>{holder}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.18em" }}>
              Member ID
            </div>
            <div style={{ marginTop: 2 }}>{memberId}</div>
          </div>
        </div>
      </div>

      {comingSoon ? (
        <span
          style={{
            position: "absolute",
            top: 16,
            right: 64,
            fontFamily: "var(--font-mono)",
            fontSize: "0.5rem",
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--gold-300)",
            border: "1px solid var(--gold-500)",
            borderRadius: "999px",
            padding: "2px 7px",
          }}
        >
          Soon
        </span>
      ) : null}
    </div>
  );
}
