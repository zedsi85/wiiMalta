import "server-only";
import { randomBytes } from "crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { generateSerial } from "@wii/core";

/**
 * Ticket transfers — state-machine transition T6. The ticket stays active
 * (scannable) until the recipient ACCEPTS; acceptance atomically retires the
 * old ticket (qrVersion bump kills its QRs) and mints a fresh one for the
 * recipient. Platform-only transfers kill the screenshot-resale market.
 */

const TRANSFER_TTL_MS = 72 * 3600_000;

export type TransferError =
  | "not_owner"
  | "not_active"
  | "event_started"
  | "already_pending"
  | "invalid_email"
  | "not_found"
  | "expired"
  | "not_pending";

/** Tickets owned by an account email (buyer account "wallet" view). */
export async function ownedTickets(email: string) {
  const d = db();
  const user = await d.query.users.findFirst({ where: eq(s.users.email, email.toLowerCase()) });
  if (!user) return [];
  const tickets = await d
    .select({
      id: s.tickets.id,
      serial: s.tickets.serial,
      status: s.tickets.status,
      eventId: s.tickets.eventId,
      tierId: s.tickets.tierId,
      orderLineId: s.tickets.orderLineId,
    })
    .from(s.tickets)
    .where(eq(s.tickets.ownerUserId, user.id))
    .orderBy(desc(s.tickets.issuedAt));
  if (tickets.length === 0) return [];

  const [events, tiers, lines, pending] = await Promise.all([
    d.select().from(s.events).where(inArray(s.events.id, [...new Set(tickets.map((t) => t.eventId))])),
    d.select().from(s.ticketTiers).where(inArray(s.ticketTiers.id, [...new Set(tickets.map((t) => t.tierId))])),
    d.select().from(s.orderLines).where(inArray(s.orderLines.id, [...new Set(tickets.map((t) => t.orderLineId))])),
    d
      .select()
      .from(s.ticketTransfers)
      .where(
        and(
          inArray(s.ticketTransfers.ticketId, tickets.map((t) => t.id)),
          eq(s.ticketTransfers.status, "pending")
        )
      ),
  ]);
  const eventById = new Map(events.map((e) => [e.id, e]));
  const tierById = new Map(tiers.map((t) => [t.id, t]));
  const lineById = new Map(lines.map((l) => [l.id, l]));
  const pendingByTicket = new Map(pending.map((p) => [p.ticketId, p]));

  return tickets.map((t) => {
    const event = eventById.get(t.eventId);
    return {
      id: t.id,
      serial: t.serial,
      status: t.status,
      orderId: lineById.get(t.orderLineId)?.orderId ?? null,
      eventTitle: event?.title ?? "",
      eventStartAt: event?.startAt ?? null,
      eventStarted: event ? event.startAt.getTime() < Date.now() : false,
      tierName: tierById.get(t.tierId)?.name ?? "Ticket",
      pendingTransferTo: pendingByTicket.get(t.id)?.toEmail ?? null,
    };
  });
}

/** Owner initiates a transfer (T6 offer). Ticket remains active until accept. */
export async function createTicketTransfer(args: {
  ticketId: string;
  ownerEmail: string;
  toEmail: string;
}): Promise<{ ok: true; claimToken: string; expiresAt: Date } | { ok: false; error: TransferError }> {
  const d = db();
  const toEmail = args.toEmail.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(toEmail)) return { ok: false, error: "invalid_email" };

  const owner = await d.query.users.findFirst({
    where: eq(s.users.email, args.ownerEmail.toLowerCase()),
  });
  const ticket = await d.query.tickets.findFirst({ where: eq(s.tickets.id, args.ticketId) });
  if (!ticket || !owner || ticket.ownerUserId !== owner.id) return { ok: false, error: "not_owner" };
  if (ticket.status !== "active") return { ok: false, error: "not_active" };

  const event = await d.query.events.findFirst({ where: eq(s.events.id, ticket.eventId) });
  if (!event || event.startAt.getTime() < Date.now()) return { ok: false, error: "event_started" };

  const existing = await d.query.ticketTransfers.findFirst({
    where: and(eq(s.ticketTransfers.ticketId, ticket.id), eq(s.ticketTransfers.status, "pending")),
  });
  if (existing) return { ok: false, error: "already_pending" };

  const claimToken = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + TRANSFER_TTL_MS);
  await d.insert(s.ticketTransfers).values({
    ticketId: ticket.id,
    fromUserId: owner.id,
    toEmail,
    claimToken,
    status: "pending",
    expiresAt,
  });
  await d.insert(s.ticketEvents).values({
    ticketId: ticket.id,
    type: "transfer_offered",
    actorUserId: owner.id,
    data: { toEmail },
  });
  return { ok: true, claimToken, expiresAt };
}

export async function cancelTicketTransfer(args: { ticketId: string; ownerEmail: string }) {
  const d = db();
  const owner = await d.query.users.findFirst({
    where: eq(s.users.email, args.ownerEmail.toLowerCase()),
  });
  if (!owner) return;
  const transfer = await d.query.ticketTransfers.findFirst({
    where: and(eq(s.ticketTransfers.ticketId, args.ticketId), eq(s.ticketTransfers.status, "pending")),
  });
  if (!transfer || transfer.fromUserId !== owner.id) return;
  await d
    .update(s.ticketTransfers)
    .set({ status: "cancelled" })
    .where(eq(s.ticketTransfers.id, transfer.id));
  await d.insert(s.ticketEvents).values({
    ticketId: args.ticketId,
    type: "transfer_cancelled",
    actorUserId: owner.id,
    data: null,
  });
}

export async function transferByToken(claimToken: string) {
  const d = db();
  const transfer = await d.query.ticketTransfers.findFirst({
    where: eq(s.ticketTransfers.claimToken, claimToken),
  });
  if (!transfer) return null;
  const ticket = await d.query.tickets.findFirst({ where: eq(s.tickets.id, transfer.ticketId) });
  const event = ticket
    ? await d.query.events.findFirst({ where: eq(s.events.id, ticket.eventId) })
    : null;
  const tier = ticket
    ? await d.query.ticketTiers.findFirst({ where: eq(s.ticketTiers.id, ticket.tierId) })
    : null;
  const from = await d.query.users.findFirst({ where: eq(s.users.id, transfer.fromUserId) });
  return {
    transfer,
    ticketSerial: ticket?.serial ?? "",
    eventTitle: event?.title ?? "",
    eventStartAt: event?.startAt ?? null,
    tierName: tier?.name ?? "Ticket",
    fromName: from?.displayName ?? from?.email.split("@")[0] ?? "the buyer",
  };
}

/** Recipient accepts (T6 commit): old ticket → transferred + qrVersion++, new ticket minted. */
export async function acceptTicketTransfer(
  claimToken: string
): Promise<{ ok: true; newTicketId: string } | { ok: false; error: TransferError }> {
  const d = db();
  return await d.transaction(async (tx) => {
    const [transfer] = await tx
      .select()
      .from(s.ticketTransfers)
      .where(eq(s.ticketTransfers.claimToken, claimToken))
      .for("update");
    if (!transfer) return { ok: false, error: "not_found" as const };
    if (transfer.status !== "pending") return { ok: false, error: "not_pending" as const };
    if (transfer.expiresAt.getTime() < Date.now()) {
      await tx
        .update(s.ticketTransfers)
        .set({ status: "expired" })
        .where(eq(s.ticketTransfers.id, transfer.id));
      return { ok: false, error: "expired" as const };
    }

    const [ticket] = await tx
      .select()
      .from(s.tickets)
      .where(eq(s.tickets.id, transfer.ticketId))
      .for("update");
    if (!ticket || ticket.status !== "active") return { ok: false, error: "not_active" as const };

    let recipient = await tx.query.users.findFirst({ where: eq(s.users.email, transfer.toEmail) });
    if (!recipient) {
      [recipient] = await tx
        .insert(s.users)
        .values({ email: transfer.toEmail, isGuest: true })
        .returning();
    }

    // Retire the old ticket — version bump invalidates every rendered QR
    await tx
      .update(s.tickets)
      .set({ status: "transferred", qrVersion: sql`${s.tickets.qrVersion} + 1` })
      .where(eq(s.tickets.id, ticket.id));

    const [fresh] = await tx
      .insert(s.tickets)
      .values({
        organizerId: ticket.organizerId,
        eventId: ticket.eventId,
        orderLineId: ticket.orderLineId,
        ownerUserId: recipient.id,
        tierId: ticket.tierId,
        serial: generateSerial(),
        status: "active",
        qrVersion: 1,
        transferredFromTicketId: ticket.id,
      })
      .returning();

    await tx
      .update(s.ticketTransfers)
      .set({ status: "accepted", toUserId: recipient.id, newTicketId: fresh.id })
      .where(eq(s.ticketTransfers.id, transfer.id));

    await tx.insert(s.ticketEvents).values([
      { ticketId: ticket.id, type: "transferred", actorUserId: recipient.id, data: { to: transfer.toEmail, newTicketId: fresh.id } },
      { ticketId: fresh.id, type: "issued", actorUserId: recipient.id, data: { via: "transfer", fromTicketId: ticket.id } },
    ]);

    return { ok: true as const, newTicketId: fresh.id };
  });
}

/** Single-ticket view for recipients (scoped — never exposes the order). */
export async function ticketView(ticketId: string) {
  const d = db();
  const ticket = await d.query.tickets.findFirst({ where: eq(s.tickets.id, ticketId) });
  if (!ticket) return null;
  const [event, tier, owner] = await Promise.all([
    d.query.events.findFirst({ where: eq(s.events.id, ticket.eventId) }),
    d.query.ticketTiers.findFirst({ where: eq(s.ticketTiers.id, ticket.tierId) }),
    d.query.users.findFirst({ where: eq(s.users.id, ticket.ownerUserId) }),
  ]);
  const venue = event?.venueId
    ? await d.query.venues.findFirst({ where: eq(s.venues.id, event.venueId) })
    : null;
  return {
    id: ticket.id,
    serial: ticket.serial,
    status: ticket.status,
    qrVersion: ticket.qrVersion,
    tierName: tier?.name ?? "Ticket",
    eventTitle: event?.title ?? "",
    eventStartAt: event?.startAt ?? null,
    venue: venue ? `${venue.name} — ${venue.city}` : "TBA",
    ownerEmail: owner?.email ?? "",
  };
}
