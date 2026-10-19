import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { API_URL } from "@/lib/api";
import { c, font, r } from "@/lib/theme";
import { dur, ease, useReducedMotion } from "@/lib/motion";
import { useEvent, useSaved } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { isPast } from "@/lib/discover";
import { useTrackRecent } from "@/lib/recent";
import { BrandButton, EmptyState, Pill, PosterImage, Screen, Skeleton } from "@/components/ui";
import { FadeIn } from "@/components/motion";
import { HeartIcon } from "@/components/icons";

const HERO_H = 520;

export default function EventDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, isLoading, isError, refetch } = useEvent(slug ?? "");
  const { email } = useAuth();
  const savedQ = useSaved();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  useTrackRecent(slug);

  // Parallax + fade on the hero as the sheet scrolls; sticky CTA slides in after the hero lands.
  const scrollY = useRef(new Animated.Value(0)).current;
  const cta = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (!data) return;
    Animated.timing(cta, { toValue: 1, duration: reduced ? 0 : dur.slow, delay: reduced ? 0 : 320, easing: ease.out, useNativeDriver: true }).start();
  }, [data, cta, reduced]);

  const e = data?.event;
  const saved = !!e && (savedQ.data ?? []).includes(e.slug);
  const over = useMemo(() => (e ? isPast(e, Date.now()) : false), [e]);
  const soldOut = e?.status === "soldout";
  const invite = e?.status === "invite";
  const ctaLabel = over ? "This night is over" : soldOut ? "Sold out" : invite ? "Invite only" : `Get tickets · from ${e?.priceFrom}`;
  const ctaDisabled = over || soldOut || invite;

  const share = () => {
    if (!e) return;
    void Share.share({ message: `${e.title} — ${e.dateLong} · ${e.venue}\n${API_URL}/events/${e.slug}`, url: `${API_URL}/events/${e.slug}` });
  };

  if (isLoading && !e) {
    return (
      <Screen>
        <Skeleton height={HERO_H} style={{ borderRadius: 0 }} />
        <View style={{ padding: 20, gap: 12 }}><Skeleton height={60} /><Skeleton height={120} /></View>
      </Screen>
    );
  }
  if (!e) {
    return (
      <Screen style={{ justifyContent: "center" }}>
        <EmptyState title={isError ? "Can't load this night" : "Event not found"} body={isError ? "Check your connection and try again." : "It may have been taken down."} action={isError ? "Try again" : "Back to events"} onAction={isError ? () => void refetch() : () => router.back()} />
      </Screen>
    );
  }

  const heroTranslate = scrollY.interpolate({ inputRange: [-200, 0, HERO_H], outputRange: [-100, 0, HERO_H * 0.35], extrapolate: "clamp" });
  const heroScale = scrollY.interpolate({ inputRange: [-200, 0], outputRange: [1.35, 1], extrapolate: "clamp" });
  const heroFade = scrollY.interpolate({ inputRange: [0, HERO_H * 0.7], outputRange: [1, 0.35], extrapolate: "clamp" });

  return (
    <Screen>
      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      >
        {/* Hero — poster artwork with parallax, type sits on a scrim at the base */}
        <View style={{ height: HERO_H, justifyContent: "flex-end" }}>
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: heroTranslate }, { scale: heroScale }], opacity: heroFade }]}>
            <PosterImage uri={e.posterUrl} tint={e.tint} scrim={false} />
          </Animated.View>
          <LinearGradient colors={["rgba(5,5,6,0.35)", "rgba(5,5,6,0)", "rgba(5,5,6,0.55)", c.void]} locations={[0, 0.3, 0.75, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <View style={{ paddingHorizontal: 20, paddingBottom: 18 }}>
            <FadeIn delay={60} distance={10}>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <Text style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: 3, color: c.ember, textTransform: "uppercase" }}>{e.type}{e.genres.length ? ` · ${e.genres.join(" / ")}` : ""}</Text>
                {soldOut && <Pill text="Sold out" />}
                {e.status === "limited" && <Pill text="Almost gone" tone="ember" />}
                {e.status === "earlybird" && <Pill text="Early bird" tone="gold" />}
              </View>
              <Text style={{ fontFamily: font.displayBlack, fontSize: 40, lineHeight: 40, textTransform: "uppercase", letterSpacing: -1, color: c.bone, marginTop: 8 }}>{e.title}</Text>
              <Text style={{ fontFamily: font.mono, fontSize: 13, color: c.sand, marginTop: 12 }}>{e.dateLong}</Text>
              <Text style={{ fontFamily: font.ui, fontSize: 14, color: c.smoke, marginTop: 4 }}>{e.venue}</Text>
            </FadeIn>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <FadeIn delay={140}>
            <Text style={{ fontFamily: font.ui, fontSize: 16, lineHeight: 24, color: c.sand, marginTop: 8 }}>{e.blurb}</Text>
          </FadeIn>

          {e.artists.length > 0 && (
            <FadeIn delay={200}>
              <Text style={sSection}>Line-up</Text>
              {e.artists.map((a) => (
                <View key={a.name} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.graphite }}>
                  <Text style={{ fontFamily: a.headliner ? font.displayBlack : font.uiBold, fontSize: a.headliner ? 20 : 16, textTransform: a.headliner ? "uppercase" : "none", color: c.bone }}>
                    {a.name}{a.country ? ` ${a.country}` : ""}
                  </Text>
                  <Text style={{ fontFamily: font.mono, fontSize: 12, color: c.fog }}>{a.setTime ?? a.role}</Text>
                </View>
              ))}
            </FadeIn>
          )}

          <FadeIn delay={260}>
            <Text style={sSection}>Tickets</Text>
            {e.tiers.map((t) => (
              <View key={t.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: c.charcoal, borderRadius: r.md, padding: 16, marginBottom: 10, opacity: t.status === "soldout" ? 0.55 : 1 }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ fontFamily: font.uiBold, fontSize: 15, color: c.bone }}>{t.name}{t.vip ? " · VIP" : ""}</Text>
                  {t.note ? <Text style={{ fontFamily: font.mono, fontSize: 11, color: c.fog, marginTop: 3 }}>{t.note}</Text> : null}
                  {t.perks.length > 0 && <Text style={{ fontFamily: font.ui, fontSize: 12, color: c.sand, marginTop: 6 }}>✓ {t.perks.join(" · ")}</Text>}
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <Text style={{ fontFamily: font.monoBold, fontSize: 16, color: c.ember300 }}>{t.price}</Text>
                  {t.status !== "available" && <Pill text={t.status === "soldout" ? "sold out" : t.status} tone={t.status === "soldout" ? "default" : "gold"} />}
                </View>
              </View>
            ))}
          </FadeIn>

          {e.info.length > 0 && (
            <FadeIn delay={320}>
              <Text style={sSection}>Good to know</Text>
              <View style={{ backgroundColor: c.ink, borderRadius: r.md, borderWidth: 1, borderColor: c.graphite }}>
                {e.info.map(([k, v], i) => (
                  <View key={k} style={{ flexDirection: "row", gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: c.graphite }}>
                    <Text style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: 1.5, color: c.ember, width: 92, textTransform: "uppercase", paddingTop: 2 }}>{k}</Text>
                    <Text style={{ fontFamily: font.ui, fontSize: 14, color: c.sand, flex: 1, lineHeight: 20 }}>{v}</Text>
                  </View>
                ))}
              </View>
            </FadeIn>
          )}

          <FadeIn delay={380}>
            <Text style={sSection}>Venue</Text>
            <View style={{ backgroundColor: c.charcoal, borderRadius: r.md, padding: 16 }}>
              <Text style={{ fontFamily: font.displayBlack, fontSize: 18, textTransform: "uppercase", color: c.bone }}>{e.venue.split(" — ")[0]}</Text>
              <Text style={{ fontFamily: font.mono, fontSize: 12, color: c.fog, marginTop: 4 }}>{e.city} · Malta</Text>
            </View>
          </FadeIn>

          {e.faq.length > 0 && (
            <FadeIn delay={420}>
              <Text style={sSection}>FAQ</Text>
              {e.faq.map(([q, a]) => (
                <View key={q} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.graphite }}>
                  <Text style={{ fontFamily: font.uiBold, fontSize: 14, color: c.bone }}>{q}</Text>
                  <Text style={{ fontFamily: font.ui, fontSize: 13, color: c.fog, marginTop: 4, lineHeight: 19 }}>{a}</Text>
                </View>
              ))}
            </FadeIn>
          )}
        </View>
      </Animated.ScrollView>

      {/* Floating header controls */}
      <SafeAreaView edges={["top"]} pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingTop: 6 }}>
        <Pressable hitSlop={10} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={sRound}>
          <Text style={{ color: c.bone, fontSize: 20, lineHeight: 22 }}>←</Text>
        </Pressable>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable hitSlop={10} onPress={share} accessibilityRole="button" accessibilityLabel="Share event" style={sRound}>
            <Text style={{ color: c.bone, fontSize: 18 }}>↗</Text>
          </Pressable>
          <Pressable
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={saved ? "Remove from saved" : "Save event"}
            onPress={() => {
              if (!email) return router.push("/login");
              savedQ.toggle.mutate({ eventId: e.slug, save: !saved });
            }}
            style={sRound}
          >
            <HeartIcon color={saved ? c.ember : c.bone} size={19} filled={saved} />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Sticky purchase bar — slides up once the page has landed */}
      <Animated.View style={{ position: "absolute", left: 0, right: 0, bottom: 0, opacity: cta, transform: [{ translateY: cta.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }}>
        <LinearGradient colors={["rgba(5,5,6,0)", c.void]} style={{ height: 28 }} pointerEvents="none" />
        <View style={{ backgroundColor: c.void, paddingHorizontal: 20, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 14), flexDirection: "row", alignItems: "center", gap: 14 }}>
          {!ctaDisabled && (
            <View>
              <Text style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: 2, color: c.fog }}>FROM</Text>
              <Text style={{ fontFamily: font.displayBlack, fontSize: 22, color: c.bone, lineHeight: 24 }}>{e.priceFrom}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <BrandButton title={ctaLabel} disabled={ctaDisabled} onPress={() => router.push(`/checkout/${e.slug}`)} />
          </View>
        </View>
      </Animated.View>
    </Screen>
  );
}

const sSection = { fontFamily: font.mono, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" as const, color: c.ember, marginTop: 30, marginBottom: 12 };
const sRound = { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(5,5,6,0.55)", alignItems: "center" as const, justifyContent: "center" as const };
