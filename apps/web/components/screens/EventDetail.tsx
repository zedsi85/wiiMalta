"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoodSetter } from "@/components/layout/MoodSetter";
import { Section, MediaSlot } from "@/components/ui/Section";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Badge } from "@/components/ui/Badge";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { ArtistCard } from "@/components/ui/ArtistCard";
import { TicketTierCard } from "@/components/ui/TicketTierCard";
import { EventCard } from "@/components/ui/EventCard";
import { Reveal } from "@/components/ui/Reveal";
import SoundWaveField from "@/components/webgl/SoundWaveField";
import { setCart, priceValue, formatEuro, type CartLine } from "@/lib/cart";
import type { WiiEvent } from "@/lib/events";

/**
 * Wii Event Malta — Event detail screen.
 * Cinematic hero poster, sticky purchase panel (tier select + live total),
 * lineup, info, map placeholder, FAQ and similar events. Writes the cart and
 * routes to checkout on purchase.
 */
export function EventDetail({ event, similar }: { event: WiiEvent; similar: WiiEvent[] }) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string>(
    event.tiers.find((t) => t.status !== "soldout")?.id ?? event.tiers[0].id
  );
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const lines: CartLine[] = useMemo(
    () =>
      event.tiers
        .filter((t) => (qty[t.id] ?? 0) > 0)
        .map((t) => ({ tierId: t.id, name: t.name, price: t.price, vip: t.vip, qty: qty[t.id] })),
    [qty, event.tiers]
  );

  const total = lines.reduce((sum, l) => sum + priceValue(l.price) * l.qty, 0);
  const count = lines.reduce((sum, l) => sum + l.qty, 0);

  const checkout = () => {
    const effective =
      lines.length > 0
        ? lines
        : [
            (() => {
              const t = event.tiers.find((x) => x.id === selected) ?? event.tiers[0];
              return { tierId: t.id, name: t.name, price: t.price, vip: t.vip, qty: 1 };
            })(),
          ];
    setCart({
      slug: event.slug,
      eventTitle: event.title,
      date: event.date,
      venue: event.venue,
      lines: effective,
    });
    router.push("/checkout");
  };

  return (
    <>
      <MoodSetter mood="ticketing" />

      {/* Hero poster */}
      <div style={{ position: "relative", paddingTop: 66 }}>
        <MediaSlot
          tint={event.tint}
          label={`${event.title} — replace with event film`}
          style={{ minHeight: "min(78vh, 720px)" }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(transparent 35%, rgba(5,5,6,0.92))",
              zIndex: 1,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              maxWidth: "var(--container-wide)",
              margin: "0 auto",
              padding: "0 var(--gutter) clamp(40px, 6vh, 80px)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
              <Badge status={event.status} solid={event.status === "limited"} />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.6875rem",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--smoke)",
                }}
              >
                {event.type} · {event.city}
              </span>
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 900,
                fontSize: "clamp(2.75rem, 10vw, 8rem)",
                textTransform: "uppercase",
                letterSpacing: "-0.03em",
                lineHeight: 0.84,
                color: "var(--bone)",
              }}
            >
              {event.title}
            </h1>
            <div
              style={{
                marginTop: 22,
                display: "flex",
                gap: 28,
                flexWrap: "wrap",
                fontFamily: "var(--font-mono)",
                fontSize: "0.875rem",
                color: "var(--sand)",
              }}
            >
              <span>{event.dateLong}</span>
              <span>{event.venue}</span>
              <span>From {event.priceFrom}</span>
            </div>
          </div>
        </MediaSlot>
      </div>

      {/* Body + sticky panel */}
      <Section max="var(--container-wide)">
        <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "1.6fr 0.9fr", gap: "var(--section-gap)", alignItems: "start" }}>
          {/* Left column */}
          <div>
            <Reveal>
              <p style={{ fontSize: "1.25rem", lineHeight: 1.55, color: "var(--sand)", maxWidth: "56ch" }}>{event.blurb}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 22 }}>
                {event.genres.map((g) => (
                  <Tag key={g} size="sm">
                    {g}
                  </Tag>
                ))}
              </div>
            </Reveal>

            {/* Lineup */}
            <div style={{ marginTop: "var(--space-9)", position: "relative" }}>
              <SoundWaveField className="fx-layer" intensity={0.4} opacity={0.22} interactive />
              <div className="page-fx-content">
                <SectionLabel style={{ marginBottom: 20 }}>Line-up</SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "var(--grid-gap)" }}>
                  {event.artists.map((a) => (
                    <ArtistCard key={a.name} {...a} />
                  ))}
                </div>
              </div>
            </div>

            {/* Info */}
            <div style={{ marginTop: "var(--space-9)" }}>
              <SectionLabel style={{ marginBottom: 20 }}>Good to know</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--border-soft)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                {event.info.map(([k, v]) => (
                  <div key={k} style={{ background: "var(--surface-2)", padding: "20px 22px" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.625rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ember-500)" }}>
                      {k}
                    </div>
                    <div style={{ marginTop: 6, color: "var(--sand)", fontSize: "0.9375rem" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Map placeholder */}
            <div style={{ marginTop: "var(--space-9)" }}>
              <SectionLabel style={{ marginBottom: 20 }}>Location</SectionLabel>
              <MediaSlot
                tint="linear-gradient(135deg,#101a2e,#0a0a12)"
                label="Map — drop in real venue location"
                style={{ aspectRatio: "16 / 7", borderRadius: "var(--radius-md)" }}
              >
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", zIndex: 2 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.5rem", textTransform: "uppercase", color: "var(--bone)" }}>
                      {event.venue}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--smoke)", marginTop: 6 }}>
                      {event.city} · Malta
                    </div>
                  </div>
                </div>
              </MediaSlot>
            </div>

            {/* FAQ */}
            <div style={{ marginTop: "var(--space-9)" }}>
              <SectionLabel style={{ marginBottom: 20 }}>FAQ</SectionLabel>
              <div style={{ borderTop: "1px solid var(--border-soft)" }}>
                {event.faq.map(([q, a], i) => {
                  const open = openFaq === i;
                  return (
                    <div key={q} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                      <button
                        onClick={() => setOpenFaq(open ? null : i)}
                        data-cursor
                        style={{
                          width: "100%",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 16,
                          padding: "20px 0",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          color: "var(--text-strong)",
                          fontFamily: "var(--font-ui)",
                          fontWeight: 700,
                          fontSize: "1.0625rem",
                        }}
                      >
                        {q}
                        <span style={{ color: "var(--ember-500)", fontFamily: "var(--font-mono)", flex: "0 0 auto" }}>{open ? "−" : "+"}</span>
                      </button>
                      <div style={{ maxHeight: open ? 200 : 0, overflow: "hidden", transition: "max-height var(--dur-base) var(--ease-out)" }}>
                        <p style={{ paddingBottom: 20, color: "var(--text-muted)", maxWidth: "60ch", lineHeight: 1.6 }}>{a}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sticky purchase panel */}
          <aside className="detail-aside" style={{ position: "sticky", top: 90 }}>
            <div style={{ background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-lg)", padding: "22px", boxShadow: "var(--shadow-lg)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
                <SectionLabel>Tickets</SectionLabel>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--text-faint)" }}>{event.date}</span>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {event.tiers.map((t) => (
                  <TicketTierCard
                    key={t.id}
                    {...t}
                    selected={selected === t.id}
                    quantity={qty[t.id] ?? 0}
                    onSelect={() => setSelected(t.id)}
                    onQuantity={(n) => setQty((q) => ({ ...q, [t.id]: n }))}
                  />
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--border-soft)" }}>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.625rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-faint)" }}>
                    {count > 0 ? `${count} ticket${count === 1 ? "" : "s"}` : "Total"}
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.75rem", color: "var(--text-strong)" }}>
                    {formatEuro(total)}
                  </div>
                </div>
                <Button variant="primary" onClick={checkout} disabled={event.status === "soldout"}>
                  {event.status === "soldout" ? "Join waitlist" : "Buy tickets"}
                </Button>
              </div>
              <p style={{ marginTop: 14, fontSize: "0.75rem", color: "var(--text-faint)", lineHeight: 1.5 }}>
                Secure checkout · QR ticket to your wallet · Transferable up to 48h before.
              </p>
            </div>
          </aside>
        </div>
      </Section>

      {/* Similar events */}
      {similar.length ? (
        <Section max="var(--container-wide)" style={{ paddingTop: 0 }}>
          <SectionLabel style={{ marginBottom: 24 }}>You might also like</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "var(--grid-gap)" }}>
            {similar.map((e) => (
              <EventCard key={e.slug} event={e} />
            ))}
          </div>
          <div style={{ marginTop: 40 }}>
            <Link href="/events" style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ember-500)" }} data-cursor>
              ← All events
            </Link>
          </div>
        </Section>
      ) : null}

      <style>{`@media (max-width: 960px){.detail-grid{grid-template-columns:1fr!important}.detail-aside{position:static!important}}`}</style>
    </>
  );
}
