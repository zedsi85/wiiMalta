"use client";

import { MoodSetter } from "@/components/layout/MoodSetter";
import { Section, MediaSlot } from "@/components/ui/Section";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

const PHILOSOPHY: [string, string][] = [
  ["Sound first", "Lineups are curated, not booked. The music sets the room, not the other way round."],
  ["Rooted in Malta", "Caves, forts, rooftops, lagoons — the island is the venue and the headliner."],
  ["Community-driven", "Early access belongs to the people who show up. The door is part of the family."],
  ["Premium, not exclusive", "Refined, considered, welcoming. Underground energy without the attitude."],
];

export default function AboutPage() {
  return (
    <>
      <MoodSetter mood="statement" />

      {/* Hero */}
      <Section max="var(--container-wide)" style={{ paddingTop: "clamp(120px, 18vh, 220px)", paddingBottom: "var(--space-7)" }}>
        <SectionLabel style={{ marginBottom: 16 }}>Mediterranean event collective · Tunisia → Malta</SectionLabel>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(2.5rem, 8vw, 6.5rem)", textTransform: "uppercase", letterSpacing: "-0.03em", lineHeight: 0.84, color: "var(--bone)", maxWidth: "16ch" }}>
          Where music meets the island
        </h1>
        <p style={{ marginTop: 24, maxWidth: "54ch", color: "var(--sand)", fontSize: "1.1875rem", lineHeight: 1.55 }}>
          Wii Event Malta is the Malta extension of an established Mediterranean event collective. Born
          from real event operations in Tunisia, we bring proven nightlife experience, digital
          ticketing and community-first energy to the island — not a project starting from zero.
        </p>
      </Section>

      {/* Mission split */}
      <Section max="var(--container-wide)" style={{ paddingTop: 0 }}>
        <div className="about-split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--section-gap)", alignItems: "center" }}>
          <MediaSlot tint="linear-gradient(150deg,#3a1410,#120a18 72%)" label="Cave 12 — Gozo" style={{ aspectRatio: "4 / 5", borderRadius: "var(--radius-lg)" }} />
          <div>
            <SectionLabel style={{ marginBottom: 18 }}>Our mission</SectionLabel>
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(1.5rem,3vw,2.5rem)", textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 1.08, color: "var(--bone)" }}>
              Build the nights the island deserves — and the community to carry them.
            </p>
            <p style={{ marginTop: 22, color: "var(--fog)", fontSize: "1.0625rem", lineHeight: 1.6, maxWidth: "46ch" }}>
              From Tunisia&apos;s event scene to Malta&apos;s island stages, every event is a chapter.
              We own the whole experience: the booking, the room, the sound, the ticket in your wallet
              and the film afterwards.
            </p>
          </div>
        </div>
      </Section>

      {/* Philosophy */}
      <Section max="var(--container)">
        <SectionLabel style={{ marginBottom: 28 }}>Philosophy</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--grid-gap)" }}>
          {PHILOSOPHY.map(([title, desc], i) => (
            <Reveal key={title} delay={(i % 4) * 70}>
              <div style={{ background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-lg)", padding: "26px 24px", height: "100%" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--ember-500)" }}>{String(i + 1).padStart(2, "0")}</div>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.25rem", textTransform: "uppercase", color: "var(--bone)", marginTop: 14 }}>{title}</h3>
                <p style={{ marginTop: 10, color: "var(--fog)", fontSize: "0.9rem", lineHeight: 1.55 }}>{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <Section max="var(--container-narrow)" style={{ textAlign: "center" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(2rem,5vw,3.5rem)", textTransform: "uppercase", letterSpacing: "-0.02em", color: "var(--bone)" }}>
          The next night starts here.
        </h2>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}>
          <Button href="/events" variant="primary">
            View Events
          </Button>
          <Button href="/community" variant="secondary">
            Join the Community
          </Button>
          <Button href="/partners" variant="secondary">
            Partner With Us
          </Button>
        </div>
      </Section>

      <style>{`@media (max-width: 860px){.about-split{grid-template-columns:1fr!important}}`}</style>
    </>
  );
}
