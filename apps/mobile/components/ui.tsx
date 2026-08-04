import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { c, font, r, tintColors } from "@/lib/theme";
import type { WiiEvent } from "@/lib/api";

/** Shared brand primitives — projections of the web design system, not a new one. */

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flex: 1, backgroundColor: c.void }, style]}>{children}</View>;
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <Text style={s.eyebrow}>{children}</Text>;
}

export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={s.h1}>{children}</Text>;
}

export function BrandButton({
  title,
  variant = "primary",
  busy,
  ...props
}: PressableProps & { title: string; variant?: "primary" | "ghost"; busy?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      onPress={(e) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        props.onPress?.(e);
      }}
      style={({ pressed }) => [
        s.btn,
        variant === "primary" ? s.btnPrimary : s.btnGhost,
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        props.disabled && { opacity: 0.4 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={variant === "primary" ? c.void : c.bone} />
      ) : (
        <Text style={[s.btnText, variant === "ghost" && { color: c.bone }]}>{title}</Text>
      )}
    </Pressable>
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

/** Poster card — artwork tint gradient, availability, price. The Wii card, not a generic one. */
export function EventCard({
  event,
  saved,
  onPress,
  onToggleSave,
  wide,
}: {
  event: WiiEvent;
  saved?: boolean;
  onPress: () => void;
  onToggleSave?: () => void;
  wide?: boolean;
}) {
  const [c1, c2] = tintColors(event.tint);
  const badge =
    event.status === "soldout" ? "SOLD OUT" : event.status === "limited" ? "ALMOST GONE" : event.status === "earlybird" ? "EARLY BIRD" : null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${event.date}, ${event.venue}`}
      style={({ pressed }) => [s.card, wide && { width: "100%" }, pressed && { opacity: 0.92 }]}
    >
      <LinearGradient colors={[c1, c2]} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={s.cardArt}>
        <View style={s.cardTop}>
          <Text style={s.cardKind}>{event.type.toUpperCase()}</Text>
          {onToggleSave && (
            <Pressable
              hitSlop={12}
              accessibilityLabel={saved ? "Remove from saved" : "Save event"}
              onPress={(e) => {
                e.stopPropagation?.();
                void Haptics.selectionAsync();
                onToggleSave();
              }}
            >
              <Text style={{ fontSize: 18, color: saved ? c.ember : c.smoke }}>{saved ? "♥" : "♡"}</Text>
            </Pressable>
          )}
        </View>
        <View>
          {badge && (
            <Text style={[s.cardBadge, { color: event.status === "soldout" ? c.smoke : c.ember300 }]}>{badge}</Text>
          )}
          <Text style={s.cardTitle} numberOfLines={2}>
            {event.title}
          </Text>
          <Text style={s.cardMeta}>{event.date}</Text>
          <View style={s.cardFoot}>
            <Text style={s.cardVenue} numberOfLines={1}>
              {event.venue}
            </Text>
            <Text style={s.cardPrice}>from {event.priceFrom}</Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export function Skeleton({ height = 180, style }: { height?: number; style?: ViewStyle }) {
  return <View style={[{ height, borderRadius: r.lg, backgroundColor: c.charcoal, opacity: 0.7 }, style]} />;
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={{ padding: 32, alignItems: "center" }}>
      <Text style={[s.h1, { fontSize: 22, textAlign: "center" }]}>{title}</Text>
      <Text style={{ color: c.fog, textAlign: "center", marginTop: 8, fontFamily: font.ui }}>{body}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  eyebrow: { fontFamily: font.mono, fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: c.ember },
  h1: { fontFamily: font.displayBlack, fontSize: 30, textTransform: "uppercase", letterSpacing: -0.5, color: c.bone, lineHeight: 32 },
  btn: { paddingVertical: 15, paddingHorizontal: 22, borderRadius: r.md, alignItems: "center", justifyContent: "center", minHeight: 50 },
  btnPrimary: { backgroundColor: c.ember },
  btnGhost: { borderWidth: 1, borderColor: c.slate },
  btnText: { fontFamily: font.uiBold, fontSize: 15, textTransform: "uppercase", letterSpacing: 1, color: c.void },
  pill: { borderWidth: 1, borderRadius: r.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start" },
  pillText: { fontFamily: font.mono, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 },
  card: { width: 280, borderRadius: r.lg, overflow: "hidden" },
  cardArt: { height: 340, padding: 18, justifyContent: "space-between" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardKind: { fontFamily: font.mono, fontSize: 10, letterSpacing: 3, color: c.smoke },
  cardBadge: { fontFamily: font.mono, fontSize: 10, letterSpacing: 2, marginBottom: 6 },
  cardTitle: { fontFamily: font.displayBlack, fontSize: 26, lineHeight: 27, textTransform: "uppercase", letterSpacing: -0.5, color: c.bone },
  cardMeta: { fontFamily: font.mono, fontSize: 11, color: c.sand, marginTop: 8 },
  cardFoot: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, gap: 10 },
  cardVenue: { fontFamily: font.ui, fontSize: 12, color: c.smoke, flex: 1 },
  cardPrice: { fontFamily: font.monoBold, fontSize: 12, color: c.ember300 },
});
