"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoodSetter } from "@/components/layout/MoodSetter";
import AccessParticles from "@/components/webgl/AccessParticles";
import { Section } from "@/components/ui/Section";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { QuantitySelector } from "@/components/ui/QuantitySelector";
import { getCart, priceValue, formatEuro, type Cart, type CartLine } from "@/lib/cart";

const STEPS = ["Tickets", "Details", "Payment"];

interface DraftInfo {
  orderId: string;
  key: string;
  totalCents: number;
  expiresAt: string | null;
  /** Lines snapshot the draft was created from — changes invalidate it. */
  fingerprint: string;
}

interface PayInfo {
  provider: "mock" | "revolut";
  clientToken: string;
  expiresAt: string;
}

const fingerprint = (lines: CartLine[]) =>
  lines.map((l) => `${l.tierId}:${l.qty}`).sort().join("|");

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [step, setStep] = useState(0);
  const [holder, setHolder] = useState("");
  const [email, setEmail] = useState("");
  const [draft, setDraft] = useState<DraftInfo | null>(null);
  const [pay, setPay] = useState<PayInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [paidRedirect, setPaidRedirect] = useState(false);

  useEffect(() => {
    setCart(getCart());
  }, []);

  // Countdown tick
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const setQty = (tierId: string, qty: number) =>
    setCart((c) =>
      c ? { ...c, lines: c.lines.map((l) => (l.tierId === tierId ? { ...l, qty } : l)) } : c
    );

  const lines: CartLine[] = useMemo(() => cart?.lines.filter((l) => l.qty > 0) ?? [], [cart]);
  const count = useMemo(() => lines.reduce((s, l) => s + l.qty, 0), [lines]);
  const localSubtotal = lines.reduce((s, l) => s + priceValue(l.price) * l.qty, 0);
  const total = draft ? draft.totalCents / 100 : localSubtotal;

  const expiresMs = draft?.expiresAt ? new Date(pay?.expiresAt ?? draft.expiresAt).getTime() : null;
  const remaining = expiresMs ? Math.max(0, expiresMs - now) : null;
  const lapsed = remaining !== null && remaining === 0 && !paidRedirect;
  const countdown =
    remaining !== null
      ? `${Math.floor(remaining / 60000)}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0")}`
      : null;

  /* ---- Step 0 → 1: create/refresh the draft order (O1) ---- */
  const reserve = useCallback(async () => {
    if (!cart) return;
    setError(null);
    const fp = fingerprint(lines);
    if (draft && draft.fingerprint === fp && !lapsed) {
      setStep(1);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: cart.slug,
          lines: lines.map((l) => ({ tierId: l.tierId, qty: l.qty })),
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(
          json.error === "insufficient_stock"
            ? "Not enough tickets left for that selection — someone beat you to it."
            : "Couldn't reserve tickets. Try again."
        );
        return;
      }
      setDraft({
        orderId: json.orderId,
        key: json.key,
        totalCents: json.totalCents,
        expiresAt: json.expiresAt,
        fingerprint: fp,
      });
      setPay(null);
      setStep(1);
    } finally {
      setBusy(false);
    }
  }, [cart, lines, draft, lapsed]);

  /* ---- Step 1 → 2: begin payment (O2) ---- */
  const startPayment = useCallback(async () => {
    if (!draft) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${draft.orderId}/pay?key=${draft.key}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(
          json.error === "holds_lapsed"
            ? "Your reservation lapsed — pick your tickets again."
            : "Couldn't start payment. Try again."
        );
        if (json.error === "holds_lapsed") {
          setDraft(null);
          setStep(0);
        }
        return;
      }
      setPay({ provider: json.provider, clientToken: json.clientToken, expiresAt: json.expiresAt });
      setStep(2);
    } finally {
      setBusy(false);
    }
  }, [draft, email]);

  /* ---- Poll until the webhook marks the order paid, then hand over ---- */
  const pollUntilPaid = useCallback(async () => {
    if (!draft) return;
    setPaidRedirect(true);
    for (let i = 0; i < 40; i++) {
      const res = await fetch(`/api/orders/${draft.orderId}?key=${draft.key}`, { cache: "no-store" });
      if (res.ok) {
        const view = await res.json();
        if (view.status === "paid") {
          router.push(`/orders/${draft.orderId}?key=${draft.key}`);
          return;
        }
        if (view.status === "expired" || view.status === "refunded") break;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    setPaidRedirect(false);
    setError("Payment confirmation is taking longer than expected — check your email, or retry.");
  }, [draft, router]);

  /* ---- Mock payment (dev) ---- */
  const mockPay = useCallback(async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/mock-pay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId: draft.orderId, key: draft.key }),
      });
      const json = await res.json();
      if (!res.ok || json.outcome === "refund_required") {
        setError("Simulated payment failed.");
        return;
      }
      await pollUntilPaid();
    } finally {
      setBusy(false);
    }
  }, [draft, pollUntilPaid]);

  /* ---- Revolut widget ---- */
  const revolutMounted = useRef(false);
  const rcRef = useRef<{ payWithPopup: (o: Record<string, unknown>) => void } | null>(null);
  useEffect(() => {
    if (step !== 2 || !pay || pay.provider !== "revolut" || revolutMounted.current) return;
    revolutMounted.current = true;
    (async () => {
      const { default: RevolutCheckout } = await import("@revolut/checkout");
      const mode = process.env.NEXT_PUBLIC_REVOLUT_MODE === "prod" ? "prod" : "sandbox";
      const rc = await RevolutCheckout(pay.clientToken, mode);
      const target = document.getElementById("revolut-pay-target");
      // Revolut Pay + Apple/Google Pay buttons (availability varies by device/domain)
      try {
        if (target) {
          rc.revolutPay?.({
            target,
            onSuccess: () => void pollUntilPaid(),
            onError: () => setError("Revolut Pay failed — try card instead."),
          });
        }
      } catch {
        /* button unavailable — card popup below still works */
      }
      try {
        const prTarget = document.getElementById("payment-request-target");
        if (prTarget) {
          rc.paymentRequest?.({
            target: prTarget,
            onSuccess: () => void pollUntilPaid(),
            onError: () => {},
          });
        }
      } catch {
        /* Apple/Google Pay needs a registered HTTPS domain */
      }
      rcRef.current = rc as unknown as { payWithPopup: (o: Record<string, unknown>) => void };
    })().catch(() => setError("Couldn't load the payment widget."));
    return () => {
      revolutMounted.current = false;
    };
  }, [step, pay, email, pollUntilPaid]);

  if (!cart) {
    return (
      <Section max="var(--container-narrow)" style={{ paddingTop: "clamp(120px, 18vh, 200px)", textAlign: "center" }}>
        <SectionLabel style={{ marginBottom: 16 }}>Checkout</SectionLabel>
        <p style={{ color: "var(--sand)" }}>Your night starts from an event page.</p>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
          <Button href="/events" variant="primary">Browse events</Button>
        </div>
      </Section>
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
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: "0.6875rem", letterSpacing: "0.12em", textTransform: "uppercase", color: i === step ? "var(--bone)" : i < step ? "var(--ember-500)" : "var(--text-faint)" }}>
                <span style={{ width: 22, height: 22, borderRadius: "999px", display: "grid", placeItems: "center", border: `1px solid ${i <= step ? "var(--ember-500)" : "var(--border)"}`, background: i < step ? "var(--ember-500)" : "transparent", color: i < step ? "var(--void)" : "inherit" }}>
                  {i < step ? "✓" : i + 1}
                </span>
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* Reservation countdown / lapse notice */}
        {draft && countdown && !lapsed && step > 0 && (
          <div style={{ marginBottom: 20, fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase", color: remaining! < 120000 ? "var(--ember-500)" : "var(--text-muted)" }}>
            ◷ Tickets reserved · {countdown}
          </div>
        )}
        {lapsed && (
          <div style={{ marginBottom: 20, padding: "12px 16px", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-sm)", background: "rgba(255,77,31,0.08)", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--ember-300)" }}>
            Your reservation lapsed — stock was released.{" "}
            <button onClick={() => { setDraft(null); setPay(null); setStep(0); }} style={{ textDecoration: "underline", color: "inherit" }}>
              Pick tickets again
            </button>
          </div>
        )}
        {error && (
          <div style={{ marginBottom: 20, padding: "12px 16px", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-sm)", background: "rgba(255,77,31,0.08)", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--ember-300)" }}>
            {error}
          </div>
        )}

        <div className="checkout-grid" style={{ display: "grid", gridTemplateColumns: "1.5fr 0.9fr", gap: "var(--section-gap)", alignItems: "start" }}>
          {/* Left: step content */}
          <div>
            {step === 0 && (
              <div style={{ display: "grid", gap: 12 }}>
                {cart.lines.map((l) => (
                  <div key={l.tierId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "18px 20px", background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-md)" }}>
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
                <Input label="Email" type="email" placeholder="you@domain.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" hint="Your QR tickets live at a private link sent here." />
              </div>
            )}

            {step === 2 && pay && (
              <div style={{ display: "grid", gap: 16, maxWidth: 520 }}>
                {pay.provider === "mock" ? (
                  <>
                    <div style={{ padding: "14px 16px", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-sm)", background: "rgba(46,107,255,0.06)", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--azure-300)" }}>
                      ◉ Mock payment mode (local dev) — no money moves. Set PAYMENT_PROVIDER=revolut to use the Revolut sandbox.
                    </div>
                    <Button variant="primary" disabled={busy || paidRedirect} onClick={mockPay}>
                      {paidRedirect ? "Confirming…" : `Pay ${formatEuro(total)} (simulated)`}
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Apple Pay / Google Pay (shows only on eligible device + registered domain) */}
                    <div id="payment-request-target" />
                    {/* Revolut Pay */}
                    <div id="revolut-pay-target" />
                    <Button
                      variant="primary"
                      disabled={paidRedirect}
                      onClick={() =>
                        rcRef.current?.payWithPopup({
                          email,
                          onSuccess: () => void pollUntilPaid(),
                          onError: () => setError("Payment failed — nothing was charged. Try again."),
                          onCancel: () => {},
                        })
                      }
                    >
                      {paidRedirect ? "Confirming…" : `Pay ${formatEuro(total)} by card`}
                    </Button>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--text-faint)" }}>
                      Payments are processed by Revolut. Card data never touches our servers.
                    </div>
                  </>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: "var(--space-7)" }}>
              {step > 0 && (
                <Button variant="secondary" onClick={() => setStep((s) => s - 1)} disabled={busy || paidRedirect}>
                  Back
                </Button>
              )}
              {step === 0 && (
                <Button variant="primary" disabled={count === 0 || busy} onClick={reserve}>
                  {busy ? "Reserving…" : count === 0 ? "Add a ticket" : "Reserve & continue"}
                </Button>
              )}
              {step === 1 && (
                <Button variant="primary" disabled={busy || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)} onClick={startPayment}>
                  {busy ? "Preparing payment…" : "Continue to payment"}
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
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>Total</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.75rem", color: "var(--text-strong)" }}>{formatEuro(total)}</span>
              </div>
              {draft && (
                <div style={{ marginTop: 10, fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--text-faint)" }}>
                  Order {draft.orderId.slice(0, 8)} · price locked
                </div>
              )}
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
