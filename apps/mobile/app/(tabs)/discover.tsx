import React, { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { c, font, r } from "@/lib/theme";
import { useEvents, useSaved } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { EventCard, EmptyState, Eyebrow, H1, Screen, Skeleton } from "@/components/ui";

const ALL = "All";

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: r.pill,
        backgroundColor: active ? c.ember : "transparent",
        borderWidth: 1,
        borderColor: active ? c.ember : c.slate,
      }}
    >
      <Text style={{ fontFamily: font.mono, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: active ? c.void : c.fog }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function DiscoverScreen() {
  const { data: events, isLoading, refetch, isRefetching } = useEvents();
  const { email } = useAuth();
  const savedQ = useSaved();
  const savedIds = savedQ.data ?? [];

  const [q, setQ] = useState("");
  const [genre, setGenre] = useState(ALL);
  const [city, setCity] = useState(ALL);

  const genres = useMemo(() => [ALL, ...new Set((events ?? []).flatMap((e) => e.genres))], [events]);
  const cities = useMemo(() => [ALL, ...new Set((events ?? []).map((e) => e.city))], [events]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (events ?? []).filter(
      (e) =>
        (genre === ALL || e.genres.includes(genre)) &&
        (city === ALL || e.city === city) &&
        (!needle ||
          e.title.toLowerCase().includes(needle) ||
          e.venue.toLowerCase().includes(needle) ||
          e.lineup.some((a) => a.toLowerCase().includes(needle)))
    );
  }, [events, q, genre, city]);

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          <Eyebrow>The programme</Eyebrow>
          <H1>Discover</H1>
          <TextInput
            placeholder="Search events, venues, artists…"
            placeholderTextColor={c.ash}
            value={q}
            onChangeText={setQ}
            accessibilityLabel="Search events"
            style={{
              marginTop: 16,
              backgroundColor: c.charcoal,
              borderRadius: r.md,
              borderWidth: 1,
              borderColor: c.slate,
              color: c.bone,
              fontFamily: font.ui,
              fontSize: 15,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {genres.slice(0, 6).map((g) => (
              <Chip key={g} label={g} active={genre === g} onPress={() => setGenre(g)} />
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {cities.slice(0, 6).map((ct) => (
              <Chip key={ct} label={ct} active={city === ct} onPress={() => setCity(ct)} />
            ))}
          </View>
        </View>

        {isLoading ? (
          <View style={{ padding: 20, gap: 14 }}>
            <Skeleton height={340} />
            <Skeleton height={340} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(e) => e.slug}
            contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={c.ember} />}
            renderItem={({ item }) => (
              <EventCard
                event={item}
                wide
                saved={savedIds.includes(item.slug)}
                onPress={() => router.push(`/event/${item.slug}`)}
                onToggleSave={() => {
                  if (!email) return router.push("/login");
                  savedQ.toggle.mutate({ eventId: item.slug, save: !savedIds.includes(item.slug) });
                }}
              />
            )}
            ListEmptyComponent={<EmptyState title="Nothing matches" body="Widen the filters — the night is out there." />}
          />
        )}
      </SafeAreaView>
    </Screen>
  );
}
