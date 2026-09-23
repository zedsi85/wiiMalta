"use client";

import React from "react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import type { Edition, EditionMedia } from "@/lib/editions";
import type { WiiEvent } from "@/lib/events";

/**
 * Special-edition editorial sections rendered inside the standard event page
 * (between the intro and the line-up). Fully data-driven from lib/editions —
 * this component owns layout and motion only, never copy.
 */

/** Video (autoplay, muted, inline — poster fallback) or image, cover-fit. */
export function EditionMediaView({
  media,
  className,
  style,
  preload = "metadata",
}: {
  media: EditionMedia;
  className?: string;
  style?: React.CSSProperties;
  /** "auto" for the above-the-fold hero; "metadata" for lazy in-page chapters. */
  preload?: "auto" | "metadata" | "none";
}) {
  const base: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };
  return media.kind === "video" ? (
    <video
      className={className}
      src={media.src}
      poster={media.poster}
      autoPlay
      muted
      loop
      playsInline
      disablePictureInPicture
      disableRemotePlayback
      preload={preload}
      aria-label={media.alt}
      // If the source can't load, hide the element so the static image beneath (MediaSlot src) stays visible.
      onError={(e) => ((e.currentTarget as HTMLVideoElement).style.display = "none")}
      style={{ ...base, ...style }}
    />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={className} src={media.src} alt={media.alt} loading="lazy" decoding="async" style={{ ...base, ...style }} />
  );
}

const display: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "-0.03em",
  lineHeight: 0.86,
  color: "var(--bone)",
};

export function EditionSections({ edition, event, onCta }: { edition: Edition; event: WiiEvent; onCta: () => void }) {
  return (
    <div className="ed-root">
      {/* ── Story ── */}
      <section className="ed-block" style={{ marginTop: "var(--space-9)" }}>
        <Reveal>
          <h2 style={{ ...display, fontSize: "clamp(2.25rem, 6.5vw, 5.25rem)", maxWidth: "14ch" }}>
            {edition.story.headline.map((l, i) => (
              <span key={i} className="ed-line" style={{ display: "block", animationDelay: `${i * 160}ms` }}>
                {l}
              </span>
            ))}
          </h2>
        </Reveal>
        <div style={{ marginTop: 28, display: "grid", gap: 16, maxWidth: "58ch" }}>
          {edition.story.body.map((p, i) => (
            <Reveal key={i} delay={i * 90}>
              <p style={{ fontSize: "1.0625rem", lineHeight: 1.65, color: "var(--sand)" }}>{p}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Venue history ── */}
      <section className="ed-block ed-venue" style={{ marginTop: "var(--space-9)" }}>
        {edition.venue.media && (
          <Reveal>
            <div className="ed-frame ed-kenburns" style={{ position: "relative", aspectRatio: "3 / 4", borderRadius: "var(--radius-md)", overflow: "hidden", maxHeight: 640 }}>
              <EditionMediaView media={edition.venue.media} />
              <div className="ed-scrim" />
            </div>
          </Reveal>
        )}
        <div>
          <Reveal>
            <SectionLabel style={{ marginBottom: 16 }}>{edition.venue.label}</SectionLabel>
            <h3 style={{ ...display, fontSize: "clamp(1.75rem, 4vw, 3rem)", maxWidth: "16ch" }}>{edition.venue.headline}</h3>
          </Reveal>
          <div style={{ marginTop: 22, display: "grid", gap: 14, maxWidth: "52ch" }}>
            {edition.venue.body.map((p, i) => (
              <Reveal key={i} delay={80 + i * 90}>
                <p style={{ fontSize: "1rem", lineHeight: 1.65, color: "var(--text-muted)" }}>{p}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Chapters: progressive reveal of the venue ── */}
      <section className="ed-block" style={{ marginTop: "var(--space-9)" }}>
        <SectionLabel style={{ marginBottom: 6 }}>The way in</SectionLabel>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-faint)", marginBottom: 28 }}>
          {edition.chapters.map((c) => c.title).join("  →  ")}
        </p>
        <div style={{ display: "grid", gap: 18 }}>
          {edition.chapters.map((ch, i) => (
            <Reveal key={ch.id} delay={i * 40}>
              <div className={`ed-chapter ${ch.media ? "has-media" : "no-media"}`}>
                {ch.media ? (
                  <div className="ed-frame ed-kenburns" style={{ position: "relative", aspectRatio: "16 / 9", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                    <EditionMediaView media={ch.media} />
                    <div className="ed-scrim" />
                    <div className="ed-flicker" />
                    <div style={{ position: "absolute", left: "clamp(18px,3vw,32px)", bottom: "clamp(18px,3vw,32px)", zIndex: 2 }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ember-300)" }}>
                        {ch.index}
                      </div>
                      <div style={{ ...display, fontSize: "clamp(1.75rem, 5vw, 3.5rem)", marginTop: 6 }}>{ch.title}</div>
                    </div>
                  </div>
                ) : (
                  <div className="ed-stone" style={{ display: "flex", alignItems: "flex-end", gap: 24, padding: "clamp(22px,4vw,40px)", minHeight: 150, borderRadius: "var(--radius-md)" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ember-300)" }}>
                      {ch.index}
                    </div>
                    <div style={{ ...display, fontSize: "clamp(1.5rem, 4.5vw, 3rem)", color: "var(--sand)" }}>{ch.title}</div>
                  </div>
                )}
                <p style={{ marginTop: 12, fontSize: "0.9375rem", lineHeight: 1.6, color: "var(--text-muted)", maxWidth: "56ch" }}>{ch.line}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Lineup — typographic (no artist photography supplied) ── */}
      <section className="ed-block" style={{ marginTop: "var(--space-9)" }}>
        <Reveal>
          <SectionLabel style={{ marginBottom: 16 }}>Line-up</SectionLabel>
          <div style={{ display: "grid", gap: 4 }}>
            {event.artists.map((a, i) => (
              <div key={a.name} className="ed-artist" style={{ ...display, fontSize: "clamp(2.5rem, 9vw, 7rem)", animationDelay: `${i * 120}ms`, borderTop: "1px solid var(--border-soft)", padding: "14px 0" }}>
                {a.name}
              </div>
            ))}
          </div>
          <p style={{ marginTop: 18, fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-faint)" }}>
            {edition.lineupHeadline}
          </p>
        </Reveal>
      </section>

      {/* ── Offer / CTA ── */}
      <section className="ed-block ed-offer" style={{ marginTop: "var(--space-9)" }}>
        <Reveal>
          <div className="ed-stone" style={{ padding: "clamp(24px,4vw,44px)", borderRadius: "var(--radius-lg)", display: "grid", gap: 18 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 32px", alignItems: "baseline" }}>
              <div style={{ ...display, fontSize: "clamp(3rem, 9vw, 6rem)", color: "var(--ember-500)" }}>{edition.offer.price}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--bone)" }}>
                {edition.offer.includes}
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 28px", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--sand)" }}>
              <span>{event.dateLong}</span>
              <span>{event.venue}</span>
            </div>
            <div>
              <Button variant="primary" onClick={onCta} disabled={event.status === "soldout"}>
                {event.status === "soldout" ? "Sold out" : edition.offer.cta}
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

/** Mobile-only sticky bar — keeps the ticket one tap away while scrolling the story. */
export function EditionStickyCta({ edition, event, onCta }: { edition: Edition; event: WiiEvent; onCta: () => void }) {
  return (
    <div className="ed-sticky">
      <div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.25rem", color: "var(--bone)", lineHeight: 1 }}>{edition.offer.price}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.5625rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--fog)", marginTop: 3 }}>
          Welcome drink included
        </div>
      </div>
      <Button variant="primary" onClick={onCta} disabled={event.status === "soldout"}>
        {event.status === "soldout" ? "Sold out" : edition.offer.cta}
      </Button>
    </div>
  );
}
