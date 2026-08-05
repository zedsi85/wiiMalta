"use client";

import React from "react";
import Link from "next/link";
import { WiiMark } from "@/components/ui/WiiMark";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/**
 * Wii Event Malta — Footer.
 * Waitlist capture, sitemap columns, social, legal. Dark, editorial.
 */
const cols: { h: string; items: { label: string; href: string }[] }[] = [
  {
    h: "Explore",
    items: [
      { label: "Events", href: "/events" },
      { label: "Gallery", href: "/#gallery" },
      { label: "About", href: "/about" },
      { label: "Team", href: "/team" },
    ],
  },
  {
    h: "Engage",
    items: [
      { label: "Community", href: "/community" },
      { label: "Partners", href: "/partners" },
      { label: "Contact", href: "/partners#contact" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
  {
    h: "Follow",
    items: [
      { label: "Instagram", href: "#" },
      { label: "TikTok", href: "#" },
      { label: "WhatsApp", href: "#" },
      { label: "Spotify", href: "#" },
    ],
  },
];

export function Footer() {
  const [sent, setSent] = React.useState(false);
  return (
    <footer
      style={{
        position: "relative",
        zIndex: 2,
        background: "var(--ink)",
        borderTop: "1px solid var(--border-soft)",
        padding: "var(--space-9) clamp(20px,5vw,64px) var(--space-6)",
      }}
    >
      <div style={{ maxWidth: "var(--container)", margin: "0 auto" }}>
        {/* Waitlist band */}
        <div
          className="wii-foot-top"
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: 40,
            alignItems: "center",
            paddingBottom: "var(--space-8)",
            borderBottom: "1px solid var(--border-soft)",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.6875rem",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--ember-500)",
              }}
            >
              Join the list
            </div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 900,
                fontSize: "clamp(1.8rem,3.5vw,2.75rem)",
                textTransform: "uppercase",
                letterSpacing: "-0.02em",
                lineHeight: 0.95,
                marginTop: 12,
              }}
            >
              Early access
              <br />
              belongs to
              <br />
              the community
            </h2>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <Input label="Email" type="email" placeholder="you@domain.com" required />
            <Button type="submit" variant="primary" fullWidth>
              {sent ? "You're on the list ✦" : "Get on the list"}
            </Button>
            <span style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>
              No spam. Just drops, dates and early access.
            </span>
          </form>
        </div>

        {/* Columns */}
        <div
          className="wii-foot-cols"
          style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(3, 1fr)", gap: 40, padding: "var(--space-7) 0" }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text-strong)" }}>
              <WiiMark size={40} />
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.5rem", letterSpacing: "-0.02em" }}>
                WII
              </span>
            </div>
            <p style={{ marginTop: 16, maxWidth: "30ch", color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: 1.6 }}>
              Curated nights across Malta. Built around sun, sea, sound, and community.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.625rem",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--text-faint)",
                  marginBottom: 16,
                }}
              >
                {c.h}
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 11 }}>
                {c.items.map((i) => (
                  <li key={i.label}>
                    <Link
                      href={i.href}
                      data-cursor
                      style={{ color: "var(--text-muted)", fontSize: "0.875rem", transition: "var(--t-hover)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-strong)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                    >
                      {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Legal */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            paddingTop: "var(--space-5)",
            borderTop: "1px solid var(--border-soft)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.6875rem",
            letterSpacing: "0.08em",
            color: "var(--text-faint)",
          }}
        >
          <span>© {new Date().getFullYear()} WII EVENT MALTA</span>
          <span>VALLETTA · GOZO · COMINO</span>
          <span>PRIVACY · TERMS</span>
        </div>
      </div>
      <style>{`@media (max-width: 760px){.wii-foot-top{grid-template-columns:1fr!important}.wii-foot-cols{grid-template-columns:1fr 1fr!important}}`}</style>
    </footer>
  );
}
