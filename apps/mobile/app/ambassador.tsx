import React, { useState } from "react";
import { Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { API_URL, api } from "@/lib/api";
import { c, font, r } from "@/lib/theme";
import { useAmbassador } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { BrandButton, Eyebrow, H1, Pill, Screen, Skeleton } from "@/components/ui";

const eur = (cents: number) => `€${(cents / 100).toFixed(2)}`;
const ADMIN_URL = "https://wii-malta-admin.vercel.app";

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={{ flex: 1, minWidth: "44%", backgroundColor: c.charcoal, borderRadius: r.md, padding: 14 }}>
      <Text style={{ fontFamily: font.displayBlack, fontSize: 20, color: accent ? c.go : c.bone }}>{value}</Text>
      <Text style={{ fontFamily: font.mono, fontSize: 9, color: c.fog, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

/** Ambassador — dashboard when approved; programme explainer + application otherwise. */
export default function AmbassadorScreen() {
  const { email } = useAuth();
  const amb = useAmbassador();
  const [name, setName] = useState("");
  const [motivation, setMotivation] = useState("");
  const [applied, setApplied] = useState(false);
  const [busy, setBusy] = useState(false);

  const status = amb.data?.status;
  const d = amb.data?.dashboard;
  const link = d?.profile.code ? `${API_URL}/events?ref=${d.profile.code}` : null;

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
          <Pressable hitSlop={12} onPress={() => router.back()}>
            <Text style={{ color: c.fog, fontFamily: font.mono, fontSize: 12 }}>← Profile</Text>
          </Pressable>
          <View style={{ marginTop: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
            <View>
              <Eyebrow>Wii Ambassadors</Eyebrow>
              <H1>{d ? "Your engine" : "Join the crew"}</H1>
            </View>
            {status && status !== "none" && <Pill text={status} tone={d ? "go" : "gold"} />}
          </View>

          {amb.isLoading && <Skeleton height={220} style={{ marginTop: 20 }} />}

          {/* Approved: dashboard */}
          {d && (
            <>
              {link && (
                <View style={{ marginTop: 20, backgroundColor: c.charcoal, borderRadius: r.lg, padding: 18, flexDirection: "row", gap: 16, alignItems: "center" }}>
                  <View style={{ backgroundColor: c.bone, borderRadius: r.sm, padding: 8 }}>
                    <QRCode value={link} size={84} backgroundColor={c.bone} color={c.ink} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: font.monoBold, fontSize: 13, color: c.ember300 }}>{d.profile.code}</Text>
                    <Text style={{ fontFamily: font.mono, fontSize: 10, color: c.fog, marginTop: 4 }} numberOfLines={2}>
                      {link}
                    </Text>
                    <Pressable
                      onPress={() => void Share.share({ message: `Malta after dark hits different 🌙🔥 Tickets with my link: ${link}`, url: link })}
                      style={{ marginTop: 10 }}
                    >
                      <Text style={{ fontFamily: font.uiBold, fontSize: 13, color: c.ember, textTransform: "uppercase", letterSpacing: 1 }}>
                        Share link ↗
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
                <Stat label="Tickets sold" value={String(d.ticketsSold)} />
                <Stat label="Revenue generated" value={eur(d.revenueNetCents)} accent />
                <Stat label="Earned" value={eur(d.commission.earnedCents)} accent />
                <Stat label="Pending" value={eur(d.commission.pendingCents)} />
                <Stat label="Paid out" value={eur(d.commission.paidCents)} />
                <Stat label="Conversion" value={`${d.conversionRatePct}%`} />
                <Stat label="Visitors" value={String(d.visitors)} />
                <Stat label="Leaderboard" value={`#${d.leaderboard.position}/${d.leaderboard.of}`} />
              </View>
              {d.topEvent && (
                <Text style={{ fontFamily: font.mono, fontSize: 11, color: c.fog, marginTop: 14 }}>
                  Top event: {d.topEvent.title} · {eur(d.topEvent.revenueNetCents)}
                </Text>
              )}
              <Text style={{ fontFamily: font.mono, fontSize: 10, color: c.ash, marginTop: 16, lineHeight: 15 }}>
                Payouts, payment details and flyers live in the full dashboard: {ADMIN_URL}/ambassador
              </Text>
            </>
          )}

          {/* Not yet: explainer + apply */}
          {status === "none" && !applied && (
            <View style={{ marginTop: 20, gap: 16 }}>
              {[
                ["What you do", "Bring your people. Share your link or flyer — every ticket bought through it is yours."],
                ["What you earn", "10% standard commission on ticket revenue (custom rates possible), tracked live."],
                ["The rules", "Real people only — no self-purchases, no spam. Commissions unlock after each event."],
                ["Getting paid", "Add IBAN / Revolut / PayPal in your dashboard. The Wii team settles payouts after events."],
              ].map(([t, b]) => (
                <View key={t}>
                  <Text style={{ fontFamily: font.uiBold, fontSize: 14, color: c.bone }}>{t}</Text>
                  <Text style={{ fontFamily: font.ui, fontSize: 13, color: c.fog, marginTop: 2, lineHeight: 19 }}>{b}</Text>
                </View>
              ))}
              <TextInput
                placeholder="Your name"
                placeholderTextColor={c.ash}
                value={name}
                onChangeText={setName}
                style={{ backgroundColor: c.charcoal, borderRadius: r.md, borderWidth: 1, borderColor: c.slate, color: c.bone, fontFamily: font.ui, fontSize: 15, padding: 14 }}
              />
              <TextInput
                placeholder="Why you? Where's your crowd? (optional)"
                placeholderTextColor={c.ash}
                value={motivation}
                onChangeText={setMotivation}
                multiline
                style={{ backgroundColor: c.charcoal, borderRadius: r.md, borderWidth: 1, borderColor: c.slate, color: c.bone, fontFamily: font.ui, fontSize: 15, padding: 14, minHeight: 80 }}
              />
              <BrandButton
                title="Apply"
                busy={busy}
                disabled={!name.trim() || busy}
                onPress={async () => {
                  setBusy(true);
                  try {
                    await fetch(`${ADMIN_URL}/api/ambassador-apply`, {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ name, email, motivation }),
                    });
                    setApplied(true);
                    void amb.refetch();
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </View>
          )}

          {(status === "applied" || applied) && !d && (
            <View style={{ marginTop: 24 }}>
              <Text style={{ fontFamily: font.ui, fontSize: 15, color: c.sand, lineHeight: 22 }}>
                ✓ Application received. The team reviews every application personally — you&apos;ll get
                an email the moment you&apos;re in.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
void api;
