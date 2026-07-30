import "server-only";
import { and, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { assertTransition, type CommissionStatus } from "@wii/core";

/**
 * Admin payout operations. Every transition validates against the commission
 * state machine and writes audit_log (actor supplied by the caller). Bulk
 * operations are per-row transactional — one bad row fails alone.
 */

export interface CommissionFilter {
  statuses?: CommissionStatus[];
  ambassadorId?: string;
  eventId?: string;
  limit?: number;
}

export async function commissionsAdminList(filter: CommissionFilter = {}) {
  const d = db();
  const where = [
    filter.statuses?.length ? inArray(s.commissions.status, filter.statuses) : undefined,
    filter.ambassadorId ? eq(s.commissions.ambassadorId, filter.ambassadorId) : undefined,
    filter.eventId ? eq(s.orders.eventId, filter.eventId) : undefined,
  ].filter(Boolean);

  return d
    .select({
      id: s.commissions.id,
      status: s.commissions.status,
      amountCents: s.commissions.amountCents,
      rateBps: s.commissions.rateBps,
      payableAt: s.commissions.payableAt,
      createdAt: s.commissions.createdAt,
      payoutId: s.commissions.payoutId,
      ambassadorId: s.commissions.ambassadorId,
      ambassadorName: sql<string>`coalesce(${s.users.displayName}, split_part(${s.users.email},'@',1))`,
      ambassadorEmail: s.users.email,
      eventId: s.orders.eventId,
      eventTitle: s.events.title,
      orderRef: sql<string>`upper(left(${s.commissions.orderId}::text, 8))`,
    })
    .from(s.commissions)
    .innerJoin(s.ambassadorProfiles, eq(s.commissions.ambassadorId, s.ambassadorProfiles.id))
    .innerJoin(s.users, eq(s.ambassadorProfiles.userId, s.users.id))
    .innerJoin(s.orders, eq(s.commissions.orderId, s.orders.id))
    .innerJoin(s.events, eq(s.orders.eventId, s.events.id))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(s.commissions.createdAt))
    .limit(filter.limit ?? 300);
}

interface Actor {
  userId: string;
}

async function auditRow(
  tx: { insert: typeof db extends () => infer D ? never : never } | any,
  actor: Actor,
  action: string,
  commissionId: string,
  before: unknown,
  after: unknown
) {
  await tx.insert(s.auditLog).values({
    actorUserId: actor.userId,
    action,
    entityType: "commission",
    entityId: commissionId,
    before: before ?? null,
    after: after ?? null,
  });
}

/** Guarded single transition with audit. Returns new status or error string. */
export async function transitionCommission(
  commissionId: string,
  to: CommissionStatus,
  actor: Actor,
  extra?: { reason?: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const d = db();
  try {
    await d.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(s.commissions)
        .where(eq(s.commissions.id, commissionId))
        .for("update");
      if (!row) throw new Error("commission not found");
      assertTransition("commission", row.status, to);
      await tx
        .update(s.commissions)
        .set({ status: to, updatedAt: new Date() })
        .where(eq(s.commissions.id, commissionId));
      await auditRow(tx, actor, `commission.${to}`, commissionId, { status: row.status }, {
        status: to,
        ...extra,
      });
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function bulkTransition(
  ids: string[],
  to: CommissionStatus,
  actor: Actor
): Promise<{ done: number; failed: number }> {
  let done = 0,
    failed = 0;
  for (const id of ids.slice(0, 500)) {
    const r = await transitionCommission(id, to, actor);
    r.ok ? done++ : failed++;
  }
  return { done, failed };
}

/** C2 maturity: pending → payable(LOCKED) for commissions past payableAt. */
export async function runCommissionMaturity(actor: Actor): Promise<number> {
  const d = db();
  const due = await d
    .select({ id: s.commissions.id })
    .from(s.commissions)
    .where(and(eq(s.commissions.status, "pending"), lte(s.commissions.payableAt, new Date())))
    .limit(500);
  let n = 0;
  for (const row of due) {
    const r = await transitionCommission(row.id, "payable", actor);
    if (r.ok) n++;
  }
  return n;
}

/**
 * Mark a set of approved/processing commissions PAID: groups by ambassador,
 * creates one payout row per ambassador with the operator's payment
 * reference, stamps payoutId on each commission. Audited per commission +
 * per payout.
 */
export async function settleCommissions(
  ids: string[],
  actor: Actor,
  args: { reference: string; method?: string }
): Promise<{ payouts: number; commissions: number; skipped: number }> {
  const d = db();
  const rows = await d
    .select()
    .from(s.commissions)
    .where(inArray(s.commissions.id, ids.slice(0, 500)));
  const eligible = rows.filter((r) => r.status === "approved" || r.status === "processing");
  const skipped = rows.length - eligible.length;
  const byAmbassador = new Map<string, typeof eligible>();
  for (const row of eligible) {
    (byAmbassador.get(row.ambassadorId) ?? byAmbassador.set(row.ambassadorId, []).get(row.ambassadorId)!).push(row);
  }

  let payoutsCreated = 0,
    commissionsPaid = 0;
  for (const [ambassadorId, group] of byAmbassador) {
    await d.transaction(async (tx) => {
      const total = group.reduce((n, c) => n + c.amountCents, 0);
      const dates = group.map((c) => c.createdAt.getTime());
      const [payout] = await tx
        .insert(s.payouts)
        .values({
          ambassadorId,
          organizerId: group[0].organizerId,
          periodStart: new Date(Math.min(...dates)),
          periodEnd: new Date(),
          totalCents: total,
          currency: "EUR",
          method: args.method ?? "manual",
          reference: args.reference,
          status: "paid",
          createdBy: actor.userId,
          paidAt: new Date(),
        })
        .returning();
      for (const c of group) {
        assertTransition("commission", c.status, "paid");
        await tx
          .update(s.commissions)
          .set({ status: "paid", payoutId: payout.id, updatedAt: new Date() })
          .where(eq(s.commissions.id, c.id));
        await auditRow(tx, actor, "commission.paid", c.id, { status: c.status }, {
          status: "paid",
          payoutId: payout.id,
          reference: args.reference,
        });
        commissionsPaid++;
      }
      await tx.insert(s.auditLog).values({
        actorUserId: actor.userId,
        action: "payout.settle",
        entityType: "payout",
        entityId: payout.id,
        before: null,
        after: { ambassadorId, totalCents: total, reference: args.reference, commissions: group.length },
      });
      payoutsCreated++;
    });
  }
  return { payouts: payoutsCreated, commissions: commissionsPaid, skipped };
}

/* ---------------- Reports ---------------- */

/** Monthly payout report: per month × ambassador, live + paid totals. */
export async function monthlyPayoutReport(months = 6) {
  const d = db();
  return d
    .select({
      month: sql<string>`to_char(date_trunc('month', ${s.commissions.createdAt} at time zone 'Europe/Malta'), 'YYYY-MM')`,
      ambassadorName: sql<string>`coalesce(${s.users.displayName}, split_part(${s.users.email},'@',1))`,
      accruedCents: sql<number>`coalesce(sum(${s.commissions.amountCents}) filter (where ${s.commissions.status} in ('pending','payable','approved','processing','paid')),0)::int`,
      paidCents: sql<number>`coalesce(sum(${s.commissions.amountCents}) filter (where ${s.commissions.status} = 'paid'),0)::int`,
      unpaidCents: sql<number>`coalesce(sum(${s.commissions.amountCents}) filter (where ${s.commissions.status} in ('payable','approved','processing')),0)::int`,
    })
    .from(s.commissions)
    .innerJoin(s.ambassadorProfiles, eq(s.commissions.ambassadorId, s.ambassadorProfiles.id))
    .innerJoin(s.users, eq(s.ambassadorProfiles.userId, s.users.id))
    .where(gteMonths(months))
    .groupBy(sql`1, 2`)
    .orderBy(sql`1 desc, 3 desc`);
}

function gteMonths(months: number) {
  return sql`${s.commissions.createdAt} >= now() - make_interval(months => ${months})`;
}

/** Top ambassadors + unpaid balances + conversion + ROI in one report. */
export async function ambassadorReport() {
  const d = db();
  const rows = await d
    .select({
      ambassadorId: s.ambassadorProfiles.id,
      name: sql<string>`coalesce(${s.users.displayName}, split_part(${s.users.email},'@',1))`,
      email: s.users.email,
      status: s.ambassadorProfiles.status,
      visits: sql<number>`(select count(*) from referral_visits v where v.ambassador_id = ${s.ambassadorProfiles.id})::int`,
      orders: sql<number>`(select count(*) from referral_attributions a join orders o on o.id=a.order_id where a.ambassador_id = ${s.ambassadorProfiles.id} and o.status in ('paid','partially_refunded','refunded'))::int`,
      revenueNet: sql<number>`coalesce((select sum(o.total_cents - o.refunded_cents) from referral_attributions a join orders o on o.id=a.order_id where a.ambassador_id = ${s.ambassadorProfiles.id} and o.status in ('paid','partially_refunded','refunded')),0)::int`,
      commissionLive: sql<number>`coalesce((select sum(c.amount_cents) from commissions c where c.ambassador_id = ${s.ambassadorProfiles.id} and c.status in ('pending','payable','approved','processing','paid')),0)::int`,
      unpaid: sql<number>`coalesce((select sum(c.amount_cents) from commissions c where c.ambassador_id = ${s.ambassadorProfiles.id} and c.status in ('payable','approved','processing')),0)::int`,
      paid: sql<number>`coalesce((select sum(c.amount_cents) from commissions c where c.ambassador_id = ${s.ambassadorProfiles.id} and c.status = 'paid'),0)::int`,
    })
    .from(s.ambassadorProfiles)
    .innerJoin(s.users, eq(s.ambassadorProfiles.userId, s.users.id))
    .orderBy(sql`8 desc`);

  return rows.map((r) => ({
    ...r,
    conversionPct: r.visits > 0 ? Math.round((r.orders / r.visits) * 100) : 0,
    /** ROI: attributed net revenue per € of live commission. */
    roi: r.commissionLive > 0 ? Math.round((r.revenueNet / r.commissionLive) * 10) / 10 : null,
  }));
}

/** Event referral report: attributed share per event. */
export async function eventReferralReport() {
  const d = db();
  return d
    .select({
      eventTitle: s.events.title,
      attributedOrders: sql<number>`count(*)::int`,
      attributedNet: sql<number>`coalesce(sum(${s.orders.totalCents} - ${s.orders.refundedCents}),0)::int`,
      commission: sql<number>`coalesce((
        select sum(c.amount_cents) from commissions c
        where c.order_id = any(array_agg(${s.orders.id}))
          and c.status in ('pending','payable','approved','processing','paid')
      ),0)::int`,
    })
    .from(s.referralAttributions)
    .innerJoin(s.orders, eq(s.referralAttributions.orderId, s.orders.id))
    .innerJoin(s.events, eq(s.orders.eventId, s.events.id))
    .where(inArray(s.orders.status, ["paid", "partially_refunded", "refunded"]))
    .groupBy(s.events.title)
    .orderBy(sql`3 desc`);
}
