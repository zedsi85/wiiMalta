import "server-only";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { verifyQrToken } from "@wii/core";

/**
 * Check-in (T3): atomic redeem, idempotent per ticket AND per clientScanId
 * (offline replay). Accepts a signed QR token or a raw serial (door
 * fallback). A duplicate scan is NOT an error — door staff get "already
 * redeemed at {time}", per the state-machine spec.
 *
 * `inspectTicket` is the read-only "peek" used by the guard portal to show
 * attendee details before the Admit button commits the redemption.
 */

export type RejectReason =
  | "invalid"
  | "expired_qr"
  | "revoked"
  | "not_active"
  | "wrong_version"
  | "wrong_event";

export interface TicketInfo {
  ticketId: string;
  serial: string;
  status: string;
  tierName: string;
  eventId: string;
  eventTitle: string;
  /** Customer display name (falls back to email local part). */
  customerName: string;
  /** Short order reference (first 8 chars, uppercased). */
  orderRef: string;
  redeemedAt: string | null;
  redeemedGate: string | null;
}

export type InspectResult =
  | { ok: true; info: TicketInfo }
  | { ok: false; reason: RejectReason };

export type RedeemResult =
  | {
      ok: true;
      serial: string;
      tierName: string;
      eventTitle: string;
      alreadyRedeemed: false;
    }
  | {
      ok: true;
      serial: string;
      tierName: string;
      eventTitle: string;
      alreadyRedeemed: true;
      redeemedAt: string;
      gate: string | null;
    }
  | { ok: false; reason: RejectReason };

/** Resolve a QR token or serial to a ticket id (+ expected qrVersion for tokens). */
function resolveInput(
  input: string,
  opts?: { allowExpiredToken?: boolean }
):
  | { kind: "token"; ticketId: string; qrVersion: number }
  | { kind: "serial"; serial: string }
  | { kind: "reject"; reason: RejectReason } {
  const trimmed = input.trim();
  if (trimmed.startsWith("wt1.")) {
    const secret = process.env.QR_SIGNING_SECRET;
    if (!secret) return { kind: "reject", reason: "invalid" };
    const verdict = verifyQrToken(trimmed, secret);
    if (!verdict.ok) {
      if (verdict.reason === "expired" && opts?.allowExpiredToken) {
        // Offline-sync path: signature already proven valid by verifyQrToken
        // before the expiry check — re-parse the payload.
        try {
          const payload = JSON.parse(
            Buffer.from(trimmed.split(".")[1], "base64url").toString()
          ) as { ticketId: string; qrVersion: number };
          return { kind: "token", ticketId: payload.ticketId, qrVersion: payload.qrVersion };
        } catch {
          return { kind: "reject", reason: "invalid" };
        }
      }
      return {
        kind: "reject",
        reason: verdict.reason === "expired" ? "expired_qr" : "invalid",
      };
    }
    return { kind: "token", ticketId: verdict.payload.ticketId, qrVersion: verdict.payload.qrVersion };
  }
  if (/^WII-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(trimmed)) {
    return { kind: "serial", serial: trimmed.toUpperCase() };
  }
  return { kind: "reject", reason: "invalid" };
}

async function loadTicketByInput(
  input: string,
  opts?: { allowExpiredToken?: boolean }
): Promise<
  | { ticket: typeof s.tickets.$inferSelect; expectedVersion: number | null }
  | { reject: RejectReason }
> {
  const d = db();
  const resolved = resolveInput(input, opts);
  if (resolved.kind === "reject") return { reject: resolved.reason };

  const ticket =
    resolved.kind === "token"
      ? await d.query.tickets.findFirst({ where: eq(s.tickets.id, resolved.ticketId) })
      : await d.query.tickets.findFirst({ where: eq(s.tickets.serial, resolved.serial) });
  if (!ticket) return { reject: "invalid" };
  const expectedVersion = resolved.kind === "token" ? resolved.qrVersion : null;
  if (expectedVersion !== null && ticket.qrVersion !== expectedVersion) {
    return { reject: "wrong_version" };
  }
  return { ticket, expectedVersion };
}

/** Read-only peek: full attendee details, no state change. */
export async function inspectTicket(args: {
  tokenOrSerial: string;
  /** If set, tickets for other events are rejected as wrong_event (guard scoping). */
  restrictToEventIds?: string[];
}): Promise<InspectResult> {
  const d = db();
  const loaded = await loadTicketByInput(args.tokenOrSerial);
  if ("reject" in loaded) return { ok: false, reason: loaded.reject };
  const { ticket } = loaded;

  if (args.restrictToEventIds && !args.restrictToEventIds.includes(ticket.eventId)) {
    return { ok: false, reason: "wrong_event" };
  }

  const [event, tier, owner, line] = await Promise.all([
    d.query.events.findFirst({ where: eq(s.events.id, ticket.eventId) }),
    d.query.ticketTiers.findFirst({ where: eq(s.ticketTiers.id, ticket.tierId) }),
    d.query.users.findFirst({ where: eq(s.users.id, ticket.ownerUserId) }),
    d.query.orderLines.findFirst({ where: eq(s.orderLines.id, ticket.orderLineId) }),
  ]);
  const redemption =
    ticket.status === "redeemed"
      ? await d.query.redemptions.findFirst({ where: eq(s.redemptions.ticketId, ticket.id) })
      : undefined;

  return {
    ok: true,
    info: {
      ticketId: ticket.id,
      serial: ticket.serial,
      status: ticket.status,
      tierName: tier?.name ?? "Ticket",
      eventId: ticket.eventId,
      eventTitle: event?.title ?? "",
      customerName: owner?.displayName ?? owner?.email.split("@")[0] ?? "Guest",
      orderRef: (line?.orderId ?? "").slice(0, 8).toUpperCase(),
      redeemedAt: (redemption?.scannedAt ?? ticket.redeemedAt)?.toISOString() ?? null,
      redeemedGate: redemption?.gate ?? null,
    },
  };
}

export async function redeemTicket(args: {
  tokenOrSerial: string;
  scannerUserId: string;
  gate?: string;
  /** Client-supplied idempotency id — offline queue replays are no-ops. */
  clientScanId?: string;
  device?: string;
  location?: string;
  /** Original scan time (offline queue) — defaults to now. */
  scannedAt?: Date;
  wasOffline?: boolean;
  /** Offline sync only: accept structurally valid but time-expired QR tokens. */
  allowExpiredToken?: boolean;
  /** Guard scoping — tickets outside these events are rejected. */
  restrictToEventIds?: string[];
}): Promise<RedeemResult> {
  const d = db();

  // clientScanId replay → return the recorded outcome without touching state
  if (args.clientScanId) {
    const prior = await d.query.redemptions.findFirst({
      where: eq(s.redemptions.clientScanId, args.clientScanId),
    });
    if (prior) {
      const ticket = await d.query.tickets.findFirst({ where: eq(s.tickets.id, prior.ticketId) });
      const tier = ticket
        ? await d.query.ticketTiers.findFirst({ where: eq(s.ticketTiers.id, ticket.tierId) })
        : undefined;
      const event = ticket
        ? await d.query.events.findFirst({ where: eq(s.events.id, ticket.eventId) })
        : undefined;
      return {
        ok: true,
        serial: ticket?.serial ?? "",
        tierName: tier?.name ?? "Ticket",
        eventTitle: event?.title ?? "",
        alreadyRedeemed: false, // this very scan won the race earlier
      };
    }
  }

  const loaded = await loadTicketByInput(args.tokenOrSerial, {
    allowExpiredToken: args.allowExpiredToken,
  });
  if ("reject" in loaded) return { ok: false, reason: loaded.reject };
  const ticketId = loaded.ticket.id;

  if (args.restrictToEventIds && !args.restrictToEventIds.includes(loaded.ticket.eventId)) {
    return { ok: false, reason: "wrong_event" };
  }

  return await d.transaction(async (tx) => {
    const [ticket] = await tx.select().from(s.tickets).where(eq(s.tickets.id, ticketId)).for("update");
    if (!ticket) return { ok: false, reason: "invalid" as const };

    const [event] = await tx.select().from(s.events).where(eq(s.events.id, ticket.eventId));
    const [tier] = await tx.select().from(s.ticketTiers).where(eq(s.ticketTiers.id, ticket.tierId));

    if (ticket.status === "redeemed") {
      const redemption = await tx.query.redemptions.findFirst({
        where: eq(s.redemptions.ticketId, ticket.id),
      });
      return {
        ok: true as const,
        serial: ticket.serial,
        tierName: tier?.name ?? "Ticket",
        eventTitle: event?.title ?? "",
        alreadyRedeemed: true as const,
        redeemedAt: (redemption?.scannedAt ?? ticket.redeemedAt ?? new Date()).toISOString(),
        gate: redemption?.gate ?? null,
      };
    }
    if (ticket.status === "revoked") return { ok: false, reason: "revoked" as const };
    if (ticket.status !== "active") return { ok: false, reason: "not_active" as const };

    await tx
      .update(s.tickets)
      .set({ status: "redeemed", redeemedAt: new Date() })
      .where(eq(s.tickets.id, ticket.id));
    await tx.insert(s.redemptions).values({
      ticketId: ticket.id,
      eventId: ticket.eventId,
      scannerUserId: args.scannerUserId,
      gate: args.gate ?? null,
      scannedAt: args.scannedAt ?? new Date(),
      wasOffline: args.wasOffline ?? false,
      clientScanId: args.clientScanId ?? randomUUID(),
      device: args.device ?? null,
      location: args.location ?? null,
    });
    await tx.insert(s.ticketEvents).values({
      ticketId: ticket.id,
      type: "redeemed",
      actorUserId: args.scannerUserId,
      data: { gate: args.gate ?? null, offline: args.wasOffline ?? false },
    });

    return {
      ok: true as const,
      serial: ticket.serial,
      tierName: tier?.name ?? "Ticket",
      eventTitle: event?.title ?? "",
      alreadyRedeemed: false as const,
    };
  });
}

/** Manager-gated door-mistake correction (T4). */
export async function unredeemTicket(args: { ticketId: string; actorUserId: string; reason: string }) {
  const d = db();
  await d.transaction(async (tx) => {
    const [ticket] = await tx
      .select()
      .from(s.tickets)
      .where(eq(s.tickets.id, args.ticketId))
      .for("update");
    if (!ticket || ticket.status !== "redeemed") throw new Error("ticket is not redeemed");
    await tx.update(s.tickets).set({ status: "active", redeemedAt: null }).where(eq(s.tickets.id, ticket.id));
    await tx.delete(s.redemptions).where(eq(s.redemptions.ticketId, ticket.id));
    await tx.insert(s.ticketEvents).values({
      ticketId: ticket.id,
      type: "unredeemed",
      actorUserId: args.actorUserId,
      data: { reason: args.reason },
    });
  });
}
