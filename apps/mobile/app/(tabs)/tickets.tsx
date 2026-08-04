import React, { useMemo } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { c, font, r } from "@/lib/theme";
import { useTickets } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { BrandButton, EmptyState, Eyebrow, H1, Pill, Screen, Skeleton } from "@/components/ui";
import type { WalletTicket } from "@/lib/api";

function TicketRow({ t, prominent }: { t: WalletTicket; prominent?: boolean }) {
  const date = t.eventStartAt
    ? new Date(t.eventStartAt).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Malta" })
    : "";
  const tone = t.status === "active" ? "go" : t.status === "redeemed" ? "gold" : "default";
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/ticket/[id]", params: { id: t.id, k: t.ticketKey } })}
      accessibilityRole="button"
      accessibilityLabel={`Ticket for ${t.eventTitle}, ${t.tierName}, ${t.status}`}
      style={({ pressed }) => [
        { backgroundColor: prominent ? c.charcoal : c.ink, borderRadius: r.lg, padding: 18, borderWidth: 1, borderColor: prominent ? c.ember600 : c.graphite },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={{ fontFamily: font.displayBlack, fontSize: prominent ? 20 : 16, textTransform: "uppercase", color: c.bone }} numberOfLines={2}>
            {t.eventTitle}
          </Text>
          <Text style={{ fontFamily: font.mono, fontSize: 11, color: c.fog, marginTop: 6 }}>
            {date} · {t.tierName}
          </Text>
          <Text style={{ fontFamily: font.monoBold, fontSize: 12, color: c.sand, marginTop: 8, letterSpacing: 1 }}>{t.serial}</Text>
        </View>
        <Pill text={t.status} tone={tone} />
      </View>
      {t.pendingTransferTo && (
        <Text style={{ fontFamily: font.mono, fontSize: 11, color: c.gold, marginTop: 8 }}>→ sending to {t.pendingTransferTo}</Text>
      )}
      {prominent && t.status === "active" && (
        <Text style={{ fontFamily: font.mono, fontSize: 11, color: c.ember300, marginTop: 12 }}>TAP FOR QR →</Text>
      )}
    </Pressable>
  );
}

export default function TicketsScreen() {
  const { email, loading } = useAuth();
  const { data: tickets, isLoading, refetch, isRefetching } = useTickets();

  const { upcoming, past } = useMemo(() => {
    const all = tickets ?? [];
    return {
      upcoming: all.filter((t) => t.status === "active" || (!t.eventStarted && t.status === "issued")),
      past: all.filter((t) => t.status !== "active" && !(t.status === "issued" && !t.eventStarted)),
    };
  }, [tickets]);

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          <Eyebrow>Your wallet</Eyebrow>
          <H1>Tickets</H1>
        </View>

        {!loading && !email ? (
          <View style={{ padding: 20, gap: 16 }}>
            <EmptyState title="Sign in for your tickets" body="Use the email you bought with — a 6-digit code, no passwords." />
            <BrandButton title="Sign in" onPress={() => router.push("/login")} />
          </View>
        ) : isLoading ? (
          <View style={{ padding: 20, gap: 12 }}>
            <Skeleton height={120} />
            <Skeleton height={120} />
          </View>
        ) : (
          <FlatList
            data={[
              { kind: "header" as const, title: `Upcoming · ${upcoming.length}` },
              ...upcoming.map((t) => ({ kind: "up" as const, t })),
              ...(past.length ? [{ kind: "header" as const, title: `History · ${past.length}` }] : []),
              ...past.map((t) => ({ kind: "past" as const, t })),
            ]}
            keyExtractor={(item, i) => ("t" in item ? item.t.id : `h${i}`)}
            contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={c.ember} />}
            renderItem={({ item }) =>
              item.kind === "header" ? (
                <Text style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: c.fog, marginTop: 8 }}>
                  {item.title}
                </Text>
              ) : (
                <TicketRow t={item.t} prominent={item.kind === "up"} />
              )
            }
            ListEmptyComponent={<EmptyState title="No tickets yet" body="Your next night out starts on the Discover tab." />}
          />
        )}
      </SafeAreaView>
    </Screen>
  );
}
