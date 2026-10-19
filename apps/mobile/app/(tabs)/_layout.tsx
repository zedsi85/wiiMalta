import React, { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { c, font } from "@/lib/theme";
import { dur, ease, useReducedMotion } from "@/lib/motion";
import { DiscoverIcon, HomeIcon, ProfileIcon, TicketIcon } from "@/components/icons";

const ICONS: Record<string, (p: { color: string; filled?: boolean }) => React.ReactElement> = {
  index: (p) => <HomeIcon {...p} />,
  discover: (p) => <DiscoverIcon {...p} />,
  tickets: (p) => <TicketIcon {...p} />,
  profile: (p) => <ProfileIcon {...p} />,
};
const LABELS: Record<string, string> = { index: "Home", discover: "Discover", tickets: "Tickets", profile: "Profile" };

function TabItem({ name, focused, onPress }: { name: string; focused: boolean; onPress: () => void }) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: focused ? 1 : 0, duration: reduced ? 0 : dur.base, easing: ease.out, useNativeDriver: true }).start();
  }, [focused, v, reduced]);
  const color = focused ? c.ember : c.ash;
  return (
    <Pressable
      onPress={() => {
        if (!focused) void Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={LABELS[name]}
      style={{ flex: 1, alignItems: "center", paddingTop: 10, minHeight: 56 }}
    >
      <Animated.View style={{ transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) }] }}>{ICONS[name]({ color, filled: focused })}</Animated.View>
      <Text style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color, marginTop: 6 }}>{LABELS[name]}</Text>
      {/* animated active indicator */}
      <Animated.View style={{ marginTop: 5, width: 16, height: 2, borderRadius: 1, backgroundColor: c.ember, opacity: v, transform: [{ scaleX: v }] }} />
    </Pressable>
  );
}

function WiiTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: "row", backgroundColor: "rgba(11,11,14,0.98)", borderTopWidth: 1, borderTopColor: c.graphite, paddingBottom: Math.max(insets.bottom, 10) }}>
      {state.routes.map((route, i) => (
        <TabItem
          key={route.key}
          name={route.name}
          focused={state.index === i}
          onPress={() => {
            const ev = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (state.index !== i && !ev.defaultPrevented) navigation.navigate(route.name);
          }}
        />
      ))}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.void } }} tabBar={(props) => <WiiTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="discover" options={{ title: "Discover" }} />
      <Tabs.Screen name="tickets" options={{ title: "Tickets" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
