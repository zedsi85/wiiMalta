import "server-only";
import { randomUUID } from "crypto";
import { asc, eq, sql, and } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { generateSerial } from "@wii/core";

/**
 * Comp (complimentary) tickets — a zero-total paid order minted directly.
 * Consumes real inventory (a comp is a real admission) under the same pool
 * locks as paid sales.
 */
export async function issueCompTickets(args: {
  eventId: string;
  tierId: string;
  email: string;
  qty: number;
  actorUserId: string;
}) {
  const d = db();
  if (!Number.isInteger(args.qty) || args.qty < 1 || args.qty > 20) throw new Error("qty 1–20");
  const email = args.email.trim().toLowerCase();

  return await d.transaction(async (tx) => {
    const [event] = await tx.select().from(s.events).where(eq(s.events.id, args.eventId));
    if (!event) throw new Error("event not found");
    const [tier] = await tx.select().from(s.ticketTiers).where(eq(s.ticketTiers.id, args.tierId));
    if (!tier || tier.eventId !== event.id) throw new Error("tier not found");
    const [phase] = await tx
      .select()
      .from(s.pricePhases)
      .where(eq(s.pricePhases.tierId, tier.id))
      .orderBy(asc(s.pricePhases.sort))
      .limit(1);
    if (!phase) throw new Error("tier has no price phase");

    // Pool locks + capacity (tier + event-wide)
    const pools = await tx
      .select()
      .from(s.inventoryPools)
      .where(eq(s.inventoryPools.eventId, event.id))
      .orderBy(s.inventoryPools.id)
      .for("update");
    for (const pool of pools) {
      if (pool.tierId === tier.id || pool.tierId === null) {
        if (pool.capacity - pool.soldCount - pool.heldCount < args.qty) {
          throw new Error("not enough inventory for comps");
        }
      }
    }
    for (const pool of pools) {
      if (pool.tierId === tier.id || pool.tierId === null) {
        await tx
          .update(s.inventoryPools)
          .set({ soldCount: sql`${s.inventoryPools.soldCount} + ${args.qty}`, updatedAt: new Date() })
          .where(eq(s.inventoryPools.id, pool.id));
      }
    }

    let owner = await tx.query.users.findFirst({ where: eq(s.users.email, email) });
    if (!owner) {
      [owner] = await tx.insert(s.users).values({ email, isGuest: true }).returning();
    }

    const [order] = await tx
      .insert(s.orders)
      .values({
        organizerId: event.organizerId,
        eventId: event.id,
        userId: owner.id,
        email,
        status: "paid",
        currency: event.currency,
        subtotalCents: 0,
        feesCents: 0,
        totalCents: 0,
        idempotencyKey: `comp_${randomUUID()}`,
        paidAt: new Date(),
      })
      .returning();
    const [line] = await tx
      .insert(s.orderLines)
      .values({
        orderId: order.id,
        tierId: tier.id,
        pricePhaseId: phase.id,
        qty: args.qty,
        unitPriceCents: 0,
        unitFeeCents: 0,
        lineTotalCents: 0,
      })
      .returning();

    const serials: string[] = [];
    for (let i = 0; i < args.qty; i++) {
      const [ticket] = await tx
        .insert(s.tickets)
        .values({
          organizerId: event.organizerId,
          eventId: event.id,
          orderLineId: line.id,
          ownerUserId: owner.id,
          tierId: tier.id,
          serial: generateSerial(),
          status: "active",
          qrVersion: 1,
        })
        .returning();
      serials.push(ticket.serial);
      await tx.insert(s.ticketEvents).values({
        ticketId: ticket.id,
        type: "issued",
        actorUserId: args.actorUserId,
        data: { comp: true, orderId: order.id },
      });
    }
    return { orderId: order.id, serials };
  });
}

/** Admin ticket revocation (T5) — qrVersion bump kills every rendered QR. */
export async function revokeTicket(args: { ticketId: string; actorUserId: string; reason: string }) {
  const d = db();
  await d.transaction(async (tx) => {
    const [ticket] = await tx
      .select()
      .from(s.tickets)
      .where(eq(s.tickets.id, args.ticketId))
      .for("update");
    if (!ticket) throw new Error("ticket not found");
    if (ticket.status !== "active" && ticket.status !== "issued") {
      throw new Error(`cannot revoke ticket in status ${ticket.status}`);
    }
    await tx
      .update(s.tickets)
      .set({ status: "revoked", revokedAt: new Date(), qrVersion: sql`${s.tickets.qrVersion} + 1` })
      .where(eq(s.tickets.id, ticket.id));
    await tx.insert(s.ticketEvents).values({
      ticketId: ticket.id,
      type: "revoked",
      actorUserId: args.actorUserId,
      data: { reason: args.reason },
    });
    // Return the admission to inventory
    const pools = await tx
      .select()
      .from(s.inventoryPools)
      .where(and(eq(s.inventoryPools.eventId, ticket.eventId)))
      .orderBy(s.inventoryPools.id)
      .for("update");
    for (const pool of pools) {
      if (pool.tierId === ticket.tierId || pool.tierId === null) {
        await tx
          .update(s.inventoryPools)
          .set({ soldCount: sql`greatest(${s.inventoryPools.soldCount} - 1, 0)`, updatedAt: new Date() })
          .where(eq(s.inventoryPools.id, pool.id));
      }
    }
  });
}
