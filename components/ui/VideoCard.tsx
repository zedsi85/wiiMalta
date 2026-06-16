import React from "react";

/**
 * Wii Event Malta — VideoCard.
 * A looping, muted, inline video tile with a cinematic overlay + label. Used for
 * the real Tunisia event footage in the brand story and gallery. Autoplay is
 * muted + playsInline so it works on mobile; poster shows before/instead of it.
 */
export function VideoCard({
  src,
  poster = "/videos/hero-fallback.svg",
  label,
  badge,
  aspect = "16 / 10",
  radius = "var(--radius-lg)",
  play = false,
  style,
}: {
  src: string;
  poster?: string;
  label?: string;
  badge?: string;
  aspect?: string;
  radius?: string;
  play?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="wii-grain"
      data-card={play ? "Watch Moment" : undefined}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: radius,
        aspectRatio: aspect,
        border: "1px solid var(--border-soft)",
        background: "linear-gradient(150deg,#3a1410,#120a18 72%)",
        ...style,
      }}
    >
      {/* @asset real Tunisia event footage */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        poster={poster}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      >
        <source src={src} type="video/mp4" />
      </video>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 45%, rgba(5,5,6,0.85))", zIndex: 2 }} />
      {play ? (
        <span
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            zIndex: 3,
            width: 60,
            height: 60,
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.6)",
            background: "rgba(5,5,6,0.35)",
            display: "grid",
            placeItems: "center",
            color: "var(--bone)",
            backdropFilter: "blur(2px)",
          }}
        >
          ▶
        </span>
      ) : null}
      {badge ? (
        <span
          style={{
            position: "absolute",
            top: 14,
            left: 14,
            zIndex: 3,
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontFamily: "var(--font-mono)",
            fontSize: "0.5625rem",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--bone)",
            background: "rgba(255,77,31,0.18)",
            border: "1px solid var(--ember-500)",
            borderRadius: "999px",
            padding: "5px 10px",
          }}
        >
          <i style={{ width: 6, height: 6, borderRadius: 999, background: "var(--ember-500)" }} />
          {badge}
        </span>
      ) : null}
      {label ? (
        <span
          style={{
            position: "absolute",
            left: 16,
            bottom: 14,
            zIndex: 3,
            fontFamily: "var(--font-mono)",
            fontSize: "0.6875rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--smoke)",
          }}
        >
          ▦ {label}
        </span>
      ) : null}
    </div>
  );
}
