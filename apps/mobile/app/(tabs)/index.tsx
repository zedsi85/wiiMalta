import React, { useMemo } from "react";
import { FlatList, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { c, font } from "@/lib/theme";
import { useEvents, useSaved } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { EventCard, EmptyState, Eyebrow, H1, Screen, Skeleton } from "@/components/ui";
import type { WiiEvent } from "@/lib/api";

function Rail({ title, events, saved, onToggleSave }: { title: string; events: WiiEvent[]; saved: string[]; onToggleSave?: (e: WiiEvent) => void }) {
  if (events.length === 0) return null;
  return (
    <View style={{ marginTop: 28 }}>
      <Text style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: c.fog, paddingHorizontal: 20, marginBottom: 12 }}>
        {title}
      </Text>
      <FlatList
        horizontal
        data={events}
        keyExtractor={(e) => e.slug}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            saved={saved.includes(item.slug)}
            onPress={() => router.push(`/event/${item.slug}`)}
            onToggleSave={onToggleSave ? () => onToggleSave(item) : undefined}
          />
        )}
      />
    </View>
  );
}

export default function HomeScreen() {
  const { data: events, isLoading, isError, refetch, isRefetching } = useEvents();
  const { email } = useAuth();
  const savedQ = useSaved();
  const savedIds = savedQ.data ?? [];

  const now = Date.now();
  const upcoming = useMemo(() => (events ?? []).filter((e) => new Date(e.iso).getTime() > now), [events, now]);
  const featured = upcoming.find((e) => e.status !== "soldout") ?? upcoming[0];
  const almostGone = upcoming.filter((e) => e.status === "limited");
  const rest = upcoming.filter((e) => e.slug !== featured?.slug);

  const toggleSave = (e: WiiEvent) => {
    if (!email) return router.push("/login");
    // saved is keyed by event slug client-side; API stores by id — the detail
    // payload carries slugs only, so we persist via slug→id on the server side.
    savedQ.toggle.mutate({ eventId: e.slug, save: !savedIds.includes(e.slug) });
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={c.ember} />}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
            <Eyebrow>Wii Event Malta</Eyebrow>
            <H1>Malta{"\n"}after dark.</H1>
          </View>

          {isLoading && (
            <View style={{ paddingHorizontal: 20, marginTop: 24, gap: 14 }}>
              <Skeleton height={340} />
              <Skeleton height={120} />
            </View>
          )}
          {isError && !events && (
            <EmptyState title="Can't reach the island" body="Check your connection and pull to refresh." />
          )}

          {featured && (
            <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
              <Text style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: c.ember, marginBottom: 12 }}>
                Next drop
              </Text>
              <EventCard
                event={featured}
                wide
                saved={savedIds.includes(featured.slug)}
                onPress={() => router.push(`/event/${featured.slug}`)}
                onToggleSave={() => toggleSave(featured)}
              />
            </View>
          )}

          <Rail title="Almost sold out" events={almostGone} saved={savedIds} onToggleSave={toggleSave} />
          <Rail title="Upcoming nights" events={rest} saved={savedIds} onToggleSave={toggleSave} />

          {events && upcoming.length === 0 && (
            <EmptyState title="Nothing announced yet" body="The next season is loading. Turn on notifications and be first in." />
          )}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
