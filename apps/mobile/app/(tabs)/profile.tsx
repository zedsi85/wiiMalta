import React from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useState } from "react";
import { c, font, r } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { useAmbassador, useSaved, useTickets, useEvents } from "@/lib/queries";
import { registerForPush } from "@/lib/push";
import { BrandButton, EmptyState, EventCard, Eyebrow, H1, Pill, Screen } from "@/components/ui";

function Row({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.graphite }}
    >
      <Text style={{ fontFamily: font.ui, fontSize: 15, color: c.bone }}>{label}</Text>
      <Text style={{ fontFamily: font.mono, fontSize: 13, color: onPress ? c.ember300 : c.fog }}>{value ?? "→"}</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { email, loading, logout } = useAuth();
  const { data: tickets } = useTickets();
  const savedQ = useSaved();
  const { data: events } = useEvents();
  const amb = useAmbassador();
  const [pushOn, setPushOn] = useState(false);

  const savedEvents = (events ?? []).filter((e) => (savedQ.data ?? []).includes(e.slug));
  const upcoming = (tickets ?? []).filter((t) => t.status === "active").length;
  const past = (tickets ?? []).length - upcoming;

  if (!loading && !email) {
    return (
      <Screen>
        <SafeAreaView style={{ flex: 1, justifyContent: "center", padding: 24, gap: 16 }}>
          <Eyebrow>Wii Event Malta</Eyebrow>
          <H1>Your profile</H1>
          <EmptyState title="You're browsing as a guest" body="Sign in to see tickets, saved events and ambassador tools." />
          <BrandButton title="Sign in" onPress={() => router.push("/login")} />
        </SafeAreaView>
      </Screen>
    );
  }

  const ambStatus = amb.data?.status;

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
          <Eyebrow>Profile</Eyebrow>
          <H1>{email?.split("@")[0] ?? ""}</H1>
          <Text style={{ fontFamily: font.mono, fontSize: 12, color: c.fog, marginTop: 6 }}>{email}</Text>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
            <View style={{ flex: 1, backgroundColor: c.charcoal, borderRadius: r.md, padding: 14 }}>
              <Text style={{ fontFamily: font.displayBlack, fontSize: 24, color: c.bone }}>{upcoming}</Text>
              <Text style={{ fontFamily: font.mono, fontSize: 10, color: c.fog, textTransform: "uppercase", letterSpacing: 1 }}>upcoming</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: c.charcoal, borderRadius: r.md, padding: 14 }}>
              <Text style={{ fontFamily: font.displayBlack, fontSize: 24, color: c.bone }}>{past}</Text>
              <Text style={{ fontFamily: font.mono, fontSize: 10, color: c.fog, textTransform: "uppercase", letterSpacing: 1 }}>past nights</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: c.charcoal, borderRadius: r.md, padding: 14 }}>
              <Text style={{ fontFamily: font.displayBlack, fontSize: 24, color: c.bone }}>{savedEvents.length}</Text>
              <Text style={{ fontFamily: font.mono, fontSize: 10, color: c.fog, textTransform: "uppercase", letterSpacing: 1 }}>saved</Text>
            </View>
          </View>

          {/* Ambassador */}
          <View style={{ marginTop: 28, backgroundColor: c.charcoal, borderRadius: r.lg, padding: 18 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontFamily: font.uiBold, fontSize: 16, color: c.bone }}>Wii Ambassador</Text>
              {ambStatus && ambStatus !== "none" && <Pill text={ambStatus} tone={ambStatus === "approved" || ambStatus === "verified" ? "go" : "gold"} />}
            </View>
            <Text style={{ fontFamily: font.ui, fontSize: 13, color: c.fog, marginTop: 6, lineHeight: 19 }}>
              {ambStatus === "approved" || ambStatus === "verified"
                ? "Your link, your crowd, your commission."
                : ambStatus === "applied"
                  ? "Application under review — we'll email you."
                  : "Earn commission on every ticket sold through your link."}
            </Text>
            <View style={{ marginTop: 12 }}>
              <BrandButton
                title={ambStatus === "approved" || ambStatus === "verified" ? "Open dashboard" : ambStatus === "applied" ? "View programme" : "Become an ambassador"}
                variant={ambStatus === "approved" || ambStatus === "verified" ? "primary" : "ghost"}
                onPress={() => router.push("/ambassador")}
              />
            </View>
          </View>

          {/* Saved events */}
          {savedEvents.length > 0 && (
            <>
              <Text style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: c.fog, marginTop: 28, marginBottom: 12 }}>
                Saved events
              </Text>
              {savedEvents.map((e) => (
                <View key={e.slug} style={{ marginBottom: 14 }}>
                  <EventCard
                    event={e}
                    wide
                    saved
                    onPress={() => router.push(`/event/${e.slug}`)}
                    onToggleSave={() => savedQ.toggle.mutate({ eventId: e.slug, save: false })}
                  />
                </View>
              ))}
            </>
          )}

          {/* Settings */}
          <Text style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: c.fog, marginTop: 28, marginBottom: 4 }}>
            Settings
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.graphite }}>
            <Text style={{ fontFamily: font.ui, fontSize: 15, color: c.bone }}>Event notifications</Text>
            <Switch
              value={pushOn}
              trackColor={{ true: c.ember }}
              onValueChange={async (v) => {
                if (v) setPushOn(await registerForPush());
                else setPushOn(false);
              }}
            />
          </View>
          <Row label="My orders (web wallet)" onPress={() => router.push("/(tabs)/tickets")} />
          <Row label="Privacy" value="wii-malta.vercel.app" />
          <View style={{ marginTop: 24 }}>
            <BrandButton
              title="Sign out"
              variant="ghost"
              onPress={async () => {
                await logout();
                router.replace("/(tabs)");
              }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
