"use server";

import { revalidatePath } from "next/cache";
import { eq, and, sql } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { assertTransition } from "@wii/core";
import { requireStaff, type StaffContext } from "@/lib/auth";

/** Append-only audit trail for every privileged mutation. */
async function audit(
  staff: StaffContext,
  action: string,
  entityType: string,
  entityId: string,
  before: unknown,
  after: unknown
) {
  await db().insert(s.auditLog).values({
    actorUserId: staff.userId,
    action,
    entityType,
    entityId,
    before: before ?? null,
    after: after ?? null,
  });
}

/* ---------------- Events ---------------- */

export async function publishEvent(eventId: string) {
  const staff = await requireStaff();
  const d = db();
  const ev = await d.query.events.findFirst({ where: eq(s.events.id, eventId) });
  if (!ev) throw new Error("event not found");
  assertTransition("event", ev.status, "published");
  await d
    .update(s.events)
    .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(s.events.id, eventId));
  await audit(staff, "event.publish", "event", eventId, { status: ev.status }, { status: "published" });
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
}

export async function cancelEvent(eventId: string, formData: FormData) {
  const staff = await requireStaff();
  const confirm = String(formData.get("confirm") ?? "");
  const d = db();
  const ev = await d.query.events.findFirst({ where: eq(s.events.id, eventId) });
  if (!ev) throw new Error("event not found");
  if (confirm !== ev.slug) throw new Error("type the event slug to confirm cancellation");
  assertTransition("event", ev.status, "cancelled");
  await d
    .update(s.events)
    .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
    .where(eq(s.events.id, eventId));
  await audit(staff, "event.cancel", "event", eventId, { status: ev.status }, { status: "cancelled" });
  // Phase 2: mass refund + ticket revocation jobs hook in here.
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
}

export async function updateEventBasics(eventId: string, formData: FormData) {
  const staff = await requireStaff();
  const title = String(formData.get("title") ?? "").trim();
  const blurb = String(formData.get("blurb") ?? "").trim();
  if (!title) throw new Error("title required");
  const d = db();
  const ev = await d.query.events.findFirst({ where: eq(s.events.id, eventId) });
  if (!ev) throw new Error("event not found");

  await d.update(s.events).set({ title, updatedAt: new Date() }).where(eq(s.events.id, eventId));
  await d
    .update(s.eventContent)
    .set({ blurb })
    .where(and(eq(s.eventContent.eventId, eventId), eq(s.eventContent.isLive, true)));
  await audit(staff, "event.update_basics", "event", eventId, { title: ev.title }, { title, blurb });
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
}

/* ---------------- Ambassadors ---------------- */

export async function inviteAmbassador(formData: FormData) {
  const staff = await requireStaff();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const bps = Number(formData.get("bps") ?? "") || null;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("valid email required");

  const d = db();
  const org = await d.query.organizers.findFirst({ where: eq(s.organizers.slug, "wii-malta") });
  if (!org) throw new Error("organizer missing");

  let user = await d.query.users.findFirst({ where: eq(s.users.email, email) });
  if (!user) {
    [user] = await d
      .insert(s.users)
      .values({ email, displayName: name || null, isGuest: false })
      .returning();
  }

  const [profile] = await d
    .insert(s.ambassadorProfiles)
    .values({
      userId: user.id,
      organizerId: org.id,
      status: "approved",
      commissionBps: bps,
      approvedBy: staff.userId,
      approvedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning();
  if (profile) {
    await audit(staff, "ambassador.invite", "ambassador_profile", profile.id, null, { email, bps });
  }
  revalidatePath("/ambassadors");
}

export async function setAmbassadorStatus(profileId: string, status: "approved" | "suspended") {
  const staff = await requireStaff();
  const d = db();
  const profile = await d.query.ambassadorProfiles.findFirst({
    where: eq(s.ambassadorProfiles.id, profileId),
  });
  if (!profile) throw new Error("profile not found");
  await d
    .update(s.ambassadorProfiles)
    .set(
      status === "approved"
        ? { status, approvedBy: staff.userId, approvedAt: new Date() }
        : { status }
    )
    .where(eq(s.ambassadorProfiles.id, profileId));
  await audit(staff, `ambassador.${status}`, "ambassador_profile", profileId, { status: profile.status }, { status });
  revalidatePath("/ambassadors");
}

export async function createReferralCode(formData: FormData) {
  const staff = await requireStaff();
  const ambassadorId = String(formData.get("ambassadorId") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const bps = Number(formData.get("bps") ?? "") || null;
  const eventId = String(formData.get("eventId") ?? "") || null;
  if (!/^[a-zA-Z0-9_-]{2,32}$/.test(code)) {
    throw new Error("code must be 2–32 chars (letters, numbers, - _)");
  }

  const d = db();
  const profile = await d.query.ambassadorProfiles.findFirst({
    where: eq(s.ambassadorProfiles.id, ambassadorId),
  });
  if (!profile) throw new Error("ambassador not found");
  if (profile.status !== "approved") throw new Error("ambassador is not approved");

  const clash = await d
    .select({ id: s.referralCodes.id })
    .from(s.referralCodes)
    .where(eq(sql`lower(${s.referralCodes.code})`, code.toLowerCase()))
    .limit(1);
  if (clash.length) throw new Error("code already taken");

  const [row] = await d
    .insert(s.referralCodes)
    .values({
      ambassadorId,
      organizerId: profile.organizerId,
      code,
      eventId: eventId || null,
      commissionBpsOverride: bps,
      status: "active",
    })
    .returning();
  await audit(staff, "referral_code.create", "referral_code", row.id, null, { code, bps, eventId });
  revalidatePath("/ambassadors");
}

export async function setReferralCodeStatus(codeId: string, status: "active" | "paused") {
  const staff = await requireStaff();
  const d = db();
  const row = await d.query.referralCodes.findFirst({ where: eq(s.referralCodes.id, codeId) });
  if (!row) throw new Error("code not found");
  await d.update(s.referralCodes).set({ status }).where(eq(s.referralCodes.id, codeId));
  await audit(staff, `referral_code.${status}`, "referral_code", codeId, { status: row.status }, { status });
  revalidatePath("/ambassadors");
}
