import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";

/**
 * Expo push — server-side sender (plain HTTPS, no SDK). Devices register via
 * the account API; sends fan out to every device of a user. Fire-and-forget:
 * a push failure must never break a money path.
 */

export async function registerDevice(args: {
  email: string;
  pushToken: string;
  platform: "ios" | "android";
  appVersion?: string;
}) {
  const d = db();
  let user = await d.query.users.findFirst({ where: eq(s.users.email, args.email.toLowerCase()) });
  if (!user) {
    [user] = await d.insert(s.users).values({ email: args.email.toLowerCase(), isGuest: true }).returning();
  }
  await d
    .insert(s.devices)
    .values({ userId: user.id, platform: args.platform, pushToken: args.pushToken, appVersion: args.appVersion })
    .onConflictDoUpdate({
      target: s.devices.pushToken,
      set: { userId: user.id, platform: args.platform, appVersion: args.appVersion, lastSeenAt: new Date() },
    });
}

export async function unregisterDevice(pushToken: string) {
  await db().delete(s.devices).where(eq(s.devices.pushToken, pushToken));
}

export interface PushMessage {
  title: string;
  body: string;
  /** Deep-link payload consumed by the app: {url: "/ticket/…" | "/event/…"} */
  data?: Record<string, string>;
}

export async function pushToUserEmail(email: string, message: PushMessage) {
  try {
    const d = db();
    const user = await d.query.users.findFirst({ where: eq(s.users.email, email.toLowerCase()) });
    if (!user) return;
    const devices = await d.select().from(s.devices).where(eq(s.devices.userId, user.id));
    const tokens = devices.map((x) => x.pushToken).filter((t): t is string => !!t && t.startsWith("ExponentPushToken"));
    if (tokens.length === 0) return;
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tokens.map((to) => ({ to, sound: "default", title: message.title, body: message.body, data: message.data ?? {} }))),
    });
    const json = (await res.json().catch(() => ({}))) as { data?: { status: string; details?: { error?: string } }[] };
    const dead: string[] = [];
    (json.data ?? []).forEach((r, i) => {
      if (r.status === "error" && r.details?.error === "DeviceNotRegistered") dead.push(tokens[i]);
    });
    if (dead.length) await d.delete(s.devices).where(inArray(s.devices.pushToken, dead));
  } catch (e) {
    console.error("[push] send failed", e);
  }
}
