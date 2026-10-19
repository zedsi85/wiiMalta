import React, { useDeferredValue, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { c, font, r } from "@/lib/theme";
import { useEvents, useSaved } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { filterEvents, WHEN_LABELS, type When } from "@/lib/discover";
import { CompactRow, EmptyState, ErrorState, Eyebrow, H1, Screen, Skeleton } from "@/components/ui";
import { FadeIn } from "@/components/motion";
import { SearchIcon } from "@/components/icons";

const ALL = "All";

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: r.pill, backgroundColor: active ? c.ember : c.charcoal, borderWidth: 1, borderColor: active ? c.ember : c.slate, minHeight: 36 }}
    >
      <Text style={{ fontFamily: active ? font.monoBold : font.mono, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: active ? c.void : c.sand }}>{label}</Text>
    </Pressable>
  );
}

function ChipRow({ items, value, onChange }: { items: { key: string; label: string }[]; value: string; onChange: (k: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }} keyboardShouldPersistTaps="handled">
      {items.map((it) => (
        <Chip key={it.key} label={it.label} active={value === it.key} onPress={() => onChange(it.key)} />
      ))}
    </ScrollView>
  );
}

export default function DiscoverScreen() {
  const { data: events, isLoading, isError, refetch, isRefetching } = useEvents();
  const { email } = useAuth();
  const savedQ = useSaved();
  const savedIds = savedQ.data ?? [];

  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [genre, setGenre] = useState(ALL);
  const [city, setCity] = useState(ALL);
  const [when, setWhen] = useState<When>("all");

  const genres = useMemo(() => [ALL, ...new Set((events ?? []).flatMap((e) => e.genres))], [events]);
  const cities = useMemo(() => [ALL, ...new Set((events ?? []).map((e) => e.city))], [events]);
  const filtered = useMemo(() => filterEvents(events ?? [], { q: deferredQ, genre, city, when }), [events, deferredQ, genre, city, when]);
  const dirty = q !== "" || genre !== ALL || city !== ALL || when !== "all";
  const reset = () => {
    setQ(""); setGenre(ALL); setCity(ALL); setWhen("all");
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          <Eyebrow>The programme</Eyebrow>
          <H1>Discover</H1>
          <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.charcoal, borderRadius: r.md, borderWidth: 1, borderColor: c.slate, paddingHorizontal: 14 }}>
            <SearchIcon color={c.ash} size={18} />
            <TextInput
              placeholder="Events, venues, artists…"
              placeholderTextColor={c.ash}
              value={q}
              onChangeText={setQ}
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoCorrect={false}
              accessibilityLabel="Search events"
              style={{ flex: 1, color: c.bone, fontFamily: font.ui, fontSize: 16, paddingVertical: 12 }}
            />
          </View>
        </View>
        <View style={{ marginTop: 12, gap: 8 }}>
          <ChipRow items={(Object.keys(WHEN_LABELS) as When[]).map((k) => ({ key: k, label: WHEN_LABELS[k] }))} value={when} onChange={(k) => setWhen(k as When)} />
          <ChipRow items={genres.map((g) => ({ key: g, label: g }))} value={genre} onChange={setGenre} />
          {cities.length > 2 && <ChipRow items={cities.map((ct) => ({ key: ct, label: ct }))} value={city} onChange={setCity} />}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginTop: 14 }}>
          <Text style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: 1.5, color: c.fog }}>
            {isLoading ? "SEARCHING…" : `${filtered.length} ${filtered.length === 1 ? "NIGHT" : "NIGHTS"}`}
          </Text>
          {dirty && (
            <Pressable onPress={reset} hitSlop={10} accessibilityRole="button" accessibilityLabel="Reset filters">
              <Text style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: 1, color: c.ember300 }}>RESET ✕</Text>
            </Pressable>
          )}
        </View>

        {isLoading ? (
          <View style={{ padding: 20, gap: 12 }}>
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={126} />)}
          </View>
        ) : isError && !events ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(e) => e.slug}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ padding: 20, gap: 10, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={c.ember} />}
            initialNumToRender={6}
            windowSize={7}
            renderItem={({ item, index }) => (
              <FadeIn delay={Math.min(index, 6) * 40} distance={8}>
                <CompactRow
                  event={item}
                  saved={savedIds.includes(item.slug)}
                  onPress={() => router.push(`/event/${item.slug}`)}
                  onToggleSave={() => {
                    if (!email) return router.push("/login");
                    savedQ.toggle.mutate({ eventId: item.slug, save: !savedIds.includes(item.slug) });
                  }}
                />
              </FadeIn>
            )}
            ListEmptyComponent={<EmptyState title="Nothing matches" body={dirty ? "Widen the filters — the night is out there." : "No upcoming nights announced yet."} action={dirty ? "Reset filters" : undefined} onAction={dirty ? reset : undefined} />}
          />
        )}
      </SafeAreaView>
    </Screen>
  );
}
