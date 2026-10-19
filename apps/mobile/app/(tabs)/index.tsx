import React, { useMemo } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { c, font } from "@/lib/theme";
import { useEvents, useSaved } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { groupHome } from "@/lib/discover";
import { useRecent } from "@/lib/recent";
import { EventCard, ErrorState, EmptyState, FeaturedCard, Screen, SectionTitle, Skeleton } from "@/components/ui";
import { FadeIn } from "@/components/motion";
import { PinIcon, ProfileIcon, SearchIcon, WiiMark } from "@/components/icons";
import type { WiiEvent } from "@/lib/api";

function Rail({ title, events, saved, onToggleSave, action, onAction, delay = 0 }: { title: string; events: WiiEvent[]; saved: string[]; onToggleSave?: (e: WiiEvent) => void; action?: string; onAction?: () => void; delay?: number }) {
  if (events.length === 0) return null;
  return (
    <FadeIn delay={delay} style={{ marginTop: 30 }}>
      <SectionTitle title={title} action={action} onAction={onAction} />
      <FlatList
        horizontal
        data={events}
        keyExtractor={(e) => e.slug}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={294}
        snapToAlignment="start"
        contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
        initialNumToRender={3}
        windowSize={5}
        renderItem={({ item }) => (
          <EventCard event={item} saved={saved.includes(item.slug)} onPress={() => router.push(`/event/${item.slug}`)} onToggleSave={onToggleSave ? () => onToggleSave(item) : undefined} />
        )}
      />
    </FadeIn>
  );
}

export default function HomeScreen() {
  const { data: events, isLoading, isError, refetch, isRefetching } = useEvents();
  const { email } = useAuth();
  const savedQ = useSaved();
  const savedIds = savedQ.data ?? [];
  const recent = useRecent();

  const groups = useMemo(() => groupHome(events ?? []), [events]);
  const recentEvents = useMemo(() => recent.map((slug) => (events ?? []).find((e) => e.slug === slug)).filter((e): e is WiiEvent => !!e && e.slug !== groups.next?.slug), [recent, events, groups.next]);
  const savedEvents = useMemo(() => (events ?? []).filter((e) => savedIds.includes(e.slug)), [events, savedIds]);
  const rest = groups.upcoming.filter((e) => e.slug !== groups.next?.slug);

  const toggleSave = (e: WiiEvent) => {
    if (!email) return router.push("/login");
    savedQ.toggle.mutate({ eventId: e.slug, save: !savedIds.includes(e.slug) });
  };
  const goDiscover = () => router.push("/(tabs)/discover");

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header: mark · city · search · profile */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <WiiMark size={30} />
            <View>
              <Text style={{ fontFamily: font.displayBlack, fontSize: 15, letterSpacing: 2, color: c.bone }}>WII</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <PinIcon color={c.ember} size={11} />
                <Text style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: 1.5, color: c.fog }}>MALTA</Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Pressable onPress={goDiscover} hitSlop={8} accessibilityRole="button" accessibilityLabel="Search events" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.charcoal, alignItems: "center", justifyContent: "center" }}>
              <SearchIcon color={c.bone} size={18} />
            </Pressable>
            <Pressable onPress={() => router.push("/(tabs)/profile")} hitSlop={8} accessibilityRole="button" accessibilityLabel="Profile" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.charcoal, alignItems: "center", justifyContent: "center" }}>
              <ProfileIcon color={email ? c.ember : c.bone} size={18} filled={!!email} />
            </Pressable>
          </View>
        </View>

        <ScrollView refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={c.ember} />} contentContainerStyle={{ paddingBottom: 40 }}>
          {isLoading && (
            <View style={{ paddingHorizontal: 20, marginTop: 16, gap: 14 }}>
              <Skeleton height={440} style={{ borderRadius: 28 }} />
              <Skeleton height={24} style={{ width: 140 }} />
              <View style={{ flexDirection: "row", gap: 14 }}><Skeleton height={340} style={{ width: 280 }} /><Skeleton height={340} style={{ width: 280 }} /></View>
            </View>
          )}
          {isError && !events && <ErrorState onRetry={() => void refetch()} />}

          {groups.next && (
            <FadeIn style={{ paddingHorizontal: 20, marginTop: 14 }}>
              <FeaturedCard
                event={groups.next}
                label={groups.tonight.some((e) => e.slug === groups.next!.slug) ? "Tonight" : "Next up"}
                saved={savedIds.includes(groups.next.slug)}
                onPress={() => router.push(`/event/${groups.next!.slug}`)}
                onToggleSave={() => toggleSave(groups.next!)}
              />
            </FadeIn>
          )}

          <Rail title="This weekend" events={groups.weekend.filter((e) => e.slug !== groups.next?.slug)} saved={savedIds} onToggleSave={toggleSave} delay={60} />
          <Rail title="Almost sold out" events={groups.almostGone} saved={savedIds} onToggleSave={toggleSave} delay={90} />
          {savedEvents.length > 0 && <Rail title="Saved" events={savedEvents} saved={savedIds} onToggleSave={toggleSave} delay={120} />}
          <Rail title="Upcoming nights" events={rest} saved={savedIds} onToggleSave={toggleSave} action="All events" onAction={goDiscover} delay={150} />
          {groups.byGenre.filter((g) => g.events.length > 1).slice(0, 3).map((g, i) => (
            <Rail key={g.genre} title={`${g.genre} nights`} events={g.events} saved={savedIds} onToggleSave={toggleSave} delay={180 + i * 30} />
          ))}
          {recentEvents.length > 0 && <Rail title="Recently viewed" events={recentEvents} saved={savedIds} onToggleSave={toggleSave} delay={240} />}

          {events && groups.upcoming.length === 0 && <EmptyState title="Nothing announced yet" body="The next season is loading. Turn on notifications in your profile and be first in." action="Open profile" onAction={() => router.push("/(tabs)/profile")} />}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
