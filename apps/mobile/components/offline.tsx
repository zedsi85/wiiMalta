import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import * as Network from "expo-network";
import { c, font } from "@/lib/theme";

/** Festival-network reality: a quiet, persistent offline indicator. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        if (mounted) setOffline(!(state.isConnected && state.isInternetReachable !== false));
      } catch {
        /* keep last state */
      }
    };
    void check();
    const t = setInterval(check, 8000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);
  if (!offline) return null;
  return (
    <View style={{ backgroundColor: c.gold, paddingTop: 52, paddingBottom: 8, alignItems: "center" }}>
      <Text style={{ fontFamily: font.monoBold, fontSize: 11, color: c.void, letterSpacing: 1 }}>
        OFFLINE — showing cached data · tickets still viewable
      </Text>
    </View>
  );
}
