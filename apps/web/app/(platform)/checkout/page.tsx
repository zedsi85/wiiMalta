"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MoodSetter } from "@/components/layout/MoodSetter";
import AccessParticles from "@/components/webgl/AccessParticles";
import { Section } from "@/components/ui/Section";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { QuantitySelector } from "@/components/ui/QuantitySelector";
import { QRTicket } from "@/components/ui/QRTicket";
import { getCart, clearCart, priceValue, formatEuro, type Cart, type CartLine } from "@/lib/cart";

const STEPS = ["Tickets", "Details", "Payment"];
const PROMO = "WII10"; // 10% off demo code

export default function CheckoutPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [promo, setPromo] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [holder, setHolder] = useState("");

  useEffect(() => {
    setCart(
      getCart() ?? {
        slug: "sunset-iv",
        eventTitle: "Sunset Sessions IV",
        date: "SAT · 12 JUL · 22:00",
        venue: "Cave 12 — Gozo",
        lines: [{ tierId: "ga", name: "General Admission", price: "€45", qty: 1 }],
      }
    );
  }, []);

  const setQty = (tierId: string, qty: number) =>
    setCart((c) =>
      c ? { ...c, lines: c.lines.map((l) => (l.tierId === tierId ? { ...l, qty } : l)) } : c
    );

  const lines: CartLine[] = useMemo(() => cart?.lines.filter((l) => l.qty > 0) ?? [], [cart]);
  const subtotal = lines.reduce((s, l) => s + priceValue(l.price) * l.qty, 0);
  const fee = subtotal > 0 ? Math.round(subtotal * 0.08 * 100) / 100 : 0;
  const discount = promoApplied ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
  const total = Math.max(0, subtotal + fee - discount);
  const count = useMemo(() => lines.reduce((s, l) => s + l.qty, 0), [lines]);

  const applyPromo = () => setPromoApplied(promo.trim().toUpperCase() === PROMO);

  if (!cart) return null;

  // ---- Confirmation state ----
  if (done) {
    return (
      <>
        <MoodSetter mood="community" />
        <Section max="var(--container-narrow)" style={{ paddingTop: "clamp(120px, 18vh, 200px)", textAlign: "center" }}>
          <SectionLabel style={{ marginBottom: 16 }}>Order confirmed · #WII-{Math.floor(1000 + Math.random() * 9000)}</SectionLabel>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(2.25rem,7vw,4.5rem)", textTransform: "uppercase", letterSpacing: "-0.03em", lineHeight: 0.9, color: "var(--bone)" }}>
            You&apos;re in.
          </h1>
          <p style={{ marginTop: 18, color: "var(--sand)", maxWidth: "44ch", margin: "18px auto 0", lineHeight: 1.6 }}>
            Your QR ticket is on its way to your inbox and lives in your account. Add it to your
            wallet and we&apos;ll see you after dark.
          </p>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
            <QRTicket
              event={cart.eventTitle}
              date={cart.date}
              venue={cart.venue}
              tier={lines[0]?.name ?? "General Admission"}
              holder={holder || "Guest"}
              ticketId={`${(lines[0]?.vip ? "VIP" : "GA")}-${Math.floor(100 + Math.random() * 900)}`}
            />
          </div>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 40, flexWrap: "wrap" }}>
            <Button href="/events" variant="primary">
              Browse more events
            </Button>
            <Button href="/" variant="secondary" onClick={() => clearCart()}>
              Back home
            </Button>
          </div>
        </Section>
      </>
    );
  }

  return (
    <>
      <AccessParticles className="fx-layer" mode="checkout" density={34} opacity={0.16} interactive />
      <div className="page-fx-content">
      <MoodSetter mood="ticketing" />
      <Section max="var(--container)" style={{ paddingTop: "clamp(110px, 16vh, 190px)" }}>
        {/* Header + stepper */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap", marginBottom: "var(--space-7)" }}>
          <div>
            <SectionLabel style={{ marginBottom: 12 }}>Checkout</SectionLabel>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(2rem,5vw,3.25rem)", textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 0.92, color: "var(--bone)" }}>
              {cart.eventTitle}
            </h1>
            <div style={{ marginTop: 10, fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-muted)" }}>
              {cart.date} · {cart.venue}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {STEPS.map((s, i) => (
              <div
                key={s}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.6875rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: i === step ? "var(--bone)" : i < step ? "var(--ember-500)" : "var(--text-faint)",
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "999px",
                    display: "grid",
                    placeItems: "center",
                    border: `1px solid ${i <= step ? "var(--ember-500)" : "var(--border)"}`,
                    background: i < step ? "var(--ember-500)" : "transparent",
                    color: i < step ? "var(--void)" : "inherit",
                  }}
                >
                  {i < step ? "✓" : i + 1}
                </span>
                {s}
              </div>
            ))}
          </div>
        </div>

        <div className="checkout-grid" style={{ display: "grid", gridTemplateColumns: "1.5fr 0.9fr", gap: "var(--section-gap)", alignItems: "start" }}>
          {/* Left: step content */}
          <div>
            {step === 0 && (
              <div style={{ display: "grid", gap: 12 }}>
                {cart.lines.map((l) => (
                  <div
                    key={l.tierId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 16,
                      padding: "18px 20px",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border-soft)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.0625rem", textTransform: "uppercase", color: "var(--text-strong)" }}>
                        {l.name} {l.vip ? <span style={{ color: "var(--gold-500)" }}>· VIP</span> : null}
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--ember-500)", marginTop: 4 }}>{l.price}</div>
                    </div>
                    <QuantitySelector value={l.qty} min={0} max={8} onChange={(n) => setQty(l.tierId, n)} />
                  </div>
                ))}
              </div>
            )}

            {step === 1 && (
              <div style={{ display: "grid", gap: 16, maxWidth: 520 }}>
                <Input label="Full name" placeholder="Your name" value={holder} onChange={(e) => setHolder(e.target.value)} required autoComplete="name" />
                <Input label="Email" type="email" placeholder="you@domain.com" required autoComplete="email" hint="Your QR ticket is sent here." />
                <Input label="Phone" type="tel" placeholder="+356 …" autoComplete="tel" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Input label="City" placeholder="Valletta" />
                  <Input label="Date of birth" type="date" hint="21+ event." />
                </div>
              </div>
            )}

            {step === 2 && (
              <div style={{ display: "grid", gap: 16, maxWidth: 520 }}>
                <div
                  style={{
                    padding: "14px 16px",
                    border: "1px solid var(--border-soft)",
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(46,107,255,0.06)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.75rem",
                    color: "var(--azure-300)",
                  }}
                >
                  ◉ Demo only — no real payment is processed. Wire up Stripe here.
                </div>
                <Input label="Card number" placeholder="4242 4242 4242 4242" suffix="VISA" autoComplete="cc-number" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Input label="Expiry" placeholder="MM / YY" autoComplete="cc-exp" />
                  <Input label="CVC" placeholder="123" autoComplete="cc-csc" />
                </div>
                <Input label="Name on card" placeholder="Your name" autoComplete="cc-name" />
              </div>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: "var(--space-7)" }}>
              {step > 0 && (
                <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
                  Back
                </Button>
              )}
              {step < 2 ? (
                <Button variant="primary" disabled={count === 0} onClick={() => setStep((s) => s + 1)}>
                  {count === 0 ? "Add a ticket" : "Continue"}
                </Button>
              ) : (
                <Button variant="primary" onClick={() => setDone(true)}>
                  Pay {formatEuro(total)}
                </Button>
              )}
            </div>
          </div>

          {/* Right: order summary */}
          <aside className="checkout-aside" style={{ position: "sticky", top: 90 }}>
            <div style={{ background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-lg)", padding: 22 }}>
              <SectionLabel style={{ marginBottom: 18 }}>Order summary</SectionLabel>
              <div style={{ display: "grid", gap: 10 }}>
                {lines.length ? (
                  lines.map((l) => (
                    <Row key={l.tierId} label={`${l.qty} × ${l.name}`} value={formatEuro(priceValue(l.price) * l.qty)} />
                  ))
                ) : (
                  <span style={{ color: "var(--text-faint)", fontSize: "0.875rem" }}>No tickets selected.</span>
                )}
              </div>

              {/* Promo */}
              <div style={{ display: "flex", gap: 8, marginTop: 18, alignItems: "flex-end" }}>
                <Input label="Promo code" placeholder={PROMO} value={promo} onChange={(e) => setPromo(e.target.value)} style={{ flex: 1 }} />
                <Button variant="secondary" size="md" onClick={applyPromo}>
                  Apply
                </Button>
              </div>
              {promo && (
                <div style={{ marginTop: 8, fontSize: "0.75rem", color: promoApplied ? "var(--go-500)" : "var(--text-faint)" }}>
                  {promoApplied ? "✓ 10% community discount applied" : "Enter a valid code"}
                </div>
              )}

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border-soft)", display: "grid", gap: 10 }}>
                <Row label="Subtotal" value={formatEuro(subtotal)} muted />
                <Row label="Booking fee" value={formatEuro(fee)} muted />
                {discount > 0 && <Row label="Discount" value={`– ${formatEuro(discount)}`} muted />}
              </div>
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>Total</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.75rem", color: "var(--text-strong)" }}>{formatEuro(total)}</span>
              </div>
            </div>
            <Link href="/events" style={{ display: "inline-block", marginTop: 18, fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }} data-cursor>
              ← Keep browsing
            </Link>
          </aside>
        </div>
      </Section>

      <style>{`@media (max-width: 900px){.checkout-grid{grid-template-columns:1fr!important}.checkout-aside{position:static!important}}`}</style>
      </div>
    </>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: "0.875rem", color: muted ? "var(--text-muted)" : "var(--text)" }}>
      <span>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)" }}>{value}</span>
    </div>
  );
}
