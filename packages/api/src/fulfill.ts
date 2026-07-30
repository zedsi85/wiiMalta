import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { COMMISSION_GRACE_MS, generateSerial } from "@wii/core";
import { paymentProvider } from "./provider";

/**
 * Fulfillment — transition O3 (finalize on payment success) and O7/O8
 * (refunds), per docs/architecture/state-machines.md. finalizePaidOrder is
 * strictly idempotent: replaying a webhook is a no-op.
 */

export async function finalizePaidOrder(args: {
  orderId: string;
  providerPaymentId?: string;
}): Promise<{ outcome: "paid" | "already_paid" | "refund_required" | "not_finalizable" }> {
  const d = db();

  return await d.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(s.orders)
      .where(eq(s.orders.id, args.orderId))
      .for("update");
    if (!order) return { outcome: "not_finalizable" as const };
    if (order.status === "paid" || order.status === "partially_refunded" || order.status === "refunded") {
      return { outcome: "already_paid" as const };
    }

    const lines = await tx.select().from(s.orderLines).where(eq(s.orderLines.orderId, order.id));
    const event = (await tx.select().from(s.events).where(eq(s.events.id, order.eventId)))[0];

    // Holds: convert if alive; if they expired (O3/O5 race) try to re-acquire.
    const holdRows = await tx
      .select()
      .from(s.holds)
      .where(eq(s.holds.orderId, order.id))
      .for("update");
    const active = holdRows.filter((h) => h.status === "active");

    const pools = await tx
      .select()
      .from(s.inventoryPools)
      .where(eq(s.inventoryPools.eventId, order.eventId))
      .orderBy(s.inventoryPools.id)
      .for("update");
    const poolById = new Map(pools.map((p) => [p.id, p]));

    if (active.length > 0) {
      // Normal path: held → sold
      for (const h of active) {
        await tx
          .update(s.inventoryPools)
          .set({
            heldCount: sql`greatest(${s.inventoryPools.heldCount} - ${h.qty}, 0)`,
            soldCount: sql`${s.inventoryPools.soldCount} + ${h.qty}`,
            updatedAt: new Date(),
          })
          .where(eq(s.inventoryPools.id, h.poolId));
        await tx.update(s.holds).set({ status: "converted" }).where(eq(s.holds.id, h.id));
      }
    } else {
      // Race path: holds lapsed before the payment landed. Re-acquire directly
      // as sold if stock remains; otherwise the money must go back.
      for (const h of holdRows) {
        const pool = poolById.get(h.poolId)!;
        if (pool.capacity - pool.soldCount - pool.heldCount < h.qty) {
          return { outcome: "refund_required" as const };
        }
      }
      for (const h of holdRows) {
        await tx
          .update(s.inventoryPools)
          .set({ soldCount: sql`${s.inventoryPools.soldCount} + ${h.qty}`, updatedAt: new Date() })
          .where(eq(s.inventoryPools.id, h.poolId));
        await tx.update(s.holds).set({ status: "converted" }).where(eq(s.holds.id, h.id));
      }
    }

    // Phase sold counters
    for (const line of lines) {
      await tx
        .update(s.pricePhases)
        .set({ soldCount: sql`${s.pricePhases.soldCount} + ${line.qty}` })
        .where(eq(s.pricePhases.id, line.pricePhaseId));
    }

    // Payment row → succeeded
    await tx
      .update(s.payments)
      .set({
        status: "succeeded",
        providerPaymentId: args.providerPaymentId ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(s.payments.orderId, order.id), eq(s.payments.status, "created")));

    // Owner user (guest shadow account by email)
    let owner = await tx.query.users.findFirst({ where: eq(s.users.email, order.email) });
    if (!owner) {
      [owner] = await tx
        .insert(s.users)
        .values({ email: order.email, isGuest: true })
        .returning();
    }
    if (order.userId == null) {
      await tx.update(s.orders).set({ userId: owner.id }).where(eq(s.orders.id, order.id));
    }

    // Mint tickets — one row per admission (T1 → T2 active immediately;
    // email delivery is a later async concern)
    for (const line of lines) {
      for (let i = 0; i < line.qty; i++) {
        const [ticket] = await tx
          .insert(s.tickets)
          .values({
            organizerId: order.organizerId,
            eventId: order.eventId,
            orderLineId: line.id,
            ownerUserId: owner.id,
            tierId: line.tierId,
            serial: generateSerial(),
            status: "active",
            qrVersion: 1,
          })
          .returning();
        await tx.insert(s.ticketEvents).values({
          ticketId: ticket.id,
          type: "issued",
          data: { orderId: order.id },
        });
      }
    }

    // Referral attribution + commission (locked exactly once, here)
    if (order.candidateReferralCodeId) {
      const code = await tx.query.referralCodes.findFirst({
        where: eq(s.referralCodes.id, order.candidateReferralCodeId),
      });
      const profile = code
        ? await tx.query.ambassadorProfiles.findFirst({
            where: eq(s.ambassadorProfiles.id, code.ambassadorId),
          })
        : undefined;
      const org = (await tx.select().from(s.organizers).where(eq(s.organizers.id, order.organizerId)))[0];
      const eligible =
        code &&
        profile &&
        code.status === "active" &&
        profile.status === "approved" &&
        (!code.eventId || code.eventId === order.eventId) &&
        profile.userId !== owner.id; // self-referral block
      if (eligible) {
        const [attribution] = await tx
          .insert(s.referralAttributions)
          .values({ orderId: order.id, codeId: code.id, ambassadorId: profile.id, source: "link" })
          .onConflictDoNothing()
          .returning();
        if (attribution) {
          const rateBps =
            code.commissionBpsOverride ?? profile.commissionBps ?? org.defaultCommissionBps;
          await tx.insert(s.commissions).values({
            attributionId: attribution.id,
            orderId: order.id,
            ambassadorId: profile.id,
            organizerId: order.organizerId,
            rateBps,
            amountCents: Math.round((order.subtotalCents * rateBps) / 10_000),
            status: "pending",
            payableAt: new Date(event.endAt.getTime() + COMMISSION_GRACE_MS),
          });
        }
      }
    }

    // Order → paid
    await tx
      .update(s.orders)
      .set({ status: "paid", paidAt: new Date(), expiresAt: null, updatedAt: new Date() })
      .where(eq(s.orders.id, order.id));

    // Tier sold_out flags
    for (const pool of pools.filter((p) => p.tierId)) {
      const [fresh] = await tx
        .select()
        .from(s.inventoryPools)
        .where(eq(s.inventoryPools.id, pool.id));
      if (fresh.soldCount >= fresh.capacity) {
        await tx
          .update(s.ticketTiers)
          .set({ status: "sold_out" })
          .where(eq(s.ticketTiers.id, pool.tierId!));
      }
    }

    return { outcome: "paid" as const };
  });
}

/* ---------------- O7/O8: refund (full, v1) ---------------- */

export async function refundOrderFully(args: {
  orderId: string;
  reason: string;
  initiatedByUserId: string;
}) {
  const d = db();
  const order = await d.query.orders.findFirst({ where: eq(s.orders.id, args.orderId) });
  if (!order) throw new Error("order not found");
  if (order.status !== "paid" && order.status !== "partially_refunded") {
    throw new Error(`cannot refund order in status ${order.status}`);
  }
  const payment = await d.query.payments.findFirst({
    where: and(eq(s.payments.orderId, order.id), eq(s.payments.status, "succeeded")),
  });
  if (!payment) throw new Error("no succeeded payment on order");

  const amount = order.totalCents - order.refundedCents;
  const provider = paymentProvider();
  const { providerRefundId } = await provider.refund({
    providerOrderId: payment.providerOrderId,
    amountCents: amount,
    currency: order.currency,
    reason: args.reason,
  });

  await d.transaction(async (tx) => {
    await tx.insert(s.refunds).values({
      orderId: order.id,
      paymentId: payment.id,
      providerRefundId,
      amountCents: amount,
      reason: args.reason,
      status: "succeeded",
      initiatedBy: args.initiatedByUserId,
    });
    await tx
      .update(s.orders)
      .set({
        status: "refunded",
        refundedCents: order.totalCents,
        updatedAt: new Date(),
      })
      .where(eq(s.orders.id, order.id));

    // Revoke every live ticket on the order (T5): qrVersion++ kills rendered QRs
    const lines = await tx.select().from(s.orderLines).where(eq(s.orderLines.orderId, order.id));
    for (const line of lines) {
      const lineTickets = await tx
        .select()
        .from(s.tickets)
        .where(eq(s.tickets.orderLineId, line.id));
      for (const t of lineTickets) {
        if (t.status === "active" || t.status === "issued") {
          await tx
            .update(s.tickets)
            .set({
              status: "revoked",
              revokedAt: new Date(),
              qrVersion: sql`${s.tickets.qrVersion} + 1`,
            })
            .where(eq(s.tickets.id, t.id));
          await tx.insert(s.ticketEvents).values({
            ticketId: t.id,
            type: "revoked",
            actorUserId: args.initiatedByUserId,
            data: { reason: `refund: ${args.reason}` },
          });
        }
      }
      // Return refunded admissions to inventory (tier + event pools)
      const pools = await tx
        .select()
        .from(s.inventoryPools)
        .where(eq(s.inventoryPools.eventId, order.eventId))
        .orderBy(s.inventoryPools.id)
        .for("update");
      for (const pool of pools) {
        if (pool.tierId === line.tierId || pool.tierId === null) {
          await tx
            .update(s.inventoryPools)
            .set({
              soldCount: sql`greatest(${s.inventoryPools.soldCount} - ${line.qty}, 0)`,
              updatedAt: new Date(),
            })
            .where(eq(s.inventoryPools.id, pool.id));
        }
      }
    }

    // Commission clawback (C4)
    const commission = await tx.query.commissions.findFirst({
      where: eq(s.commissions.orderId, order.id),
    });
    if (commission && commission.status !== "clawed_back") {
      await tx
        .update(s.commissions)
        .set({ status: "clawed_back", updatedAt: new Date() })
        .where(eq(s.commissions.id, commission.id));
    }
  });
}
