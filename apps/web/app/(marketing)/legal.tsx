import type { ReactNode } from "react";
import { Section } from "@/components/ui/Section";
import { SectionLabel } from "@/components/ui/SectionLabel";

/** Shared shell for legal documents (privacy, terms). */
export function LegalPage({
  label,
  title,
  updated,
  children,
}: {
  label: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <Section max="var(--container-narrow, 760px)" style={{ paddingTop: "clamp(120px, 16vh, 180px)", paddingBottom: "var(--space-7)" }}>
      <SectionLabel style={{ marginBottom: 16 }}>{label}</SectionLabel>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          fontSize: "clamp(2rem, 5vw, 3.5rem)",
          textTransform: "uppercase",
          letterSpacing: "-0.02em",
          lineHeight: 0.95,
          color: "var(--bone)",
        }}
      >
        {title}
      </h1>
      <p style={{ marginTop: 12, color: "var(--fog)", fontSize: "0.8125rem", fontFamily: "var(--font-mono)" }}>
        Last updated: {updated}
      </p>
      <div className="legal-body" style={{ marginTop: 40, color: "var(--sand)", fontSize: "1rem", lineHeight: 1.7 }}>
        {children}
        <style>{`
          .legal-body h2 { font-family: var(--font-display); font-weight: 900; text-transform: uppercase; letter-spacing: 0.02em; font-size: 1.125rem; color: var(--bone); margin: 40px 0 12px; }
          .legal-body p { margin: 0 0 14px; }
          .legal-body ul { margin: 0 0 14px; padding-left: 20px; }
          .legal-body li { margin-bottom: 8px; }
          .legal-body a { color: var(--ember-300, #ff8a5c); }
        `}</style>
      </div>
    </Section>
  );
}
