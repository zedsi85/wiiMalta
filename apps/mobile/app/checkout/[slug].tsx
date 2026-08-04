import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Haptics from "expo-haptics";
import { Api, ApiError } from "@/lib/api";
import { c, font, r } from "@/lib/theme";
import { useEvent } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { BrandButton, EmptyState, Eyebrow, H1, Screen, Skeleton } from "@/components/ui";

/**
 * Checkout — a thin client over the EXISTING order engine:
 * reserve (holds+countdown) → begin payment → Revolut hosted checkout →
 * poll order status. The backend is the only judge of "paid".
 */
type Stage = "select" | "email" | "pay" | "confirming" | "done" | "lapsed" | "error";

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
  const [now, setNow] = useState(Date.now());
  const idem = useRef<string>(`${Date.now()}-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const e = data?.event;
  const lines = Object.entries(qty)
    .filter(([, n]) => n > 0)
    .map(([tierId, n]) => ({ tierId, qty: n }));
  const totalLocal = (e?.tiers ?? []).reduce((sum, t) => sum + (qty[t.id] ?? 0) * (parseFloat(t.price.replace("€", "")) || 0), 0);

  const remaining = order?.expiresAt ? Math.max(0, new Date(order.expiresAt).getTime() - now) : null;
  useEffect(() => {
    if (remaining === 0 && (stage === "email" || stage === "pay")) setStage("lapsed");
  }, [remaining, stage]);
  const countdown = remaining !== null ? `${Math.floor(remaining / 60000)}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0")}` : null;

  const reserve = useCallback(async () => {
    if (!e || lines.length === 0) return;
    setError(null);
    try {
      const res = await Api.createOrder(e.slug, lines, idem.current);
      setOrder(res);
      setStage("email");
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === "insufficient_stock"
          ? "Not enough tickets left for that selection — someone beat you to it."
          : "Couldn't reserve tickets. Check your connection and try again."
      );
    }
  }, [e, lines]);

  const pollUntilPaid = useCallback(
    async (orderId: string, key: string) => {
      setStage("confirming");
      for (let i = 0; i < 60; i++) {
        try {
          const view = await Api.orderStatus(orderId, key);
          if (view.status === "paid") {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setStage("done");
            return;
          }
          if (view.status === "expired" || view.status === "refunded") break;
        } catch {
          /* transient — keep polling */
        }
        await new Promise((res) => setTimeout(res, 2000));
      }
      setStage("pay");
      setError("Payment not confirmed yet — if you completed it, pull My Tickets in a minute; otherwise retry.");
    },
    []
  );

  const startPayment = useCallback(async () => {
    if (!order) return;
    setError(null);
    try {
      const res = await Api.beginPayment(order.orderId, order.key, email);
      setPay(res);
      setStage("pay");
      if (res.provider === "mock") return; // dev: explicit button below
      if (res.checkoutUrl) {
        await WebBrowser.openBrowserAsync(res.checkoutUrl, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET });
        void pollUntilPaid(order.orderId, order.key); // browser closed → ask the backend
      } else {
        setError("Payment page unavailable — try again.");
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === "holds_lapsed") setStage("lapsed");
      else setError("Couldn't start payment. Try again.");
    }
  }, [order, email, pollUntilPaid]);

  if (!e) {
    return (
      <Screen style={{ padding: 20, paddingTop: 80 }}>
        <Skeleton height={300} />
      </Screen>
    );
  }

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <Pressable hitSlop={12} onPress={() => router.back()} accessibilityLabel="Back">
            <Text style={{ color: c.fog, fontFamily: font.mono, fontSize: 12 }}>← {e.title}</Text>
          </Pressable>
          <View style={{ marginTop: 16 }}>
            <Eyebrow>Checkout</Eyebrow>
            <H1>{stage === "done" ? "You're in." : "Your night"}</H1>
          </View>

          {countdown && stage !== "done" && stage !== "lapsed" && (
            <Text style={{ fontFamily: font.mono, fontSize: 12, color: remaining! < 120000 ? c.ember : c.fog, marginTop: 10 }}>
              ◷ reserved · {countdown}
            </Text>
          )}
          {error && <Text style={{ color: c.ember300, fontFamily: font.ui, fontSize: 13, marginTop: 12 }}>{error}</Text>}

          {stage === "select" && (
            <>
              {e.tiers.map((t) => {
                const n = qty[t.id] ?? 0;
                const soldOut = t.status === "soldout";
                return (
                  <View key={t.id} style={{ flexDirection: "row", alignItems: "center", backgroundColor: c.charcoal, borderRadius: r.md, padding: 16, marginTop: 12, opacity: soldOut ? 0.5 : 1 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: font.uiBold, fontSize: 15, color: c.bone }}>{t.name}</Text>
                      <Text style={{ fontFamily: font.monoBold, fontSize: 13, color: c.ember300, marginTop: 2 }}>{t.price}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                      <Pressable disabled={soldOut || n === 0} hitSlop={10} onPress={() => setQty({ ...qty, [t.id]: n - 1 })} accessibilityLabel={`Remove one ${t.name}`}>
                        <Text style={{ color: n === 0 ? c.steel : c.bone, fontSize: 24 }}>−</Text>
                      </Pressable>
                      <Text style={{ fontFamily: font.monoBold, fontSize: 16, color: c.bone, minWidth: 20, textAlign: "center" }}>{n}</Text>
                      <Pressable disabled={soldOut || n >= 8} hitSlop={10} onPress={() => setQty({ ...qty, [t.id]: n + 1 })} accessibilityLabel={`Add one ${t.name}`}>
                        <Text style={{ color: soldOut ? c.steel : c.ember, fontSize: 24 }}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
              <View style={{ marginTop: 24 }}>
                <BrandButton
                  title={lines.length ? `Reserve · €${totalLocal.toFixed(2)}` : "Pick your tickets"}
                  disabled={lines.length === 0}
                  onPress={() => void reserve()}
                />
              </View>
            </>
          )}

          {stage === "email" && order && (
            <View style={{ marginTop: 20, gap: 14 }}>
              <Text style={{ fontFamily: font.ui, fontSize: 14, color: c.sand }}>
                Total €{(order.totalCents / 100).toFixed(2)} — price locked. Tickets go to:
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@domain.com"
                placeholderTextColor={c.ash}
                autoCapitalize="none"
                keyboardType="email-address"
                accessibilityLabel="Email for tickets"
                style={{ backgroundColor: c.charcoal, borderRadius: r.md, borderWidth: 1, borderColor: c.slate, color: c.bone, fontFamily: font.ui, fontSize: 16, padding: 14 }}
              />
              <BrandButton title="Continue to payment" disabled={!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)} onPress={() => void startPayment()} />
            </View>
          )}

          {stage === "pay" && pay && (
            <View style={{ marginTop: 20, gap: 14 }}>
              {pay.provider === "mock" ? (
                <>
                  <Text style={{ fontFamily: font.mono, fontSize: 12, color: c.azure }}>
                    ◉ Dev environment — simulated payment.
                  </Text>
                  <BrandButton
                    title={`Pay €${((order?.totalCents ?? 0) / 100).toFixed(2)} (simulated)`}
                    onPress={async () => {
                      if (!order) return;
                      await Api.mockPay(order.orderId, order.key);
                      void pollUntilPaid(order.orderId, order.key);
                    }}
                  />
                </>
              ) : (
                <BrandButton title="Open secure payment" onPress={() => void startPayment()} />
              )}
              <Text style={{ fontFamily: font.mono, fontSize: 11, color: c.fog }}>
                Payments are processed by Revolut. Card data never touches Wii servers.
              </Text>
            </View>
          )}

          {stage === "confirming" && (
            <Text style={{ fontFamily: font.mono, fontSize: 13, color: c.sand, marginTop: 24 }}>
              ◌ Confirming with the backend — the payment isn't done until the server says so…
            </Text>
          )}

          {stage === "done" && (
            <View style={{ marginTop: 20, gap: 14 }}>
              <Text style={{ fontFamily: font.ui, fontSize: 15, color: c.sand, lineHeight: 22 }}>
                Payment confirmed by the server. Your tickets are minted and already in your wallet —
                a confirmation email is on its way to {email}.
              </Text>
              <BrandButton title="Open my tickets" onPress={() => router.replace("/(tabs)/tickets")} />
            </View>
          )}

          {stage === "lapsed" && (
            <View style={{ marginTop: 20, gap: 14 }}>
              <EmptyState title="Reservation lapsed" body="Your held tickets were released back to the crowd. Grab them again." />
              <BrandButton
                title="Pick tickets again"
                onPress={() => {
                  idem.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                  setOrder(null);
                  setPay(null);
                  setStage("select");
                }}
              />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
