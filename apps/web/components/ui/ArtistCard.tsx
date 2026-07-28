"use client";

import React from "react";

/**
 * Wii Event Malta — ArtistCard.
 * Lineup portrait. Square media slot, name, role + set time on hover. Portrait
 * desaturated until hovered (then full colour). Replace gradient with real photo.
 */
export function ArtistCard({
  name,
  role = "Live",
  setTime,
  country,
  image,
  headliner = false,
  style,
}: {
  name: string;
  role?: string;
  setTime?: string;
  country?: string;
  image?: string;
  headliner?: boolean;
  style?: React.CSSProperties;
}) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      data-cursor
      style={{ position: "relative", borderRadius: "var(--radius-md)", overflow: "hidden", cursor: "default", ...style }}
    >
      <div
        className="wii-grain"
        style={{
          position: "relative",
          aspectRatio: "1 / 1",
          background: image ? `center/cover no-repeat url(${image})` : "linear-gradient(160deg,#1a1a20,#0a0a0c)",
          filter: hover ? "none" : "grayscale(0.6) brightness(0.85)",
          transition: "filter var(--dur-base) var(--ease-out)",
        }}
      >
        {!image ? <div style={{ position: "absolute", inset: 0, background: "var(--glow-haze)", opacity: 0.55 }} /> : null}
        {headliner ? (
          <span
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              fontFamily: "var(--font-mono)",
              fontSize: "0.5625rem",
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--void)",
              background: "var(--ember-500)",
              padding: "3px 7px",
              borderRadius: "999px",
              zIndex: 2,
            }}
          >
            Headliner
          </span>
        ) : null}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 45%, rgba(5,5,6,0.92))" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "14px" }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "1.1rem",
              lineHeight: 1,
              textTransform: "uppercase",
              letterSpacing: "-0.01em",
              color: "var(--bone)",
            }}
          >
            {name}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 6,
              fontFamily: "var(--font-mono)",
              fontSize: "0.6875rem",
              letterSpacing: "0.08em",
              color: "var(--text-muted)",
            }}
          >
            <span style={{ color: "var(--ember-300)" }}>{role}</span>
            {country ? <span>{country}</span> : null}
          </div>
          {setTime ? (
            <div
              style={{
                overflow: "hidden",
                maxHeight: hover ? 24 : 0,
                opacity: hover ? 1 : 0,
                transition: "var(--t-ui)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.6875rem",
                color: "var(--text-faint)",
                marginTop: hover ? 4 : 0,
              }}
            >
              {setTime}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
