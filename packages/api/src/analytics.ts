import "server-only";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { maltaDayStart } from "./guard";

/**
 * Event analytics — THE single home for operational metric math. Pages render
 * what this returns; nothing recomputes these numbers elsewhere.
 *
 * Definitions (documented so ops and engineering read the same dashboard):
 *  - sold/reserved come from inventory pools (already net of refunds — the
 *    refund path decrements sold_count)
 *  - revenue is NET: Σ(total − refunded) over orders that ever reached paid
 *  - conversion = paid / (paid + expired + cancelled) — decided checkouts only,
 *    in-flight drafts/pending are excluded
 *  - check-in = redeemed / (redeemed + still-active) tickets
 *  - "today" = Europe/Malta calendar day (maltaDayStart)
 */

const TZ = "Europe/Malta";

export interface SeriesPoint {
  label: string;
  value: number;
}

export interface EventAnalytics {
  eventId: string;
  title: string;
  status: string;
  startAt: Date;
  endAt: Date;
  currency: string;

  capacity: number;
  sold: number;
  reserved: number;
  remaining: number;

  ticketsActive: number;
  ticketsRedeemed: number;
  ticketsRefunded: number; // revoked tickets
  ordersCancelled: number; // cancelled + expired checkouts

  revenueNetCents: number;
  revenueGrossCents: number;
  avgTicketPriceCents: number;

  checkInRatePct: number;
  noShowRatePct: number;
  redeemedToday: number;
  currentAttendance: number;

  conversionRatePct: number;
  decidedOrders: { paid: number; expired: number; cancelled: number };

  revenueByTier: SeriesPoint[];
  revenueByDay: SeriesPoint[]; // cents
  hourlyEntries: SeriesPoint[];

  referral: {
    attributedRevenueCents: number;
    attributedOrders: number;
    commissionCents: number;
    topAmbassador: { name: string; revenueCents: number; orders: number } | null;
  };
}

export async function eventAnalytics(eventId: string): Promise<EventAnalytics | null> {
  const d = db();
  const event = await d.query.events.findFirst({ where: eq(s.events.id, eventId) });
  if (!event) return null;

  const [
    pools,
    ticketCounts,
    orderAgg,
    tierRevenue,
    dayRevenue,
    hourly,
    redeemedTodayRow,
    referralAgg,
    topAmb,
  ] = await Promise.all([
    // capacity / sold / held from tier pools
    d
      .select({
        capacity: sql<number>`coalesce(sum(${s.inventoryPools.capacity}),0)::int`,
        sold: sql<number>`coalesce(sum(${s.inventoryPools.soldCount}),0)::int`,
        held: sql<number>`coalesce(sum(${s.inventoryPools.heldCount}),0)::int`,
      })
      .from(s.inventoryPools)
      .where(and(eq(s.inventoryPools.eventId, eventId), sql`${s.inventoryPools.tierId} is not null`)),

    d
      .select({ status: s.tickets.status, n: sql<number>`count(*)::int` })
      .from(s.tickets)
      .where(eq(s.tickets.eventId, eventId))
      .groupBy(s.tickets.status),

    d
      .select({
        status: s.orders.status,
        n: sql<number>`count(*)::int`,
        net: sql<number>`coalesce(sum(${s.orders.totalCents} - ${s.orders.refundedCents}),0)::int`,
        gross: sql<number>`coalesce(sum(${s.orders.totalCents}),0)::int`,
      })
      .from(s.orders)
      .where(eq(s.orders.eventId, eventId))
      .groupBy(s.orders.status),

    d
      .select({
        label: s.ticketTiers.name,
        value: sql<number>`coalesce(sum(${s.orderLines.lineTotalCents}),0)::int`,
      })
      .from(s.orderLines)
      .innerJoin(s.orders, eq(s.orderLines.orderId, s.orders.id))
      .innerJoin(s.ticketTiers, eq(s.orderLines.tierId, s.ticketTiers.id))
      .where(
        and(
          eq(s.orders.eventId, eventId),
          inArray(s.orders.status, ["paid", "partially_refunded", "refunded"])
        )
      )
      .groupBy(s.ticketTiers.name)
      .orderBy(sql`2 desc`),

    d
      .select({
        label: sql<string>`to_char(${s.orders.paidAt} at time zone ${TZ}, 'DD Mon')`,
        day: sql<string>`(${s.orders.paidAt} at time zone ${TZ})::date::text`,
        value: sql<number>`coalesce(sum(${s.orders.totalCents} - ${s.orders.refundedCents}),0)::int`,
      })
      .from(s.orders)
      .where(
        and(
          eq(s.orders.eventId, eventId),
          inArray(s.orders.status, ["paid", "partially_refunded", "refunded"]),
          sql`${s.orders.paidAt} is not null`
        )
      )
      .groupBy(sql`2, 1`)
      .orderBy(sql`2`),

    d
      .select({
        label: sql<string>`to_char(${s.redemptions.scannedAt} at time zone ${TZ}, 'HH24:00')`,
        hour: sql<string>`date_trunc('hour', ${s.redemptions.scannedAt} at time zone ${TZ})::text`,
        value: sql<number>`count(*)::int`,
      })
      .from(s.redemptions)
      .where(eq(s.redemptions.eventId, eventId))
      .groupBy(sql`2, 1`)
      .orderBy(sql`2`),

    d
      .select({ n: sql<number>`count(*)::int` })
      .from(s.redemptions)
      .where(and(eq(s.redemptions.eventId, eventId), gte(s.redemptions.scannedAt, maltaDayStart()))),

    d
      .select({
        orders: sql<number>`count(*)::int`,
        net: sql<number>`coalesce(sum(${s.orders.totalCents} - ${s.orders.refundedCents}),0)::int`,
        commission: sql<number>`coalesce(sum(${s.commissions.amountCents}),0)::int`,
      })
      .from(s.referralAttributions)
      .innerJoin(s.orders, eq(s.referralAttributions.orderId, s.orders.id))
      .leftJoin(
        s.commissions,
        and(
          eq(s.commissions.attributionId, s.referralAttributions.id),
          // live commissions only — clawed-back/void money is not owed
          inArray(s.commissions.status, ["pending", "payable", "paid"])
        )
      )
      .where(
        and(
          eq(s.orders.eventId, eventId),
          inArray(s.orders.status, ["paid", "partially_refunded", "refunded"])
        )
      ),

    d
      .select({
        name: sql<string>`coalesce(${s.users.displayName}, split_part(${s.users.email}, '@', 1))`,
        net: sql<number>`coalesce(sum(${s.orders.totalCents} - ${s.orders.refundedCents}),0)::int`,
        orders: sql<number>`count(*)::int`,
      })
      .from(s.referralAttributions)
      .innerJoin(s.orders, eq(s.referralAttributions.orderId, s.orders.id))
      .innerJoin(s.ambassadorProfiles, eq(s.referralAttributions.ambassadorId, s.ambassadorProfiles.id))
      .innerJoin(s.users, eq(s.ambassadorProfiles.userId, s.users.id))
      .where(
        and(
          eq(s.orders.eventId, eventId),
          inArray(s.orders.status, ["paid", "partially_refunded", "refunded"])
        )
      )
      .groupBy(s.users.id, s.users.displayName, s.users.email)
      .orderBy(sql`2 desc`)
      .limit(1),
  ]);

  const pool = pools[0] ?? { capacity: 0, sold: 0, held: 0 };
  const tCount = (status: string) => ticketCounts.find((t) => t.status === status)?.n ?? 0;
  const oAgg = (status: string) => orderAgg.find((o) => o.status === status);

  const paidish = ["paid", "partially_refunded", "refunded"] as const;
  const revenueNetCents = paidish.reduce((n, st) => n + (oAgg(st)?.net ?? 0), 0);
  const revenueGrossCents = paidish.reduce((n, st) => n + (oAgg(st)?.gross ?? 0), 0);

  const paid = paidish.reduce((n, st) => n + (oAgg(st)?.n ?? 0), 0);
  const expired = oAgg("expired")?.n ?? 0;
  const cancelled = oAgg("cancelled")?.n ?? 0;
  const decided = paid + expired + cancelled;

  const redeemed = tCount("redeemed");
  const active = tCount("active") + tCount("issued");
  const validTickets = redeemed + active;

  return {
    eventId: event.id,
    title: event.title,
    status: event.status,
    startAt: event.startAt,
    endAt: event.endAt,
    currency: event.currency,

    capacity: pool.capacity,
    sold: pool.sold,
    reserved: pool.held,
    remaining: Math.max(0, pool.capacity - pool.sold - pool.held),

    ticketsActive: active,
    ticketsRedeemed: redeemed,
    ticketsRefunded: tCount("revoked"),
    ordersCancelled: expired + cancelled,

    revenueNetCents,
    revenueGrossCents,
    avgTicketPriceCents: pool.sold > 0 ? Math.round(revenueNetCents / pool.sold) : 0,

    checkInRatePct: validTickets > 0 ? Math.round((redeemed / validTickets) * 100) : 0,
    noShowRatePct: validTickets > 0 ? Math.round((active / validTickets) * 100) : 0,
    redeemedToday: redeemedTodayRow[0]?.n ?? 0,
    currentAttendance: redeemed,

    conversionRatePct: decided > 0 ? Math.round((paid / decided) * 100) : 0,
    decidedOrders: { paid, expired, cancelled },

    revenueByTier: tierRevenue.map((r) => ({ label: r.label, value: r.value })),
    revenueByDay: dayRevenue.map((r) => ({ label: r.label, value: r.value })),
    hourlyEntries: hourly.map((r) => ({ label: r.label, value: r.value })),

    referral: {
      attributedRevenueCents: referralAgg[0]?.net ?? 0,
      attributedOrders: referralAgg[0]?.orders ?? 0,
      commissionCents: referralAgg[0]?.commission ?? 0,
      topAmbassador: topAmb[0]
        ? { name: topAmb[0].name, revenueCents: topAmb[0].net, orders: topAmb[0].orders }
        : null,
    },
  };
}

/** List-page columns: net revenue + redeemed per event, one grouped query each. */
export async function eventsRevenueOverview(
  eventIds: string[]
): Promise<Map<string, { revenueNetCents: number; redeemed: number }>> {
  if (eventIds.length === 0) return new Map();
  const d = db();
  const [rev, red] = await Promise.all([
    d
      .select({
        eventId: s.orders.eventId,
        net: sql<number>`coalesce(sum(${s.orders.totalCents} - ${s.orders.refundedCents}),0)::int`,
      })
      .from(s.orders)
      .where(
        and(
          inArray(s.orders.eventId, eventIds),
          inArray(s.orders.status, ["paid", "partially_refunded", "refunded"])
        )
      )
      .groupBy(s.orders.eventId),
    d
      .select({ eventId: s.redemptions.eventId, n: sql<number>`count(*)::int` })
      .from(s.redemptions)
      .where(inArray(s.redemptions.eventId, eventIds))
      .groupBy(s.redemptions.eventId),
  ]);
  const out = new Map<string, { revenueNetCents: number; redeemed: number }>();
  for (const id of eventIds) {
    out.set(id, {
      revenueNetCents: rev.find((r) => r.eventId === id)?.net ?? 0,
      redeemed: red.find((r) => r.eventId === id)?.n ?? 0,
    });
  }
  return out;
}
