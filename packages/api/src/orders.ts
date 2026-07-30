import "server-only";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { HOLD_TTL_MS, PAYMENT_TTL_MS, assertTransition } from "@wii/core";
import { paymentProvider } from "./provider";

/**
 * Order engine — implements transitions O1/O2/O5/O6 + hold machine H1–H4 from
 * docs/architecture/state-machines.md. Every inventory movement happens inside
 * a transaction that row-locks the pools in id order (deadlock-free); the DB
 * check constraint (sold+held ≤ capacity) is the final backstop.
 */

export class OrderError extends Error {
  constructor(
    public code:
      | "event_not_found"
      | "tier_unavailable"
      | "insufficient_stock"
      | "qty_limit"
      | "order_not_found"
      | "order_not_open"
      | "holds_lapsed",
    message: string,
    public detail?: unknown
  ) {
    super(message);
  }
}

export interface DraftLineInput {
  tierId: string;
  qty: number;
}

/* ---------------- O1: create draft + acquire holds ---------------- */

export async function createDraftOrder(args: {
  slug: string;
  lines: DraftLineInput[];
  idempotencyKey: string;
  email?: string;
  candidateReferralCodeId?: string | null;
}) {
  const d = db();

  // Idempotent replay
  const existing = await d.query.orders.findFirst({
    where: eq(s.orders.idempotencyKey, args.idempotencyKey),
  });
  if (existing) return existing;

  const event = await d.query.events.findFirst({
    where: and(eq(s.events.slug, args.slug), eq(s.events.status, "published")),
  });
  if (!event) throw new OrderError("event_not_found", "event not found or not on sale");

  const lines = args.lines.filter((l) => Number.isInteger(l.qty) && l.qty > 0);
  if (lines.length === 0) throw new OrderError("tier_unavailable", "no tickets selected");

  const tiers = await d
    .select()
    .from(s.ticketTiers)
    .where(
      and(
        eq(s.ticketTiers.eventId, event.id),
        inArray(
          s.ticketTiers.id,
          lines.map((l) => l.tierId)
        )
      )
    );
  const tierById = new Map(tiers.map((t) => [t.id, t]));
  for (const l of lines) {
    const tier = tierById.get(l.tierId);
    if (!tier || tier.status !== "on_sale") {
      throw new OrderError("tier_unavailable", `tier not on sale`, { tierId: l.tierId });
    }
    if (l.qty > tier.maxPerOrder) {
      throw new OrderError("qty_limit", `max ${tier.maxPerOrder} per order`, { tierId: l.tierId });
    }
  }

  // Resolve current price phase per tier (sort order; time window + allocation)
  const phases = await d
    .select()
    .from(s.pricePhases)
    .where(
      inArray(
        s.pricePhases.tierId,
        lines.map((l) => l.tierId)
      )
    );
  const now = new Date();
  const phaseForTier = (tierId: string) => {
    const candidates = phases
      .filter((p) => p.tierId === tierId)
      .sort((a, b) => a.sort - b.sort)
      .filter(
        (p) =>
          (!p.startsAt || p.startsAt <= now) &&
          (!p.endsAt || p.endsAt > now) &&
          (p.allocation == null || p.soldCount < p.allocation)
      );
    return candidates[0];
  };

  const expiresAt = new Date(Date.now() + HOLD_TTL_MS);

  return await d.transaction(async (tx) => {
    // Lock pools (tier pools + event-wide) in id order — H1
    const pools = await tx
      .select()
      .from(s.inventoryPools)
      .where(eq(s.inventoryPools.eventId, event.id))
      .orderBy(s.inventoryPools.id)
      .for("update");

    const byTier = new Map(pools.filter((p) => p.tierId).map((p) => [p.tierId!, p]));
    const eventPool = pools.find((p) => !p.tierId);
    const totalQty = lines.reduce((n, l) => n + l.qty, 0);

    const shortages: { tierId: string; remaining: number }[] = [];
    for (const l of lines) {
      const pool = byTier.get(l.tierId);
      const remaining = pool ? pool.capacity - pool.soldCount - pool.heldCount : 0;
      if (remaining < l.qty) shortages.push({ tierId: l.tierId, remaining: Math.max(0, remaining) });
    }
    if (eventPool) {
      const remaining = eventPool.capacity - eventPool.soldCount - eventPool.heldCount;
      if (remaining < totalQty) shortages.push({ tierId: "event", remaining: Math.max(0, remaining) });
    }
    if (shortages.length) {
      throw new OrderError("insufficient_stock", "not enough tickets left", shortages);
    }

    // Price lock + totals (integer cents, no fees in v1)
    let subtotal = 0;
    const lineRows = lines.map((l) => {
      const phase = phaseForTier(l.tierId);
      if (!phase) throw new OrderError("tier_unavailable", "no active price phase", { tierId: l.tierId });
      subtotal += phase.priceCents * l.qty;
      return { l, phase };
    });

    const [order] = await tx
      .insert(s.orders)
      .values({
        organizerId: event.organizerId,
        eventId: event.id,
        email: args.email?.toLowerCase() ?? "pending@checkout",
        status: "draft",
        currency: event.currency,
        subtotalCents: subtotal,
        feesCents: 0,
        totalCents: subtotal,
        idempotencyKey: args.idempotencyKey,
        candidateReferralCodeId: args.candidateReferralCodeId ?? null,
        expiresAt,
      })
      .returning();

    for (const { l, phase } of lineRows) {
      await tx.insert(s.orderLines).values({
        orderId: order.id,
        tierId: l.tierId,
        pricePhaseId: phase.id,
        qty: l.qty,
        unitPriceCents: phase.priceCents,
        unitFeeCents: 0,
        lineTotalCents: phase.priceCents * l.qty,
      });
      const pool = byTier.get(l.tierId)!;
      await tx
        .update(s.inventoryPools)
        .set({ heldCount: sql`${s.inventoryPools.heldCount} + ${l.qty}`, updatedAt: new Date() })
        .where(eq(s.inventoryPools.id, pool.id));
      await tx.insert(s.holds).values({
        poolId: pool.id,
        orderId: order.id,
        tierId: l.tierId,
        qty: l.qty,
        expiresAt,
      });
    }
    if (eventPool) {
      await tx
        .update(s.inventoryPools)
        .set({ heldCount: sql`${s.inventoryPools.heldCount} + ${totalQty}`, updatedAt: new Date() })
        .where(eq(s.inventoryPools.id, eventPool.id));
      await tx.insert(s.holds).values({
        poolId: eventPool.id,
        orderId: order.id,
        tierId: lines[0].tierId, // event-wide hold rows keep a representative tier
        qty: totalQty,
        expiresAt,
      });
    }

    return order;
  });
}

/* ---------------- O2: begin payment ---------------- */

export async function beginPayment(orderId: string, email: string) {
  const d = db();
  const order = await d.query.orders.findFirst({ where: eq(s.orders.id, orderId) });
  if (!order) throw new OrderError("order_not_found", "order not found");
  if (order.status !== "draft" && order.status !== "pending_payment") {
    throw new OrderError("order_not_open", `order is ${order.status}`);
  }
  if (order.expiresAt && order.expiresAt < new Date()) {
    await expireOrder(orderId);
    throw new OrderError("holds_lapsed", "reservation lapsed — start again");
  }

  const event = (await d.query.events.findFirst({ where: eq(s.events.id, order.eventId) }))!;

  // Reuse an existing created payment if the buyer retries
  const provider = paymentProvider();
  let payment = await d.query.payments.findFirst({
    where: and(eq(s.payments.orderId, orderId), eq(s.payments.status, "created")),
  });

  if (!payment) {
    const pOrder = await provider.createOrder({
      amountCents: order.totalCents,
      currency: order.currency,
      description: `${event.title} — Wii Event Malta tickets`,
      orderId: order.id,
      email,
    });
    [payment] = await d
      .insert(s.payments)
      .values({
        orderId: order.id,
        provider: provider.name,
        providerOrderId: pOrder.providerOrderId,
        status: "created",
        amountCents: order.totalCents,
      })
      .returning();
    // Stash the client token on the payment row via providerPaymentId? No —
    // token is derivable for mock; for Revolut we return it directly.
    (payment as { clientToken?: string }).clientToken = pOrder.clientToken;
  }

  const newExpiry = new Date(Date.now() + PAYMENT_TTL_MS);
  await d.transaction(async (tx) => {
    assertTransition("order", order.status, "pending_payment");
    await tx
      .update(s.orders)
      .set({
        status: "pending_payment",
        email: email.toLowerCase(),
        placedAt: order.placedAt ?? new Date(),
        expiresAt: newExpiry,
        updatedAt: new Date(),
      })
      .where(eq(s.orders.id, orderId));
    await tx
      .update(s.holds)
      .set({ expiresAt: newExpiry })
      .where(and(eq(s.holds.orderId, orderId), eq(s.holds.status, "active")));
  });

  return {
    provider: provider.name,
    providerOrderId: payment.providerOrderId,
    clientToken:
      (payment as { clientToken?: string }).clientToken ??
      (provider.name === "mock" ? `mocktok_${orderId}` : ""),
    expiresAt: newExpiry,
  };
}

/* ---------------- O5/O6: expiry & cancel ---------------- */

async function releaseHolds(
  tx: Parameters<Parameters<ReturnType<typeof db>["transaction"]>[0]>[0],
  orderId: string,
  to: "expired" | "released"
) {
  const holdRows = await tx
    .select()
    .from(s.holds)
    .where(and(eq(s.holds.orderId, orderId), eq(s.holds.status, "active")))
    .for("update");
  for (const h of holdRows) {
    await tx
      .update(s.inventoryPools)
      .set({ heldCount: sql`greatest(${s.inventoryPools.heldCount} - ${h.qty}, 0)`, updatedAt: new Date() })
      .where(eq(s.inventoryPools.id, h.poolId));
    await tx.update(s.holds).set({ status: to }).where(eq(s.holds.id, h.id));
  }
}

export async function expireOrder(orderId: string) {
  const d = db();
  await d.transaction(async (tx) => {
    const [order] = await tx.select().from(s.orders).where(eq(s.orders.id, orderId)).for("update");
    if (!order || (order.status !== "draft" && order.status !== "pending_payment")) return;
    // O3/O5 race guard: a succeeded payment wins — finalize handles it.
    const paid = await tx
      .select({ id: s.payments.id })
      .from(s.payments)
      .where(and(eq(s.payments.orderId, orderId), eq(s.payments.status, "succeeded")))
      .limit(1);
    if (paid.length) return;
    await releaseHolds(tx, orderId, "expired");
    await tx
      .update(s.orders)
      .set({ status: "expired", expiresAt: null, updatedAt: new Date() })
      .where(eq(s.orders.id, orderId));
  });
}

export async function cancelOrder(orderId: string) {
  const d = db();
  await d.transaction(async (tx) => {
    const [order] = await tx.select().from(s.orders).where(eq(s.orders.id, orderId)).for("update");
    if (!order || order.status !== "draft") return;
    await releaseHolds(tx, orderId, "released");
    await tx
      .update(s.orders)
      .set({ status: "cancelled", expiresAt: null, updatedAt: new Date() })
      .where(eq(s.orders.id, orderId));
  });
}

/** Sweep: expire every overdue open order (called lazily + from admin). */
export async function sweepExpiredOrders(): Promise<number> {
  const d = db();
  const due = await d
    .select({ id: s.orders.id })
    .from(s.orders)
    .where(
      and(
        inArray(s.orders.status, ["draft", "pending_payment"]),
        lt(s.orders.expiresAt, new Date())
      )
    )
    .limit(200);
  for (const o of due) await expireOrder(o.id);
  return due.length;
}
