"use client";

import React, { useState } from "react";
import { MoodSetter } from "@/components/layout/MoodSetter";
import IslandContours from "@/components/visual/IslandContours";
import { Section } from "@/components/ui/Section";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Reveal } from "@/components/ui/Reveal";
import { partners } from "@/lib/events";

const BENEFITS: [string, string][] = [
  ["Audience", "Direct reach to an engaged, premium nightlife community across Malta."],
  ["Ticketing", "We own the ticketing + data layer — clean reporting, no middlemen."],
  ["Content", "Film, photo and an archive your brand lives inside, not beside."],
  ["Activation", "Sponsorship woven into the night — never bolted on."],
  ["Reporting", "Digital, transparent post-event reporting on reach and conversion."],
  ["Repeat", "A recurring programme, not one-offs — build with us across the season."],
];

export default function PartnersPage() {
  const [sent, setSent] = useState(false);

  return (
    <>
      <IslandContours className="fx-layer" variant="abstract" opacity={0.12} animated parallax />
      <div className="page-fx-content">
      <MoodSetter mood="partners" />

      {/* Hero */}
      <Section max="var(--container-wide)" style={{ paddingTop: "clamp(120px, 18vh, 220px)", paddingBottom: "var(--space-7)" }}>
        <SectionLabel style={{ marginBottom: 16 }}>Work with us</SectionLabel>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(2.75rem, 9vw, 7rem)", textTransform: "uppercase", letterSpacing: "-0.03em", lineHeight: 0.84, color: "var(--bone)" }}>
          Partner With Us
        </h1>
        <p style={{ marginTop: 24, maxWidth: "52ch", color: "var(--sand)", fontSize: "1.125rem", lineHeight: 1.55 }}>
          Venues, sponsors, suppliers, artists, brands and media — the night is built together. Bring
          your space, your sound or your story, and we&apos;ll build the audience around it.
        </p>
      </Section>

      {/* Categories */}
      <Section max="var(--container)" style={{ paddingTop: 0 }}>
        <SectionLabel style={{ marginBottom: 28 }}>Who we work with</SectionLabel>
        <div className="partners-grid">
          {partners.map(([num, title, desc]) => (
            <div className="pcard" key={num} data-card="Partner">
              <b>{num}</b>
              <h4>{title}</h4>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Benefits */}
      <Section max="var(--container)" style={{ paddingTop: 0 }}>
        <SectionLabel style={{ marginBottom: 28 }}>What you get</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "var(--grid-gap)" }}>
          {BENEFITS.map(([title, desc], i) => (
            <Reveal key={title} delay={(i % 3) * 70}>
              <div style={{ borderTop: "2px solid var(--ember-500)", paddingTop: 18 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1875rem", textTransform: "uppercase", color: "var(--bone)" }}>{title}</h3>
                <p style={{ marginTop: 10, color: "var(--fog)", fontSize: "0.9rem", lineHeight: 1.55 }}>{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Contact form */}
      <Section id="contact" max="var(--container-narrow)">
        <div style={{ background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-xl)", padding: "clamp(28px,4vw,52px)" }}>
          <SectionLabel style={{ marginBottom: 14 }}>Start a conversation</SectionLabel>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(1.8rem,4vw,3rem)", textTransform: "uppercase", letterSpacing: "-0.02em", color: "var(--bone)" }}>
            Let&apos;s build a night
          </h2>
          {sent ? (
            <p style={{ marginTop: 24, color: "var(--go-500)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
              ✦ Thanks — we&apos;ll be in touch within two working days.
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
              style={{ display: "grid", gap: 16, marginTop: 28 }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Input label="Name" placeholder="Your name" required />
                <Input label="Company" placeholder="Brand / venue" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Input label="Email" type="email" placeholder="you@domain.com" required />
                <Input label="Partner type" placeholder="Venue · Sponsor · Artist…" />
              </div>
              <label style={{ display: "block" }}>
                <span style={{ display: "block", marginBottom: 8, fontFamily: "var(--font-mono)", fontSize: "0.6875rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                  Message
                </span>
                <textarea
                  rows={4}
                  placeholder="Tell us what you have in mind…"
                  style={{
                    width: "100%",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "14px 16px",
                    color: "var(--text-strong)",
                    fontFamily: "var(--font-ui)",
                    fontSize: "0.95rem",
                    resize: "vertical",
                  }}
                />
              </label>
              <div>
                <Button type="submit" variant="primary">
                  Partner With Us
                </Button>
              </div>
            </form>
          )}
        </div>
      </Section>
      </div>
    </>
  );
}
