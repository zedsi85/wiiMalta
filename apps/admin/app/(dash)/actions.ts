"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and, sql } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { assertTransition, centsFromLegacyString } from "@wii/core";
import { sendAmbassadorApprovedEmail } from "@wii/api";
import { requireStaff, type StaffContext } from "@/lib/auth";
import { localToUtc } from "@/lib/time";

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

export async function createEvent(formData: FormData) {
  const staff = await requireStaff();
  const d = db();

  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const startLocal = String(formData.get("startAt") ?? "");
  const endLocal = String(formData.get("endAt") ?? "");
  const kind = String(formData.get("kind") ?? "").trim() || "Night";
  const blurb = String(formData.get("blurb") ?? "").trim();
  const genres = String(formData.get("genres") ?? "")
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
  const tint = String(formData.get("tint") ?? "") || "linear-gradient(150deg,#241318,#0a0a0c 72%)";
  const age = Number(formData.get("age") ?? "") || null;
  const unlisted = formData.get("unlisted") === "on";

  if (!title) throw new Error("title required");
  if (!/^[a-z0-9-]{3,60}$/.test(slug)) throw new Error("slug: lowercase letters, digits, dashes");
  const start = localToUtc(startLocal);
  const end = localToUtc(endLocal);
  if (end <= start) throw new Error("end must be after start");

  // Venue: pick existing or create inline
  let venueId = String(formData.get("venueId") ?? "");
  const newVenueName = String(formData.get("newVenueName") ?? "").trim();
  const newVenueCity = String(formData.get("newVenueCity") ?? "").trim();

  // Tiers (parallel arrays; blank names are skipped)
  const names = formData.getAll("tierName").map(String);
  const prices = formData.getAll("tierPrice").map(String);
  const caps = formData.getAll("tierCap").map(String);
  const perks = formData.getAll("tierPerks").map(String);
  const vips = formData.getAll("tierVip").map(String); // row indexes, e.g. "0","2"
  const tierRows = names
    .map((name, i) => ({
      name: name.trim(),
      priceCents: prices[i] ? centsFromLegacyString(prices[i]) : NaN,
      capacity: parseInt(caps[i] ?? "", 10),
      perks: (perks[i] ?? "")
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean),
      vip: vips.includes(String(i)),
    }))
    .filter((t) => t.name.length > 0);
  if (tierRows.length === 0) throw new Error("at least one tier required");
  for (const t of tierRows) {
    if (!Number.isFinite(t.priceCents) || t.priceCents < 0) throw new Error(`tier "${t.name}": bad price`);
    if (!Number.isInteger(t.capacity) || t.capacity <= 0) throw new Error(`tier "${t.name}": bad capacity`);
  }

  const org = await d.query.organizers.findFirst({ where: eq(s.organizers.slug, "wii-malta") });
  if (!org) throw new Error("organizer missing");
  const clash = await d.query.events.findFirst({ where: eq(s.events.slug, slug) });
  if (clash) throw new Error(`slug "/${slug}" already exists`);

  const eventId = await d.transaction(async (tx) => {
    if (!venueId) {
      if (!newVenueName || !newVenueCity) throw new Error("pick a venue or create one");
      const [v] = await tx
        .insert(s.venues)
        .values({ organizerId: org.id, name: newVenueName, city: newVenueCity, country: "MT" })
        .returning();
      venueId = v.id;
    }

    const [ev] = await tx
      .insert(s.events)
      .values({
        organizerId: org.id,
        venueId,
        slug,
        title,
        status: "draft",
        timezone: "Europe/Malta",
        startAt: start,
        endAt: end,
        doorsAt: start,
        currency: org.defaultCurrency,
        ageRestriction: age,
        isUnlisted: unlisted,
        createdBy: staff.userId,
      })
      .returning();

    await tx.insert(s.eventContent).values({
      eventId: ev.id,
      version: 1,
      isLive: true,
      blurb,
      description: blurb,
      kind,
      genres,
      media: { tint },
      info: [],
      faq: [],
    });

    const totalCap = tierRows.reduce((n, t) => n + t.capacity, 0);
    await tx.insert(s.inventoryPools).values({ eventId: ev.id, tierId: null, capacity: totalCap });

    for (const [i, t] of tierRows.entries()) {
      const [tier] = await tx
        .insert(s.ticketTiers)
        .values({
          eventId: ev.id,
          organizerId: org.id,
          name: t.name,
          perks: t.perks,
          isVip: t.vip,
          status: "on_sale",
          sort: i,
        })
        .returning();
      await tx.insert(s.pricePhases).values({
        tierId: tier.id,
        name: "Phase 1",
        priceCents: t.priceCents,
        sort: 0,
      });
      await tx.insert(s.inventoryPools).values({
        eventId: ev.id,
        tierId: tier.id,
        capacity: t.capacity,
      });
    }
    return ev.id;
  });

  await audit(staff, "event.create", "event", eventId, null, { title, slug, tiers: tierRows.length });
  revalidatePath("/events");
  redirect(`/events/${eventId}`);
}

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
    const emailed = await notifyAmbassadorApproved(profile.id).catch(() => false);
    await audit(staff, "ambassador.invite", "ambassador_profile", profile.id, null, { email, bps, emailed });
  }
  revalidatePath("/ambassadors");
}

/** Welcome email on approval — best-effort, never blocks the admin action. */
async function notifyAmbassadorApproved(profileId: string): Promise<boolean> {
  const d = db();
  const profile = await d.query.ambassadorProfiles.findFirst({
    where: eq(s.ambassadorProfiles.id, profileId),
  });
  if (!profile) return false;
  const [user, org, code] = await Promise.all([
    d.query.users.findFirst({ where: eq(s.users.id, profile.userId) }),
    d.query.organizers.findFirst({ where: eq(s.organizers.id, profile.organizerId) }),
    d.query.referralCodes.findFirst({
      where: and(eq(s.referralCodes.ambassadorId, profile.id), eq(s.referralCodes.status, "active")),
    }),
  ]);
  if (!user?.email) return false;
  await sendAmbassadorApprovedEmail({
    to: user.email,
    name: user.displayName,
    code: code?.code ?? null,
    rateBps: profile.commissionBps ?? org?.defaultCommissionBps ?? 1000,
  });
  return true;
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
  // Welcome email on the transition into approved (not on re-saves)
  const emailed =
    status === "approved" && profile.status !== "approved"
      ? await notifyAmbassadorApproved(profileId).catch(() => false)
      : undefined;
  await audit(staff, `ambassador.${status}`, "ambassador_profile", profileId, { status: profile.status }, { status, ...(emailed !== undefined && { emailed }) });
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

/* ---------------- Orders & tickets (ticketing slice) ---------------- */

import {
  refundOrderFully,
  sweepExpiredOrders,
  redeemTicket,
  unredeemTicket,
  revokeTicket,
  issueCompTickets,
  sendOrderTickets,
  type RedeemResult,
} from "@wii/api";

export async function refundOrderAction(orderId: string, formData: FormData) {
  const staff = await requireStaff();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) throw new Error("refund reason required");
  await refundOrderFully({ orderId, reason, initiatedByUserId: staff.userId });
  await audit(staff, "order.refund_full", "order", orderId, null, { reason });
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
}

export async function sweepOrdersAction() {
  const staff = await requireStaff();
  const n = await sweepExpiredOrders();
  await audit(staff, "orders.sweep", "order", "batch", null, { expired: n });
  revalidatePath("/orders");
}

export async function revokeTicketAction(ticketId: string, formData: FormData) {
  const staff = await requireStaff();
  const reason = String(formData.get("reason") ?? "").trim() || "admin revocation";
  await revokeTicket({ ticketId, actorUserId: staff.userId, reason });
  await audit(staff, "ticket.revoke", "ticket", ticketId, null, { reason });
  revalidatePath("/tickets");
}

export async function unredeemTicketAction(ticketId: string) {
  const staff = await requireStaff();
  await unredeemTicket({ ticketId, actorUserId: staff.userId, reason: "door correction" });
  await audit(staff, "ticket.unredeem", "ticket", ticketId, null, null);
  revalidatePath("/tickets");
  revalidatePath("/scan");
}

export async function compTicketsAction(formData: FormData) {
  const staff = await requireStaff();
  const eventId = String(formData.get("eventId") ?? "");
  const tierId = String(formData.get("tierId") ?? "");
  const email = String(formData.get("email") ?? "");
  const qty = Number(formData.get("qty") ?? 1);
  const result = await issueCompTickets({ eventId, tierId, email, qty, actorUserId: staff.userId });
  await audit(staff, "ticket.comp", "order", result.orderId, null, { email, qty, serials: result.serials });
  await sendOrderTickets(result.orderId);
  revalidatePath("/tickets");
}

export async function redeemAction(_prev: RedeemResult | null, formData: FormData): Promise<RedeemResult> {
  const staff = await requireStaff();
  const input = String(formData.get("code") ?? "");
  const result = await redeemTicket({ tokenOrSerial: input, scannerUserId: staff.userId, gate: "admin" });
  await audit(staff, "ticket.scan", "ticket", input.slice(0, 24), null, { ok: result.ok });
  return result;
}

/* ---------------- Guards (door crew) ---------------- */

export async function assignGuardAction(formData: FormData) {
  const staff = await requireStaff();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const eventId = String(formData.get("eventId") ?? "");
  const gate = String(formData.get("gate") ?? "").trim() || null;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("valid email required");
  if (!eventId) throw new Error("event required");

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

  await d
    .insert(s.organizerMembers)
    .values({ organizerId: org.id, userId: user.id, role: "scanner", invitedBy: staff.userId })
    .onConflictDoNothing();
  await d
    .insert(s.scannerAssignments)
    .values({ eventId, userId: user.id, gate, createdBy: staff.userId })
    .onConflictDoNothing();

  await audit(staff, "guard.assign", "scanner_assignment", `${eventId}:${user.id}`, null, {
    email,
    gate,
  });
  revalidatePath("/guards");
}

export async function removeGuardAssignmentAction(eventId: string, userId: string) {
  const staff = await requireStaff();
  const d = db();
  await d
    .delete(s.scannerAssignments)
    .where(and(eq(s.scannerAssignments.eventId, eventId), eq(s.scannerAssignments.userId, userId)));
  await audit(staff, "guard.unassign", "scanner_assignment", `${eventId}:${userId}`, null, null);
  revalidatePath("/guards");
}

/* ---------------- Ambassador payouts ---------------- */

import {
  bulkTransition,
  runCommissionMaturity,
  settleCommissions,
  transitionCommission,
} from "@wii/api";
import type { CommissionStatus } from "@wii/core";

function selectedIds(formData: FormData): string[] {
  return formData.getAll("ids").map(String).filter(Boolean);
}

export async function commissionBulkAction(formData: FormData) {
  const staff = await requireStaff();
  const op = String(formData.get("op") ?? "");
  const ids = selectedIds(formData);
  if (ids.length === 0) throw new Error("select at least one commission");

  if (op === "paid") {
    const reference = String(formData.get("reference") ?? "").trim();
    if (!reference) throw new Error("payment reference required to mark paid");
    const r = await settleCommissions(ids, { userId: staff.userId }, { reference });
    await audit(staff, "payouts.settle_bulk", "commission", "batch", null, { ...r, reference });
  } else {
    const map: Record<string, CommissionStatus> = {
      approve: "approved",
      reject: "rejected",
      processing: "processing",
    };
    const to = map[op];
    if (!to) throw new Error("unknown operation");
    const r = await bulkTransition(ids, to, { userId: staff.userId });
    await audit(staff, `payouts.bulk_${op}`, "commission", "batch", null, r);
  }
  revalidatePath("/payouts");
}

export async function singleCommissionAction(id: string, to: CommissionStatus) {
  const staff = await requireStaff();
  const r = await transitionCommission(id, to, { userId: staff.userId });
  if (!r.ok) throw new Error(r.error);
  revalidatePath("/payouts");
}

export async function runMaturityAction() {
  const staff = await requireStaff();
  const n = await runCommissionMaturity({ userId: staff.userId });
  await audit(staff, "payouts.maturity_run", "commission", "batch", null, { matured: n });
  revalidatePath("/payouts");
}

export async function setAmbassadorTermsAction(profileId: string, formData: FormData) {
  const staff = await requireStaff();
  const bps = Number(formData.get("bps") ?? "");
  const bonus = Math.round(Number(formData.get("bonusEur") ?? "0") * 100);
  const d = db();
  await d
    .update(s.ambassadorProfiles)
    .set({
      commissionBps: Number.isFinite(bps) && bps > 0 ? bps : null,
      fixedBonusCents: Number.isFinite(bonus) && bonus >= 0 ? bonus : 0,
    })
    .where(eq(s.ambassadorProfiles.id, profileId));
  await audit(staff, "ambassador.terms", "ambassador_profile", profileId, null, { bps, bonus });
  revalidatePath("/ambassadors");
}


export async function resendTicketsAction(orderId: string) {
  const staff = await requireStaff();
  const result = await sendOrderTickets(orderId);
  await audit(staff, "order.tickets_resend", "order", orderId, null, result);
  revalidatePath(`/orders/${orderId}`);
}
