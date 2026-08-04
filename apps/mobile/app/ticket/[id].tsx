import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import QRCode from "react-native-qrcode-svg";
import * as Brightness from "expo-brightness";
import { Api } from "@/lib/api";
import { c, font, r } from "@/lib/theme";
import { Pill, Screen } from "@/components/ui";

/**
 * Full-screen ticket — displays the EXISTING signed wt1 QR token minted by
 * the backend (same verifier as the guard scanner). Token auto-refreshes
 * before its 5-minute expiry; the last payload stays cached for offline
 * *display* (redemption is always server-side).
 */
export default function TicketScreen() {
  const { id, k } = useLocalSearchParams<{ id: string; k: string }>();
  const [restoreBrightness, setRestoreBrightness] = useState<number | null>(null);

  const { data, isError, dataUpdatedAt } = useQuery({
    queryKey: ["ticket-qr", id],
    queryFn: () => Api.ticketQr(id!, k ?? ""),
    enabled: !!id,
    refetchInterval: 4 * 60_000, // refresh before the 5-min token expiry
    gcTime: 24 * 3600_000, // offline display of the last payload
    staleTime: 0,
  });

  // Max brightness while the QR is on screen (restore on exit)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Brightness.requestPermissionsAsync();
        if (status === "granted" && mounted) {
          const current = await Brightness.getBrightnessAsync();
          setRestoreBrightness(current);
          await Brightness.setBrightnessAsync(1);
        }
      } catch {
        /* brightness is best-effort */
      }
    })();
    return () => {
      mounted = false;
      if (restoreBrightness !== null) void Brightness.setBrightnessAsync(restoreBrightness);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stale = data && Date.now() > data.exp;
  const date = data?.eventStartAt
    ? new Date(data.eventStartAt).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Malta" })
    : "";

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Pressable hitSlop={12} onPress={() => router.back()} accessibilityLabel="Close ticket">
            <Text style={{ color: c.fog, fontSize: 24 }}>✕</Text>
          </Pressable>
          {data && <Pill text={data.status} tone={data.status === "active" ? "go" : data.status === "redeemed" ? "gold" : "default"} />}
        </View>

        <View style={{ alignItems: "center" }}>
          {data?.qrToken ? (
            <View style={{ backgroundColor: c.bone, borderRadius: r.xl, padding: 26 }}>
              <QRCode value={data.qrToken} size={264} backgroundColor={c.bone} color={c.ink} />
            </View>
          ) : data ? (
            <View style={{ backgroundColor: c.charcoal, borderRadius: r.xl, padding: 40, alignItems: "center" }}>
              <Text style={{ fontFamily: font.displayBlack, fontSize: 28, color: data.status === "redeemed" ? c.go : c.fog, textTransform: "uppercase" }}>
                {data.status === "redeemed" ? "✓ Checked in" : data.status}
              </Text>
            </View>
          ) : isError ? (
            <Text style={{ fontFamily: font.ui, color: c.ember300, textAlign: "center" }}>
              Couldn't load the ticket — check your connection.
            </Text>
          ) : (
            <View style={{ height: 316, width: 316, backgroundColor: c.charcoal, borderRadius: r.xl }} />
          )}
          {stale && (
            <Text style={{ fontFamily: font.mono, fontSize: 11, color: c.gold, marginTop: 12, textAlign: "center" }}>
              OFFLINE — cached code. Reconnect briefly before the door for a fresh QR.
            </Text>
          )}
        </View>

        <View style={{ alignItems: "center", gap: 6 }}>
          <Text style={{ fontFamily: font.displayBlack, fontSize: 24, textTransform: "uppercase", color: c.bone, textAlign: "center" }}>
            {data?.eventTitle ?? ""}
          </Text>
          <Text style={{ fontFamily: font.mono, fontSize: 12, color: c.sand }}>
            {date} · {data?.venue ?? ""}
          </Text>
          <Text style={{ fontFamily: font.ui, fontSize: 13, color: c.fog }}>{data?.tierName ?? ""}</Text>
          <Text style={{ fontFamily: font.monoBold, fontSize: 15, letterSpacing: 2, color: c.ember300, marginTop: 6 }}>
            {data?.serial ?? ""}
          </Text>
          <Text style={{ fontFamily: font.mono, fontSize: 10, color: c.ash, marginTop: 8, textAlign: "center" }}>
            Code refreshes automatically · screenshots won't scan
            {dataUpdatedAt ? ` · updated ${new Date(dataUpdatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : ""}
          </Text>
        </View>
      </SafeAreaView>
    </Screen>
  );
}
