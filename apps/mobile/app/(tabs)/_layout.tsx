import React from "react";
import { Text } from "react-native";
import { Tabs } from "expo-router";
import { c, font } from "@/lib/theme";

const icon =
  (glyph: string) =>
  ({ color }: { color: string }) => <Text style={{ fontSize: 18, color }}>{glyph}</Text>;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: c.ink, borderTopColor: c.slate, height: 84, paddingTop: 8 },
        tabBarActiveTintColor: c.ember,
        tabBarInactiveTintColor: c.ash,
        tabBarLabelStyle: { fontFamily: font.mono, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("◆") }} />
      <Tabs.Screen name="discover" options={{ title: "Discover", tabBarIcon: icon("◎") }} />
      <Tabs.Screen name="tickets" options={{ title: "Tickets", tabBarIcon: icon("▣") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: icon("●") }} />
    </Tabs>
  );
}
