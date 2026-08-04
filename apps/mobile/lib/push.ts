import { useEffect } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Api } from "./api";

/** Register for Expo push and store the token against the account (backend devices table). */
export async function registerForPush(): Promise<boolean> {
  try {
    if (!Device.isDevice) return false;
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== "granted") {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== "granted") return false;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Wii",
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: "#ff4d1f",
      });
    }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
    await Api.registerDevice(token, Platform.OS === "android" ? "android" : "ios", Constants.expoConfig?.version);
    return true;
  } catch {
    return false;
  }
}

/** Notifications carry {url: "/tickets" | "/event/slug"} — route on tap. */
export function useNotificationDeepLinks() {
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url as string | undefined;
      if (url && url.startsWith("/")) router.push(url as never);
    });
    return () => sub.remove();
  }, []);
}
