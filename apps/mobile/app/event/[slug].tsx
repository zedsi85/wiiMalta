import React from "react";
import { Pressable, ScrollView, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { API_URL } from "@/lib/api";
import { c, font, r, tintColors } from "@/lib/theme";
import { useEvent, useSaved } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { BrandButton, EmptyState, Pill, Screen, Skeleton } from "@/components/ui";

export default function EventDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, isLoading } = useEvent(slug ?? "");
  const { email } = useAuth();
  const savedQ = useSaved();
  const saved = (savedQ.data ?? []).includes(slug ?? "");

  if (isLoading || !data) {
    return (
      <Screen style={{ padding: 20, paddingTop: 80 }}>
        {isLoading ? <Skeleton height={420} /> : <EmptyState title="Event not found" body="It may have ended or moved." />}
      </Screen>
    );
  }
  const e = data.event;
  const [c1, c2] = tintColors(e.tint);
  const soldOut = e.status === "soldout";

  const share = () =>
    void Share.share({
      message: `${e.title} — ${e.dateLong} · ${e.venue}\n${API_URL}/events/${e.slug}`,
      url: `${API_URL}/events/${e.slug}`,
    });

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Cinematic hero from the event artwork system */}
        <LinearGradient colors={[c1, c2, c.void]} style={{ paddingTop: 70, paddingHorizontal: 20, paddingBottom: 28, minHeight: 380, justifyContent: "flex-end" }}>
          <SafeAreaView edges={["top"]} style={{ position: "absolute", top: 8, left: 12, right: 12, flexDirection: "row", justifyContent: "space-between" }}>
            <Pressable hitSlop={12} onPress={() => router.back()} accessibilityLabel="Back">
              <Text style={{ color: c.bone, fontSize: 24 }}>←</Text>
            </Pressable>
            <View style={{ flexDirection: "row", gap: 20 }}>
              <Pressable hitSlop={12} onPress={share} accessibilityLabel="Share event">
                <Text style={{ color: c.bone, fontSize: 20 }}>↗</Text>
              </Pressable>
              <Pressable
                hitSlop={12}
                accessibilityLabel={saved ? "Remove from saved" : "Save event"}
                onPress={() => {
                  if (!email) return router.push("/login");
                  savedQ.toggle.mutate({ eventId: e.slug, save: !saved });
                }}
              >
                <Text style={{ color: saved ? c.ember : c.bone, fontSize: 22 }}>{saved ? "♥" : "♡"}</Text>
              </Pressable>
            </View>
          </SafeAreaView>
          <Text style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: 3, color: c.ember, textTransform: "uppercase" }}>
            {e.type} · {e.genres.join(" / ")}
          </Text>
          <Text style={{ fontFamily: font.displayBlack, fontSize: 40, lineHeight: 40, textTransform: "uppercase", letterSpacing: -1, color: c.bone, marginTop: 8 }}>
            {e.title}
          </Text>
          <Text style={{ fontFamily: font.mono, fontSize: 13, color: c.sand, marginTop: 12 }}>
            {e.dateLong}
          </Text>
          <Text style={{ fontFamily: font.ui, fontSize: 14, color: c.smoke, marginTop: 4 }}>{e.venue}</Text>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ fontFamily: font.ui, fontSize: 15, lineHeight: 23, color: c.sand, marginTop: 20 }}>{e.blurb}</Text>

          {/* Lineup */}
          {e.artists.length > 0 && (
            <>
              <Text style={sSection}>Lineup</Text>
              {e.artists.map((a) => (
                <View key={a.name} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.graphite }}>
                  <Text style={{ fontFamily: a.headliner ? font.uiBold : font.ui, fontSize: 15, color: a.headliner ? c.bone : c.smoke }}>
                    {a.name} {a.country ?? ""}
                  </Text>
                  <Text style={{ fontFamily: font.mono, fontSize: 12, color: c.fog }}>{a.setTime ?? a.role}</Text>
                </View>
              ))}
            </>
          )}

          {/* Tiers preview */}
          <Text style={sSection}>Tickets</Text>
          {e.tiers.map((t) => (
            <View key={t.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: c.charcoal, borderRadius: r.md, padding: 16, marginBottom: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.uiBold, fontSize: 15, color: c.bone }}>
                  {t.name} {t.vip ? "· VIP" : ""}
                </Text>
                {t.note ? <Text style={{ fontFamily: font.mono, fontSize: 11, color: c.fog, marginTop: 2 }}>{t.note}</Text> : null}
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <Text style={{ fontFamily: font.monoBold, fontSize: 15, color: c.ember300 }}>{t.price}</Text>
                {t.status !== "available" && <Pill text={t.status === "soldout" ? "sold out" : t.status} tone={t.status === "soldout" ? "default" : "gold"} />}
              </View>
            </View>
          ))}

          {/* Info */}
          {e.info.length > 0 && (
            <>
              <Text style={sSection}>Good to know</Text>
              {e.info.map(([k, v]) => (
                <View key={k} style={{ flexDirection: "row", gap: 12, paddingVertical: 6 }}>
                  <Text style={{ fontFamily: font.mono, fontSize: 12, color: c.fog, width: 90 }}>{k}</Text>
                  <Text style={{ fontFamily: font.ui, fontSize: 13, color: c.sand, flex: 1 }}>{v}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <SafeAreaView edges={["bottom"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: c.void, borderTopWidth: 1, borderTopColor: c.graphite, paddingHorizontal: 20, paddingTop: 12 }}>
        <BrandButton
          title={soldOut ? "Sold out" : `Get tickets · from ${e.priceFrom}`}
          disabled={soldOut}
          onPress={() => router.push(`/checkout/${e.slug}`)}
        />
      </SafeAreaView>
    </Screen>
  );
}

const sSection = {
  fontFamily: font.mono,
  fontSize: 11,
  letterSpacing: 2,
  textTransform: "uppercase" as const,
  color: c.ember,
  marginTop: 28,
  marginBottom: 12,
};
