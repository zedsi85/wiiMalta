import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Haptics from "expo-haptics";
import { Api, ApiError } from "@/lib/api";
import { c, font, r } from "@/lib/theme";
import { usePop } from "@/lib/motion";
import { useEvent } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { priceValue } from "@/lib/discover";
import { BrandButton, EmptyState, Eyebrow, H1, Screen, Skeleton } from "@/components/ui";
import { FadeIn, PressScale } from "@/components/motion";

/**
 * Checkout — a thin client over the EXISTING order engine:
 * reserve (holds + countdown) → begin payment → Revolut hosted checkout →
 * poll order status. The backend is the only judge of "paid"; the client
 * never shows success before the server confirms, and every request is
 * guarded against double submission.
 */
type Stage = "select" | "email" | "pay" | "confirming" | "done" | "lapsed";
const STEP_LABEL: Record<Stage, string> = { select: "1 · Tickets", email: "2 · Details", pay: "3 · Payment", confirming: "3 · Payment", done: "Done", lapsed: "Reservation lapsed" };
const MAX_PER_TIER = 8; // server enforces the real cap per tier; this only shapes the stepper

function Stepper({ value, onChange, max, disabled, label }: { value: number; onChange: (n: number) => void; max: number; disabled?: boolean; label: string }) {
  const pop = usePop();
  const set = (n: number) => {
    void Haptics.selectionAsync();
    pop.pop();
    onChange(n);
  };
  const btn = (txt: string, on: () => void, off: boolean, a11y: string) => (
    <Pressable disabled={off} hitSlop={8} onPress={on} accessibilityRole="button" accessibilityLabel={a11y} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: off ? c.graphite : c.slate, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: off ? c.steel : c.bone, fontSize: 22, lineHeight: 24 }}>{txt}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {btn("−", () => set(value - 1), disabled || value === 0, `Remove one ${label}`)}
      <Animated.Text style={[{ fontFamily: font.monoBold, fontSize: 18, color: c.bone, minWidth: 24, textAlign: "center" }, pop.style]}>{value}</Animated.Text>
      {btn("+", () => set(value + 1), disabled || value >= max, `Add one ${label}`)}
    </View>
  );
}

export default function CheckoutScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data } = useEvent(slug ?? "");
  const { email: accountEmail } = useAuth();

  const [qty, setQty] = useState<Record<string, number>>({});
  const [stage, setStage] = useState<Stage>("select");
  const [email, setEmail] = useState(accountEmail ?? "");
  const [order, setOrder] = useState<{ orderId: string; key: string; totalCents: number; expiresAt: string | null } | null>(null);
  const [pay, setPay] = useState<{ provider: string; checkoutUrl?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const idem = useRef<string>(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const totalPop = usePop();

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const e = data?.event;
  const lines = Object.entries(qty).filter(([, n]) => n > 0).map(([tierId, n]) => ({ tierId, qty: n }));
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const totalLocal = (e?.tiers ?? []).reduce((sum, t) => sum + (qty[t.id] ?? 0) * priceValue(t.price), 0);
  useEffect(() => { totalPop.pop(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [totalLocal]);

  const remaining = order?.expiresAt ? Math.max(0, new Date(order.expiresAt).getTime() - now) : null;
  useEffect(() => {
    if (remaining === 0 && (stage === "email" || stage === "pay")) setStage("lapsed");
  }, [remaining, stage]);
  const countdown = remaining !== null ? `${Math.floor(remaining / 60000)}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0")}` : null;

  const guard = async (fn: () => Promise<void>) => {
    if (busy) return; // double-tap guard
    setBusy(true);
    setError(null);
    try { await fn(); } finally { setBusy(false); }
  };

  const reserve = useCallback(() => guard(async () => {
    if (!e || lines.length === 0) return;
    try {
      const res = await Api.createOrder(e.slug, lines, idem.current);
      setOrder(res);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStage("email");
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      setError(code === "insufficient_stock" ? "Not enough tickets left for that selection — someone beat you to it." : code === "qty_limit" ? `That's over the per-order limit for this ticket.` : code === "tier_unavailable" ? "That ticket isn't on sale right now." : "Couldn't reserve tickets. Check your connection and try again.");
    }
  }), [e, lines]); // eslint-disable-line react-hooks/exhaustive-deps

  const pollUntilPaid = useCallback(async (orderId: string, key: string) => {
    setStage("confirming");
    for (let i = 0; i < 60; i++) {
      try {
        const view = await Api.orderStatus(orderId, key);
        if (view.status === "paid") {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setStage("done");
          return;
        }
        if (view.status === "expired") { setStage("lapsed"); return; }
        if (view.status === "refunded" || view.status === "cancelled") break;
      } catch { /* transient — keep polling */ }
      await new Promise((res) => setTimeout(res, 2000));
    }
    setStage("pay");
    setError("Payment not confirmed yet. If you completed it, check My Tickets in a minute — otherwise open payment again.");
  }, []);

  const startPayment = useCallback(() => guard(async () => {
    if (!order) return;
    try {
      const res = await Api.beginPayment(order.orderId, order.key, email);
      setPay(res);
      setStage("pay");
      if (res.provider === "mock") return;
      if (res.checkoutUrl) {
        await WebBrowser.openBrowserAsync(res.checkoutUrl, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET });
        void pollUntilPaid(order.orderId, order.key);
      } else setError("Payment page unavailable — try again.");
    } catch (err) {
      if (err instanceof ApiError && err.code === "holds_lapsed") setStage("lapsed");
      else setError("Couldn't start payment. Try again.");
    }
  }), [order, email, pollUntilPaid]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!e) {
    return <Screen style={{ padding: 20, paddingTop: 80 }}><Skeleton height={300} /></Screen>;
  }
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Pressable hitSlop={12} onPress={() => (stage === "email" ? setStage("select") : router.back())} accessibilityRole="button" accessibilityLabel="Back">
            <Text style={{ color: c.fog, fontFamily: font.mono, fontSize: 12 }}>← {stage === "email" ? "Change tickets" : e.title}</Text>
          </Pressable>
          <View style={{ marginTop: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
            <View>
              <Eyebrow>{STEP_LABEL[stage]}</Eyebrow>
              <H1>{stage === "done" ? "You're in." : stage === "lapsed" ? "Lapsed" : "Your night"}</H1>
            </View>
            {countdown && stage !== "done" && stage !== "lapsed" && (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: 2, color: c.fog }}>RESERVED FOR</Text>
                <Text style={{ fontFamily: font.monoBold, fontSize: 18, color: remaining! < 120000 ? c.ember : c.sand }}>{countdown}</Text>
              </View>
            )}
          </View>
          {error && (
            <FadeIn distance={6}>
              <Text accessibilityLiveRegion="polite" style={{ color: c.ember300, fontFamily: font.ui, fontSize: 13, marginTop: 12, lineHeight: 19 }}>{error}</Text>
            </FadeIn>
          )}

          {stage === "select" && (
            <FadeIn key="select" distance={10}>
              {e.tiers.map((t) => {
                const n = qty[t.id] ?? 0;
                const soldOut = t.status === "soldout" || t.status === "invite";
                return (
                  <View key={t.id} style={{ flexDirection: "row", alignItems: "center", backgroundColor: n > 0 ? c.graphite : c.charcoal, borderRadius: r.md, padding: 16, marginTop: 12, opacity: soldOut ? 0.5 : 1, borderWidth: 1, borderColor: n > 0 ? c.ember600 : "transparent" }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ fontFamily: font.uiBold, fontSize: 15, color: c.bone }}>{t.name}</Text>
                      <Text style={{ fontFamily: font.monoBold, fontSize: 13, color: c.ember300, marginTop: 2 }}>{t.price}{t.note ? `  ·  ${t.note}` : ""}</Text>
                      {t.perks.length > 0 && <Text style={{ fontFamily: font.ui, fontSize: 12, color: c.fog, marginTop: 4 }}>{t.perks.join(" · ")}</Text>}
                    </View>
                    <Stepper value={n} max={MAX_PER_TIER} disabled={soldOut} label={t.name} onChange={(v) => setQty({ ...qty, [t.id]: v })} />
                  </View>
                );
              })}
              {count > 0 && (
                <View style={{ marginTop: 18, backgroundColor: c.ink, borderRadius: r.md, borderWidth: 1, borderColor: c.graphite, padding: 14, gap: 6 }}>
                  {e.tiers.filter((t) => (qty[t.id] ?? 0) > 0).map((t) => (
                    <View key={t.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontFamily: font.ui, fontSize: 13, color: c.fog }}>{qty[t.id]} × {t.name}</Text>
                      <Text style={{ fontFamily: font.mono, fontSize: 13, color: c.sand }}>€{(qty[t.id] * priceValue(t.price)).toFixed(2)}</Text>
                    </View>
                  ))}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: c.graphite, paddingTop: 8, marginTop: 4 }}>
                    <Text style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: 1.5, color: c.fog }}>TOTAL · NO FEES</Text>
                    <Animated.Text style={[{ fontFamily: font.displayBlack, fontSize: 20, color: c.bone }, totalPop.style]}>€{totalLocal.toFixed(2)}</Animated.Text>
                  </View>
                </View>
              )}
              <Text style={{ fontFamily: font.mono, fontSize: 11, color: c.ash, marginTop: 14, lineHeight: 16 }}>Reserving holds your tickets for 10 minutes while you pay. The price is locked at reservation.</Text>
              <View style={{ marginTop: 18 }}>
                <BrandButton title={count ? `Reserve ${count} · €${totalLocal.toFixed(2)}` : "Pick your tickets"} disabled={count === 0} busy={busy} onPress={() => void reserve()} />
              </View>
            </FadeIn>
          )}

          {stage === "email" && order && (
            <FadeIn key="email" distance={10} style={{ marginTop: 20, gap: 14 }}>
              <Text style={{ fontFamily: font.ui, fontSize: 14, color: c.sand, lineHeight: 20 }}>
                {count} ticket{count === 1 ? "" : "s"} held · total <Text style={{ fontFamily: font.monoBold }}>€{(order.totalCents / 100).toFixed(2)}</Text>. Your QR tickets will be sent to:
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@domain.com"
                placeholderTextColor={c.ash}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="done"
                accessibilityLabel="Email for tickets"
                style={{ backgroundColor: c.charcoal, borderRadius: r.md, borderWidth: 1, borderColor: email && !emailOk ? c.ember600 : c.slate, color: c.bone, fontFamily: font.ui, fontSize: 16, padding: 14, minHeight: 50 }}
              />
              {email.length > 3 && !emailOk && <Text style={{ fontFamily: font.ui, fontSize: 12, color: c.ember300 }}>That doesn't look like an email address.</Text>}
              <BrandButton title="Continue to payment" disabled={!emailOk} busy={busy} onPress={() => void startPayment()} />
            </FadeIn>
          )}

          {stage === "pay" && pay && (
            <FadeIn key="pay" distance={10} style={{ marginTop: 20, gap: 14 }}>
              {pay.provider === "mock" ? (
                <>
                  <Text style={{ fontFamily: font.mono, fontSize: 12, color: c.azure }}>◉ Dev environment — simulated payment.</Text>
                  <BrandButton title={`Pay €${((order?.totalCents ?? 0) / 100).toFixed(2)} (simulated)`} busy={busy} onPress={() => void guard(async () => { if (!order) return; await Api.mockPay(order.orderId, order.key); void pollUntilPaid(order.orderId, order.key); })} />
                </>
              ) : (
                <BrandButton title="Open secure payment" busy={busy} onPress={() => void startPayment()} />
              )}
              <Text style={{ fontFamily: font.mono, fontSize: 11, color: c.fog, lineHeight: 16 }}>Payments are processed by Revolut. Card data never touches Wii servers. Closed the payment page? Open it again — your reservation is still held.</Text>
            </FadeIn>
          )}

          {stage === "confirming" && (
            <FadeIn key="confirming" style={{ marginTop: 24, gap: 10 }}>
              <Text style={{ fontFamily: font.mono, fontSize: 13, color: c.sand }}>◌ Confirming with the server…</Text>
              <Text style={{ fontFamily: font.ui, fontSize: 13, color: c.fog, lineHeight: 19 }}>Your payment isn't final until our server receives Revolut's confirmation — usually a few seconds.</Text>
            </FadeIn>
          )}

          {stage === "done" && (
            <FadeIn key="done" style={{ marginTop: 20, gap: 14 }}>
              <PressScale haptic="none" style={{ backgroundColor: c.charcoal, borderRadius: r.lg, padding: 18, borderWidth: 1, borderColor: c.go }}>
                <Text style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: 2, color: c.go }}>PAYMENT CONFIRMED</Text>
                <Text style={{ fontFamily: font.ui, fontSize: 15, color: c.sand, lineHeight: 22, marginTop: 8 }}>Your tickets are minted and already in your wallet. A confirmation email is on its way to {email}.</Text>
              </PressScale>
              <BrandButton title="Open my tickets" onPress={() => router.replace("/(tabs)/tickets")} />
            </FadeIn>
          )}

          {stage === "lapsed" && (
            <FadeIn key="lapsed" style={{ marginTop: 20, gap: 14 }}>
              <EmptyState title="Reservation lapsed" body="The 10-minute hold ended and your tickets went back on sale. Nothing was charged. Your selection is kept — reserve again." />
              <BrandButton title="Reserve again" onPress={() => { idem.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`; setOrder(null); setPay(null); setError(null); setStage("select"); }} />
            </FadeIn>
          )}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
