"use client";

import { MoodSetter } from "@/components/layout/MoodSetter";
import { Section } from "@/components/ui/Section";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { VideoCard } from "@/components/ui/VideoCard";
import { credibilityPoints } from "@/lib/events";

const WHY_MALTA: [string, string][] = [
  ["Tourism & travel", "An island shaped by international visitors and a constant flow of new crowds."],
  ["Music & nightlife", "A growing appetite for curated electronic music and destination nights."],
  ["Communities", "Expats, locals and seasonal scenes that thrive on belonging."],
  ["Mediterranean stage", "Caves, forts, rooftops and lagoons — venues built for the night."],
];

export default function AboutPage() {
  return (
    <>
      <MoodSetter mood="events" />

      {/* 1 — Hero / Our Story intro */}
      <Section max="var(--container-wide)" style={{ paddingTop: "clamp(120px, 18vh, 220px)", paddingBottom: "var(--space-7)" }}>
        <SectionLabel style={{ marginBottom: 16 }}>Mediterranean event specialists, now building in Malta</SectionLabel>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(2.5rem, 7.5vw, 6.25rem)", textTransform: "uppercase", letterSpacing: "-0.03em", lineHeight: 0.84, color: "var(--bone)", maxWidth: "18ch" }}>
          From Tunisia&apos;s event scene to Malta&apos;s island stages.
        </h1>
        <p style={{ marginTop: 26, maxWidth: "60ch", color: "var(--sand)", fontSize: "1.1875rem", lineHeight: 1.55 }}>
          Wii Event Malta is the next chapter of a Mediterranean event journey. Our team has built real
          event experience in Tunisia — managing venues, suppliers, artists, logistics, crowds and
          media. Malta is the natural next step: an island shaped by tourism, music, international
          communities and Mediterranean nightlife.
        </p>
        <p style={{ marginTop: 16, maxWidth: "60ch", color: "var(--fog)", fontSize: "1.0625rem", lineHeight: 1.6 }}>
          We are bringing proven event operations, a digital-first ticketing engine, and a
          community-driven nightlife vision to Malta.
        </p>
      </Section>

      {/* 2 — Established in Tunisia (real footage + proof) */}
      <Section max="var(--container-wide)" style={{ paddingTop: 0 }}>
        <div className="about-split" style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: "var(--section-gap)", alignItems: "center" }}>
          <Reveal>
            <VideoCard
              src="/videos/tunisia-event-2.mp4"
              label="Tunisia event operations"
              badge="Real event footage · Tunisia"
              aspect="4 / 5"
              play
            />
          </Reveal>
          <div>
            <SectionLabel style={{ marginBottom: 18 }}>Established in Tunisia</SectionLabel>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(1.6rem,3.4vw,2.75rem)", textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 1.04, color: "var(--bone)" }}>
              Proven operations. Real crowds. Real footage.
            </h2>
            <p style={{ marginTop: 20, color: "var(--fog)", fontSize: "1.0625rem", lineHeight: 1.6, maxWidth: "48ch" }}>
              Before Malta, the team ran the full machine of nightlife — the parts the crowd never sees
              that make a night actually work.
            </p>
            <ul style={{ listStyle: "none", margin: "26px 0 0", padding: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" }}>
              {credibilityPoints.map((p) => (
                <li key={p} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: "0.9rem", color: "var(--sand)" }}>
                  <span style={{ color: "var(--ember-500)", flex: "0 0 auto", marginTop: 1 }} aria-hidden>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* 3 — Why Malta */}
      <Section max="var(--container)">
        <SectionLabel style={{ marginBottom: 14 }}>Why Malta</SectionLabel>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(2rem,5vw,3.5rem)", textTransform: "uppercase", letterSpacing: "-0.02em", color: "var(--bone)", maxWidth: "20ch" }}>
          An island built for destination nights
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "var(--grid-gap)", marginTop: 40 }}>
          {WHY_MALTA.map(([title, desc], i) => (
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

      {/* 4 — Mediterranean specialist positioning */}
      <Section max="var(--container-narrow)" style={{ textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(1.5rem,3.2vw,2.6rem)", textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 1.1, color: "var(--bone)" }}>
          Born from Mediterranean event experience. Bringing North African and Mediterranean nightlife
          energy to Malta.
        </p>
        <p style={{ marginTop: 20, color: "var(--text-muted)", fontSize: "1rem", lineHeight: 1.6 }}>
          Not a project starting from zero — a collective expanding its stage. Tunisia is the
          foundation; Malta is the next chapter.
        </p>
      </Section>

      {/* 5 — Real event footage (full-bleed card) */}
      <Section max="var(--container-wide)">
        <SectionLabel style={{ marginBottom: 24 }}>Real event footage</SectionLabel>
        <Reveal>
          <VideoCard
            src="/videos/tunisia-event-footage.mp4"
            label="Mediterranean nightlife experience"
            badge="Proven operations"
            aspect="16 / 9"
            play
          />
        </Reveal>
      </Section>

      {/* 6 — Digital ticketing & community engine */}
      <Section max="var(--container)" style={{ paddingTop: 0 }}>
        <div className="about-split" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "var(--section-gap)", alignItems: "center" }}>
          <div>
            <SectionLabel style={{ marginBottom: 18 }}>The digital advantage</SectionLabel>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(1.8rem,4vw,3rem)", textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 1.02, color: "var(--bone)" }}>
              A ticketing & community engine, built in-house
            </h2>
            <p style={{ marginTop: 20, color: "var(--fog)", fontSize: "1.0625rem", lineHeight: 1.6, maxWidth: "48ch" }}>
              We own the digital layer: digital ticketing, QR entry, a CRM and audience database, media
              distribution, and a future community pass. That means cleaner operations, real data and a
              direct line to the people who build the nights with us.
            </p>
            <div style={{ display: "flex", gap: 14, marginTop: 30, flexWrap: "wrap" }}>
              <Button href="/community" variant="secondary">
                Community access
              </Button>
              <Button href="/team" variant="secondary">
                Meet the team
              </Button>
            </div>
          </div>
          <Reveal>
            <VideoCard src="/videos/tunisia-event-2.mp4" label="Crowd & media capture" aspect="1 / 1" />
          </Reveal>
        </div>
      </Section>

      {/* 7 — Vision for Malta / CTA */}
      <Section max="var(--container-narrow)" style={{ textAlign: "center" }}>
        <SectionLabel style={{ marginBottom: 14 }}>Vision for Malta</SectionLabel>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(2rem,5vw,3.5rem)", textTransform: "uppercase", letterSpacing: "-0.02em", color: "var(--bone)" }}>
          Malta is the next chapter.
        </h2>
        <p style={{ marginTop: 18, color: "var(--sand)", maxWidth: "48ch", margin: "18px auto 0", lineHeight: 1.6 }}>
          A community-driven nightlife brand for the island — built around sound, people, places and
          Mediterranean nights.
        </p>
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

      <style>{`@media (max-width: 900px){.about-split{grid-template-columns:1fr!important}}`}</style>
    </>
  );
}
