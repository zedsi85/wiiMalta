import type { Metadata } from "next";
import { MoodSetter } from "@/components/layout/MoodSetter";
import { Section } from "@/components/ui/Section";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { founders } from "@/lib/events";

export const metadata: Metadata = {
  title: "Team",
  description:
    "The collective behind Wii Event Malta. One side builds the night. The other builds the engine.",
};

/** /team — founders & operating model (kept off the homepage flow). */
export default function TeamPage() {
  return (
    <>
      <MoodSetter mood="partners" />

      <Section max="var(--container-wide)" style={{ paddingTop: "clamp(120px, 18vh, 220px)", paddingBottom: "var(--space-7)" }}>
        <SectionLabel style={{ marginBottom: 16 }}>The collective</SectionLabel>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(2.5rem, 8vw, 6.5rem)", textTransform: "uppercase", letterSpacing: "-0.03em", lineHeight: 0.84, color: "var(--bone)" }}>
          Who builds the night
        </h1>
        <p style={{ marginTop: 24, maxWidth: "46ch", color: "var(--sand)", fontSize: "1.1875rem", lineHeight: 1.55 }}>
          One side builds the night. The other builds the engine. Two disciplines, one operating model —
          event operations proven in Tunisia, now paired with a digital-first engine for Malta.
        </p>
      </Section>

      <Section max="var(--container)" style={{ paddingTop: 0 }}>
        <div className="team-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--grid-gap)" }}>
          {founders.map((f, i) => (
            <div
              key={f.name}
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-soft)",
                borderRadius: "var(--radius-lg)",
                padding: "clamp(24px,3vw,40px)",
              }}
            >
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--ember-500)", paddingTop: 6 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(1.6rem,3vw,2.4rem)", textTransform: "uppercase", letterSpacing: "-0.02em", color: "var(--bone)", lineHeight: 0.95 }}>
                    {f.name}
                  </h2>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ember-300)", marginTop: 8 }}>
                    {f.role}
                  </div>
                </div>
              </div>
              <p style={{ marginTop: 18, color: "var(--sand)", fontSize: "1rem", lineHeight: 1.55 }}>{f.blurb}</p>
              <ul style={{ listStyle: "none", margin: "18px 0 0", padding: 0, display: "grid", gap: 10 }}>
                {f.points.map((p) => (
                  <li key={p} style={{ position: "relative", paddingLeft: 20, color: "var(--fog)", fontSize: "0.9rem", lineHeight: 1.45 }}>
                    <span style={{ position: "absolute", left: 0, color: "var(--ember-500)" }}>→</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* Combined operating model */}
      <Section max="var(--container-narrow)" style={{ textAlign: "center" }}>
        <SectionLabel style={{ marginBottom: 14 }}>The operating model</SectionLabel>
        <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(1.5rem,3.2vw,2.6rem)", textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 1.1, color: "var(--bone)" }}>
          Operations on the ground. A digital engine behind it. Every event runs on both.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}>
          <Button href="/about" variant="secondary">
            Our story
          </Button>
          <Button href="/partners" variant="primary">
            Partner With Us
          </Button>
        </div>
      </Section>

      <style>{`@media (max-width: 760px){.team-grid{grid-template-columns:1fr!important}}`}</style>
    </>
  );
}
