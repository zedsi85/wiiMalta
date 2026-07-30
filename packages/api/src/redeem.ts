import "server-only";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { verifyQrToken } from "@wii/core";

/**
 * Check-in (T3): atomic redeem, idempotent per ticket. Accepts a signed QR
 * token or a raw serial (door fallback). A duplicate scan is NOT an error —
 * door staff get "already redeemed at {time}", per the state-machine spec.
 */

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
  | { ok: false; reason: "invalid" | "expired_qr" | "revoked" | "not_active" | "wrong_version" };

export async function redeemTicket(args: {
  tokenOrSerial: string;
  scannerUserId: string;
  gate?: string;
}): Promise<RedeemResult> {
  const d = db();
  const input = args.tokenOrSerial.trim();

  let ticketId: string | null = null;
  let expectedVersion: number | null = null;

  if (input.startsWith("wt1.")) {
    const secret = process.env.QR_SIGNING_SECRET;
    if (!secret) return { ok: false, reason: "invalid" };
    const verdict = verifyQrToken(input, secret);
    if (!verdict.ok) {
      return { ok: false, reason: verdict.reason === "expired" ? "expired_qr" : "invalid" };
    }
    ticketId = verdict.payload.ticketId;
    expectedVersion = verdict.payload.qrVersion;
  } else if (/^WII-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(input)) {
    const bySerial = await d.query.tickets.findFirst({
      where: eq(s.tickets.serial, input.toUpperCase()),
    });
    if (!bySerial) return { ok: false, reason: "invalid" };
    ticketId = bySerial.id;
  } else {
    return { ok: false, reason: "invalid" };
  }

  return await d.transaction(async (tx) => {
    const [ticket] = await tx.select().from(s.tickets).where(eq(s.tickets.id, ticketId!)).for("update");
    if (!ticket) return { ok: false, reason: "invalid" as const };
    if (expectedVersion !== null && ticket.qrVersion !== expectedVersion) {
      return { ok: false, reason: "wrong_version" as const };
    }

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
      scannedAt: new Date(),
      wasOffline: false,
      clientScanId: randomUUID(),
    });
    await tx.insert(s.ticketEvents).values({
      ticketId: ticket.id,
      type: "redeemed",
      actorUserId: args.scannerUserId,
      data: { gate: args.gate ?? null },
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
