import React, { useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { API_URL } from "@/lib/api";
import { c, font, r, tintColors } from "@/lib/theme";
import { dur, ease, usePulse, useReducedMotion } from "@/lib/motion";
import { PressScale } from "./motion";
import { HeartIcon } from "./icons";
import type { WiiEvent } from "@/lib/api";

/** Shared brand primitives — projections of the web design system, not a new one. */

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flex: 1, backgroundColor: c.void }, style]}>{children}</View>;
}
export function Eyebrow({ children, color = c.ember }: { children: React.ReactNode; color?: string }) {
  return <Text style={[s.eyebrow, { color }]}>{children}</Text>;
}
export function H1({ children, size = 30 }: { children: React.ReactNode; size?: number }) {
  return <Text style={[s.h1, { fontSize: size, lineHeight: size + 2 }]}>{children}</Text>;
}
export function SectionTitle({ title, action, onAction, tone = "fog" }: { title: string; action?: string; onAction?: () => void; tone?: "fog" | "ember" }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingHorizontal: 20, marginBottom: 12 }}>
      <Text style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: tone === "ember" ? c.ember : c.fog }}>{title}</Text>
      {action && onAction && (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Text style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: 1, color: c.ember300 }}>{action} →</Text>
        </Pressable>
      )}
    </View>
  );
}

export function BrandButton({ title, variant = "primary", busy, ...props }: PressableProps & { title: string; variant?: "primary" | "ghost"; busy?: boolean }) {
  const disabled = !!props.disabled || !!busy; // busy = locked: no double submits
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: !!busy }}
      {...props}
      disabled={disabled}
      scaleTo={0.98}
      style={[s.btn, variant === "primary" ? s.btnPrimary : s.btnGhost, props.disabled && !busy && { opacity: 0.4 }, props.style as ViewStyle]}
    >
      {busy ? <ActivityIndicator color={variant === "primary" ? c.void : c.bone} /> : <Text style={[s.btnText, variant === "ghost" && { color: c.bone }]}>{title}</Text>}
    </PressScale>
  );
}

export function Pill({ text, tone = "default" }: { text: string; tone?: "default" | "ember" | "go" | "gold" }) {
  const color = tone === "ember" ? c.ember : tone === "go" ? c.go : tone === "gold" ? c.gold : c.fog;
  return (
    <View style={[s.pill, { borderColor: color }]}>
      <Text style={[s.pillText, { color }]}>{text}</Text>
    </View>
  );
}

/** Poster paths come relative from the API; resolve against the API host. */
export const posterUri = (p: string) => (p.startsWith("http") ? p : `${API_URL}${p}`);

/** Artwork with a tinted placeholder, fade-in on load, and graceful failure (tint stays). */
export function PosterImage({ uri, tint, style, scrim = true }: { uri?: string; tint: string; style?: StyleProp<ViewStyle>; scrim?: boolean }) {
  const [c1, c2] = tintColors(tint);
  const reduced = useReducedMotion();
  const fade = useRef(new Animated.Value(0)).current;
  const [failed, setFailed] = useState(false);
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <LinearGradient colors={[c1, c2]} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
      {uri && !failed && (
        <Animated.Image
          source={{ uri: posterUri(uri) }}
          style={[StyleSheet.absoluteFill, { opacity: fade }]}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          onLoad={() => Animated.timing(fade, { toValue: 1, duration: reduced ? 0 : dur.slow, easing: ease.out, useNativeDriver: true }).start()}
          onError={() => setFailed(true)}
        />
      )}
      {scrim && <LinearGradient colors={["rgba(5,5,6,0.02)", "rgba(5,5,6,0.3)", "rgba(5,5,6,0.9)"]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />}
    </View>
  );
}

function SaveButton({ saved, onToggle, size = 20 }: { saved?: boolean; onToggle: () => void; size?: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={saved ? "Remove from saved" : "Save event"}
      accessibilityState={{ selected: !!saved }}
      onPress={(e) => {
        e.stopPropagation?.();
        void Haptics.selectionAsync();
        scale.setValue(0.7);
        Animated.spring(scale, { toValue: 1, speed: 26, bounciness: 14, useNativeDriver: true }).start();
        onToggle();
      }}
      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(5,5,6,0.45)", alignItems: "center", justifyContent: "center" }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <HeartIcon color={saved ? c.ember : c.bone} size={size} filled={saved} />
      </Animated.View>
    </Pressable>
  );
}

const badgeFor = (e: WiiEvent) =>
  e.status === "soldout" ? { text: "Sold out", tone: "default" as const } : e.status === "limited" ? { text: "Almost gone", tone: "ember" as const } : e.status === "earlybird" ? { text: "Early bird", tone: "gold" as const } : null;

type CardProps = { event: WiiEvent; saved?: boolean; onPress: () => void; onToggleSave?: () => void };

/** Rail poster card (280 × 340). */
export function EventCard({ event, saved, onPress, onToggleSave, wide }: CardProps & { wide?: boolean }) {
  const badge = badgeFor(event);
  return (
    <PressScale onPress={onPress} haptic="light" accessibilityRole="button" accessibilityLabel={`${event.title}, ${event.date}, ${event.venue}`} style={[s.card, wide && { width: "100%" }]}>
      <View style={s.cardArt}>
        <PosterImage uri={event.posterUrl} tint={event.tint} />
        <View style={s.cardTop}>
          <Text style={s.cardKind}>{event.type.toUpperCase()}</Text>
          {onToggleSave && <SaveButton saved={saved} onToggle={onToggleSave} />}
        </View>
        <View>
          {badge && <Text style={[s.cardBadge, { color: badge.tone === "default" ? c.smoke : badge.tone === "gold" ? c.gold : c.ember300 }]}>{badge.text.toUpperCase()}</Text>}
          <Text style={s.cardTitle} numberOfLines={2}>{event.title}</Text>
          <Text style={s.cardMeta}>{event.date}</Text>
          <View style={s.cardFoot}>
            <Text style={s.cardVenue} numberOfLines={1}>{event.venue}</Text>
            <Text style={s.cardPrice}>{event.status === "soldout" ? "sold out" : `from ${event.priceFrom}`}</Text>
          </View>
        </View>
      </View>
    </PressScale>
  );
}

/** Hero card — full-width 4:5 editorial poster for the top of the feed. */
export function FeaturedCard({ event, saved, onPress, onToggleSave, label = "Next up" }: CardProps & { label?: string }) {
  const badge = badgeFor(event);
  return (
    <PressScale onPress={onPress} haptic="light" scaleTo={0.985} accessibilityRole="button" accessibilityLabel={`${label}: ${event.title}, ${event.date}, ${event.venue}`} style={s.featured}>
      <View style={{ aspectRatio: 4 / 5, padding: 20, justifyContent: "space-between" }}>
        <PosterImage uri={event.posterUrl} tint={event.tint} />
        <View style={s.cardTop}>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Text style={[s.cardKind, { color: c.ember300 }]}>{label.toUpperCase()}</Text>
            {badge && <Pill text={badge.text} tone={badge.tone} />}
          </View>
          {onToggleSave && <SaveButton saved={saved} onToggle={onToggleSave} />}
        </View>
        <View>
          <Text style={[s.cardTitle, { fontSize: 34, lineHeight: 34 }]} numberOfLines={3}>{event.title}</Text>
          <Text style={[s.cardMeta, { fontSize: 12, marginTop: 10 }]}>{event.date}</Text>
          <View style={s.cardFoot}>
            <Text style={[s.cardVenue, { fontSize: 13 }]} numberOfLines={1}>{event.venue}</Text>
            <Text style={[s.cardPrice, { fontSize: 13 }]}>{event.status === "soldout" ? "sold out" : `from ${event.priceFrom}`}</Text>
          </View>
        </View>
      </View>
    </PressScale>
  );
}

/** Dense list row — thumbnail left, facts right; for search results and lists. */
export function CompactRow({ event, saved, onPress, onToggleSave }: CardProps) {
  const badge = badgeFor(event);
  return (
    <PressScale onPress={onPress} haptic="light" scaleTo={0.985} accessibilityRole="button" accessibilityLabel={`${event.title}, ${event.date}, ${event.venue}`} style={s.row}>
      <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
        <View style={{ width: 84, height: 105, borderRadius: r.md, overflow: "hidden" }}>
          <PosterImage uri={event.posterUrl} tint={event.tint} scrim={false} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: 2, color: c.ember300 }}>{event.date}</Text>
          <Text style={{ fontFamily: font.displayBlack, fontSize: 17, lineHeight: 19, textTransform: "uppercase", color: c.bone, marginTop: 4 }} numberOfLines={2}>{event.title}</Text>
          <Text style={{ fontFamily: font.ui, fontSize: 12, color: c.fog, marginTop: 4 }} numberOfLines={1}>{event.venue}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }}>
            <Text style={{ fontFamily: font.monoBold, fontSize: 12, color: c.sand }}>{event.status === "soldout" ? "Sold out" : `from ${event.priceFrom}`}</Text>
            {badge && badge.tone !== "default" && <Pill text={badge.text} tone={badge.tone} />}
          </View>
        </View>
        {onToggleSave && <SaveButton saved={saved} onToggle={onToggleSave} size={18} />}
      </View>
    </PressScale>
  );
}

/** Loading placeholder with a gentle pulse. */
export function Skeleton({ height = 180, style }: { height?: number; style?: ViewStyle }) {
  const opacity = usePulse();
  return <Animated.View style={[{ height, borderRadius: r.lg, backgroundColor: c.charcoal, opacity }, style]} />;
}

export function EmptyState({ title, body, action, onAction }: { title: string; body: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ padding: 32, alignItems: "center", gap: 8 }}>
      <Text style={[s.h1, { fontSize: 22, lineHeight: 24, textAlign: "center" }]}>{title}</Text>
      <Text style={{ color: c.fog, textAlign: "center", fontFamily: font.ui, lineHeight: 20 }}>{body}</Text>
      {action && onAction && (
        <View style={{ marginTop: 10 }}>
          <BrandButton title={action} variant="ghost" onPress={onAction} />
        </View>
      )}
    </View>
  );
}

export function ErrorState({ title = "Can't reach the island", body = "Check your connection and try again.", onRetry }: { title?: string; body?: string; onRetry?: () => void }) {
  return <EmptyState title={title} body={body} action={onRetry ? "Try again" : undefined} onAction={onRetry} />;
}

const s = StyleSheet.create({
  eyebrow: { fontFamily: font.mono, fontSize: 10, letterSpacing: 3, textTransform: "uppercase" },
  h1: { fontFamily: font.displayBlack, fontSize: 30, textTransform: "uppercase", letterSpacing: -0.5, color: c.bone, lineHeight: 32 },
  btn: { paddingVertical: 15, paddingHorizontal: 22, borderRadius: r.md, alignItems: "center", justifyContent: "center", minHeight: 52 },
  btnPrimary: { backgroundColor: c.ember },
  btnGhost: { borderWidth: 1, borderColor: c.slate },
  btnText: { fontFamily: font.uiBold, fontSize: 15, textTransform: "uppercase", letterSpacing: 1, color: c.void },
  pill: { borderWidth: 1, borderRadius: r.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start" },
  pillText: { fontFamily: font.mono, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 },
  card: { width: 280, borderRadius: r.lg, overflow: "hidden", backgroundColor: c.charcoal },
  cardArt: { height: 340, padding: 18, justifyContent: "space-between" },
  featured: { borderRadius: r.xl, overflow: "hidden", backgroundColor: c.charcoal },
  row: { backgroundColor: c.ink, borderRadius: r.lg, padding: 10, borderWidth: 1, borderColor: c.graphite },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardKind: { fontFamily: font.mono, fontSize: 10, letterSpacing: 3, color: c.smoke },
  cardBadge: { fontFamily: font.mono, fontSize: 10, letterSpacing: 2, marginBottom: 6 },
  cardTitle: { fontFamily: font.displayBlack, fontSize: 26, lineHeight: 27, textTransform: "uppercase", letterSpacing: -0.5, color: c.bone },
  cardMeta: { fontFamily: font.mono, fontSize: 11, color: c.sand, marginTop: 8 },
  cardFoot: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, gap: 10 },
  cardVenue: { fontFamily: font.ui, fontSize: 12, color: c.smoke, flex: 1 },
  cardPrice: { fontFamily: font.monoBold, fontSize: 12, color: c.ember300 },
});
