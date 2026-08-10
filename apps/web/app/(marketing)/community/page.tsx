"use client";

import React, { useState } from "react";
import { MoodSetter } from "@/components/layout/MoodSetter";
import AccessParticles from "@/components/webgl/AccessParticles";
import { CardIllustration } from "@/components/visual/CardIllustration";
import type { Artwork } from "@/lib/illustrations";

const PERK_VARIANTS: Record<string, Artwork> = {
  "Early access": "vip",
  "Private drops": "invite",
  "Partner perks": "rooftop",
  "Community nights": "festival",
};
import { Section } from "@/components/ui/Section";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MembershipPass } from "@/components/ui/MembershipPass";
import { Reveal } from "@/components/ui/Reveal";
import { communityPerks } from "@/lib/events";

export default function CommunityPage() {
  const [joined, setJoined] = useState(false);

  return (
    <>
      <AccessParticles className="fx-layer" mode="community" density={50} opacity={0.2} interactive />
      <div className="page-fx-content">
      <MoodSetter mood="community" />

      {/* Hero */}
      <Section max="var(--container-wide)" style={{ paddingTop: "clamp(120px, 18vh, 220px)", paddingBottom: "var(--space-7)" }}>
        <div className="comm-hero" style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "var(--section-gap)", alignItems: "center" }}>
          <div>
            <SectionLabel color="var(--gold-300)" style={{ marginBottom: 16 }}>
              Coming soon · Digital access pass
            </SectionLabel>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(2.75rem, 8vw, 6.5rem)", textTransform: "uppercase", letterSpacing: "-0.03em", lineHeight: 0.84, color: "var(--bone)" }}>
              Belong to
              <br />
              the night
            </h1>
            <p style={{ marginTop: 24, maxWidth: "48ch", color: "var(--sand)", fontSize: "1.125rem", lineHeight: 1.55 }}>
              The Wii community is where the night begins. Soon, members will unlock early drops, VIP
              perks, ticket credits, consumption benefits and private experiences — held in a single
              digital pass. Access &amp; utility, never speculation.
            </p>
            <div style={{ display: "flex", gap: 14, marginTop: 32, flexWrap: "wrap" }}>
              <Button href="#waitlist" variant="vip">
                Join the Waitlist
              </Button>
              <Button href="https://admin.wiievent.com/ambassador/apply" variant="secondary">
                Become an ambassador
              </Button>
              <Button href="/events" variant="secondary">
                Get Early Access
              </Button>
            </div>
          </div>
          <div style={{ display: "grid", placeItems: "center" }}>
            <MembershipPass tier="Founding" holder="Your name" memberId="WII-001" perks={["Early access", "VIP upgrades", "Ticket credits"]} />
          </div>
        </div>
      </Section>

      {/* Perks */}
      <Section max="var(--container)">
        <SectionLabel style={{ marginBottom: 28 }}>Member perks</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "var(--grid-gap)" }}>
          {communityPerks.map(([title, desc], i) => (
            <Reveal key={title} delay={(i % 4) * 70}>
              <div className="perk-card" style={{ background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-lg)", padding: "26px 24px", height: "100%" }}>
                <CardIllustration variant={PERK_VARIANTS[title] ?? "festival"} intensity="low" animated />
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--ember-500)" }}>{String(i + 1).padStart(2, "0")}</div>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.25rem", textTransform: "uppercase", color: "var(--bone)", marginTop: 14 }}>{title}</h3>
                <p style={{ marginTop: 10, color: "var(--fog)", fontSize: "0.9rem", lineHeight: 1.55 }}>{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Positioning / legal-safe band */}
      <Section max="var(--container-narrow)" style={{ textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(1.4rem,3vw,2.25rem)", textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 1.1, color: "var(--bone)" }}>
          A loyalty &amp; access pass. Utility for the people who build the nights with us — not an
          investment, yield or security.
        </p>
        <p style={{ marginTop: 20, color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>
          Community rewards reflect participation and access. No dividends, no profit distribution, no
          passive income. Full terms will ship with the pass.
        </p>
      </Section>

      {/* Waitlist */}
      <Section id="waitlist" max="var(--container-narrow)">
        <div style={{ background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-xl)", padding: "clamp(28px,4vw,52px)", textAlign: "center" }} className="wii-grain">
          <SectionLabel color="var(--gold-300)" style={{ marginBottom: 14 }}>
            Join before the next drop
          </SectionLabel>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(1.8rem,4vw,3rem)", textTransform: "uppercase", letterSpacing: "-0.02em", color: "var(--bone)" }}>
            Get on the list
          </h2>
          {joined ? (
            <p style={{ marginTop: 24, color: "var(--go-500)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
              ✦ You&apos;re on the list. Welcome to the night.
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setJoined(true);
              }}
              style={{ display: "flex", gap: 12, maxWidth: 440, margin: "28px auto 0", flexWrap: "wrap" }}
            >
              <Input type="email" placeholder="you@domain.com" required style={{ flex: "1 1 220px" }} />
              <Button type="submit" variant="primary">
                Join
              </Button>
            </form>
          )}
          <p style={{ marginTop: 18, fontSize: "0.75rem", color: "var(--text-faint)" }}>
            Early access belongs to the community. No spam — just drops, dates and perks.
          </p>
        </div>
      </Section>

      <style>{`@media (max-width: 860px){.comm-hero{grid-template-columns:1fr!important}}`}</style>
      </div>
    </>
  );
}
