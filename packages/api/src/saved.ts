import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";

/** Saved/favorite events — keyed by account email (guest-friendly). */
async function userIdFor(email: string, create = false) {
  const d = db();
  let user = await d.query.users.findFirst({ where: eq(s.users.email, email.toLowerCase()) });
  if (!user && create) {
    [user] = await d.insert(s.users).values({ email: email.toLowerCase(), isGuest: true }).returning();
  }
  return user?.id ?? null;
}

export async function savedEventIds(email: string): Promise<string[]> {
  const uid = await userIdFor(email);
  if (!uid) return [];
  const rows = await db()
    .select({ eventId: s.savedEvents.eventId })
    .from(s.savedEvents)
    .where(eq(s.savedEvents.userId, uid))
    .orderBy(desc(s.savedEvents.createdAt));
  return rows.map((r) => r.eventId);
}

export async function saveEvent(email: string, eventId: string) {
  const uid = await userIdFor(email, true);
  await db().insert(s.savedEvents).values({ userId: uid!, eventId }).onConflictDoNothing();
}

export async function unsaveEvent(email: string, eventId: string) {
  const uid = await userIdFor(email);
  if (!uid) return;
  await db()
    .delete(s.savedEvents)
    .where(and(eq(s.savedEvents.userId, uid), eq(s.savedEvents.eventId, eventId)));
}
