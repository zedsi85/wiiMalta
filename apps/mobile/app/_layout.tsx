import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts, Archivo_500Medium, Archivo_700Bold, Archivo_800ExtraBold, Archivo_900Black } from "@expo-google-fonts/archivo";
import { SpaceMono_400Regular, SpaceMono_700Bold } from "@expo-google-fonts/space-mono";
import { AuthProvider } from "@/lib/auth";
import { c } from "@/lib/theme";
import { OfflineBanner } from "@/components/offline";
import { useNotificationDeepLinks } from "@/lib/push";

void SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, refetchOnWindowFocus: false },
  },
});

function DeepLinkBridge() {
  useNotificationDeepLinks();
  return null;
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Archivo_500Medium,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    Archivo_900Black,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });
  useEffect(() => {
    if (loaded) void SplashScreen.hideAsync();
  }, [loaded]);
  if (!loaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="light" backgroundColor={c.void} />
        <OfflineBanner />
        <DeepLinkBridge />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: c.void },
            animation: "fade_from_bottom",
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
