import "server-only";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import {
  encryptJson,
  decryptJson,
  isValidIban,
  isValidEmail,
  isValidRevolutTag,
  maskIban,
  maskEmail,
} from "@wii/core";

/**
 * Ambassador platform services. All money figures follow the analytics-layer
 * conventions: revenue is NET of refunds; commission buckets use the
 * lifecycle superset (pending/locked/approved+processing/paid/cancelled).
 * Ambassadors can only ever be handed data scoped to their own profile —
 * enforced here by profileId, resolved by the auth gate.
 */

const LIVE = ["pending", "payable", "approved", "processing", "paid"] as const;
const PAIDISH = ["paid", "partially_refunded", "refunded"] as const;

export interface AmbassadorDashboard {
  profile: {
    id: string;
    status: string;
    code: string | null;
    commissionBps: number;
    fixedBonusCents: number;
  };
  ticketsSold: number;
  revenueNetCents: number;
  commission: {
    earnedCents: number; // all live statuses
    pendingCents: number;
    lockedCents: number; // payable
    approvedCents: number; // approved + processing
    paidCents: number;
    cancelledCents: number; // rejected + void + clawed_back
  };
  visitors: number;
  attributedOrders: number;
  conversionRatePct: number;
  topEvent: { title: string; revenueNetCents: number; orders: number } | null;
  monthlyEarnings: { label: string; value: number }[]; // live commission cents by month
  leaderboard: { position: number; of: number };
}

export async function ambassadorProfileForUser(userId: string) {
  const d = db();
  return d.query.ambassadorProfiles.findFirst({
    where: eq(s.ambassadorProfiles.userId, userId),
  });
}

export async function ambassadorDashboard(profileId: string): Promise<AmbassadorDashboard | null> {
  const d = db();
  const profile = await d.query.ambassadorProfiles.findFirst({
    where: eq(s.ambassadorProfiles.id, profileId),
  });
  if (!profile) return null;
  const org = (await d.select().from(s.organizers).where(eq(s.organizers.id, profile.organizerId)))[0];

  const [codes, sales, commissionRows, visits, topEvent, monthly, board] = await Promise.all([
    d.select().from(s.referralCodes).where(eq(s.referralCodes.ambassadorId, profileId)),
    d
      .select({
        orders: sql<number>`count(*)::int`,
        net: sql<number>`coalesce(sum(${s.orders.totalCents} - ${s.orders.refundedCents}),0)::int`,
        tickets: sql<number>`coalesce((select sum(l.qty) from order_lines l join orders o2 on o2.id = l.order_id where l.order_id = any(array_agg(${s.orders.id})) and o2.status in ('paid','partially_refunded')),0)::int`,
      })
      .from(s.referralAttributions)
      .innerJoin(s.orders, eq(s.referralAttributions.orderId, s.orders.id))
      .where(
        and(eq(s.referralAttributions.ambassadorId, profileId), inArray(s.orders.status, PAIDISH))
      ),
    d
      .select({ status: s.commissions.status, cents: sql<number>`coalesce(sum(${s.commissions.amountCents}),0)::int` })
      .from(s.commissions)
      .where(eq(s.commissions.ambassadorId, profileId))
      .groupBy(s.commissions.status),
    d
      .select({ n: sql<number>`count(*)::int` })
      .from(s.referralVisits)
      .where(eq(s.referralVisits.ambassadorId, profileId)),
    d
      .select({
        title: s.events.title,
        net: sql<number>`coalesce(sum(${s.orders.totalCents} - ${s.orders.refundedCents}),0)::int`,
        orders: sql<number>`count(*)::int`,
      })
      .from(s.referralAttributions)
      .innerJoin(s.orders, eq(s.referralAttributions.orderId, s.orders.id))
      .innerJoin(s.events, eq(s.orders.eventId, s.events.id))
      .where(
        and(eq(s.referralAttributions.ambassadorId, profileId), inArray(s.orders.status, PAIDISH))
      )
      .groupBy(s.events.title)
      .orderBy(sql`2 desc`)
      .limit(1),
    d
      .select({
        label: sql<string>`to_char(${s.commissions.createdAt} at time zone 'Europe/Malta', 'Mon YY')`,
        month: sql<string>`date_trunc('month', ${s.commissions.createdAt} at time zone 'Europe/Malta')::text`,
        value: sql<number>`coalesce(sum(${s.commissions.amountCents}),0)::int`,
      })
      .from(s.commissions)
      .where(
        and(
          eq(s.commissions.ambassadorId, profileId),
          inArray(s.commissions.status, [...LIVE]),
          gte(s.commissions.createdAt, sql`now() - interval '12 months'`)
        )
      )
      .groupBy(sql`2, 1`)
      .orderBy(sql`2`),
    // leaderboard: live commission cents per ambassador in the org
    d
      .select({
        ambassadorId: s.commissions.ambassadorId,
        cents: sql<number>`coalesce(sum(${s.commissions.amountCents}),0)::int`,
      })
      .from(s.commissions)
      .where(
        and(
          eq(s.commissions.organizerId, profile.organizerId),
          inArray(s.commissions.status, [...LIVE])
        )
      )
      .groupBy(s.commissions.ambassadorId)
      .orderBy(sql`2 desc`),
  ]);

  const bucket = (statuses: string[]) =>
    commissionRows.filter((r) => statuses.includes(r.status)).reduce((n, r) => n + r.cents, 0);

  const visitors = visits[0]?.n ?? 0;
  const attributedOrders = sales[0]?.orders ?? 0;
  const position = board.findIndex((b) => b.ambassadorId === profileId);

  return {
    profile: {
      id: profile.id,
      status: profile.status,
      code: codes.find((c) => c.status === "active")?.code ?? codes[0]?.code ?? null,
      commissionBps: profile.commissionBps ?? org.defaultCommissionBps,
      fixedBonusCents: profile.fixedBonusCents,
    },
    ticketsSold: sales[0]?.tickets ?? 0,
    revenueNetCents: sales[0]?.net ?? 0,
    commission: {
      earnedCents: bucket([...LIVE]),
      pendingCents: bucket(["pending"]),
      lockedCents: bucket(["payable"]),
      approvedCents: bucket(["approved", "processing"]),
      paidCents: bucket(["paid"]),
      cancelledCents: bucket(["rejected", "void", "clawed_back"]),
    },
    visitors,
    attributedOrders,
    conversionRatePct: visitors > 0 ? Math.round((attributedOrders / visitors) * 100) : 0,
    topEvent: topEvent[0]
      ? { title: topEvent[0].title, revenueNetCents: topEvent[0].net, orders: topEvent[0].orders }
      : null,
    monthlyEarnings: monthly.map((m) => ({ label: m.label, value: m.value })),
    leaderboard: { position: position === -1 ? board.length + 1 : position + 1, of: Math.max(board.length, 1) },
  };
}

/** Attributed sales list (My Sales) — buyer PII limited to masked email. */
export async function ambassadorSales(profileId: string, limit = 100) {
  const d = db();
  const rows = await d
    .select({
      orderId: s.orders.id,
      eventTitle: s.events.title,
      status: s.orders.status,
      totalCents: s.orders.totalCents,
      refundedCents: s.orders.refundedCents,
      paidAt: s.orders.paidAt,
      email: s.orders.email,
    })
    .from(s.referralAttributions)
    .innerJoin(s.orders, eq(s.referralAttributions.orderId, s.orders.id))
    .innerJoin(s.events, eq(s.orders.eventId, s.events.id))
    .where(eq(s.referralAttributions.ambassadorId, profileId))
    .orderBy(desc(s.orders.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    ...r,
    orderRef: r.orderId.slice(0, 8).toUpperCase(),
    email: maskEmail(r.email),
    netCents: r.totalCents - r.refundedCents,
  }));
}

/** Per-event performance (My Events). */
export async function ambassadorEvents(profileId: string) {
  const d = db();
  return d
    .select({
      eventId: s.events.id,
      title: s.events.title,
      startAt: s.events.startAt,
      status: s.events.status,
      orders: sql<number>`count(*)::int`,
      net: sql<number>`coalesce(sum(${s.orders.totalCents} - ${s.orders.refundedCents}),0)::int`,
      commission: sql<number>`coalesce((
        select sum(c.amount_cents) from commissions c
        where c.order_id = any(array_agg(${s.orders.id}))
          and c.status in ('pending','payable','approved','processing','paid')
      ),0)::int`,
    })
    .from(s.referralAttributions)
    .innerJoin(s.orders, eq(s.referralAttributions.orderId, s.orders.id))
    .innerJoin(s.events, eq(s.orders.eventId, s.events.id))
    .where(and(eq(s.referralAttributions.ambassadorId, profileId), inArray(s.orders.status, PAIDISH)))
    .groupBy(s.events.id, s.events.title, s.events.startAt, s.events.status)
    .orderBy(desc(s.events.startAt));
}

export async function ambassadorCommissions(profileId: string, limit = 200) {
  const d = db();
  return d
    .select({
      id: s.commissions.id,
      status: s.commissions.status,
      amountCents: s.commissions.amountCents,
      rateBps: s.commissions.rateBps,
      payableAt: s.commissions.payableAt,
      createdAt: s.commissions.createdAt,
      eventTitle: s.events.title,
      orderId: s.commissions.orderId,
    })
    .from(s.commissions)
    .leftJoin(s.orders, eq(s.commissions.orderId, s.orders.id))
    .leftJoin(s.events, eq(s.orders.eventId, s.events.id))
    .where(eq(s.commissions.ambassadorId, profileId))
    .orderBy(desc(s.commissions.createdAt))
    .limit(limit);
}

export async function ambassadorPayouts(profileId: string) {
  const d = db();
  return d
    .select()
    .from(s.payouts)
    .where(eq(s.payouts.ambassadorId, profileId))
    .orderBy(desc(s.payouts.createdAt));
}

/* ---------------- Payment methods (encrypted at rest) ---------------- */

export type PaymentDetailsInput =
  | { kind: "iban"; holder: string; iban: string }
  | { kind: "bank_transfer"; holder: string; bankName: string; accountNumber: string; swift?: string }
  | { kind: "revolut"; username: string }
  | { kind: "paypal"; email: string }
  | { kind: "wise"; email: string }
  | { kind: "crypto"; network: string; address: string };

export function validatePaymentDetails(input: PaymentDetailsInput): { hint: string } {
  switch (input.kind) {
    case "iban":
      if (!input.holder?.trim()) throw new Error("account holder required");
      if (!isValidIban(input.iban)) throw new Error("invalid IBAN (checksum failed)");
      return { hint: maskIban(input.iban) };
    case "bank_transfer":
      if (!input.holder?.trim() || !input.bankName?.trim() || !input.accountNumber?.trim())
        throw new Error("holder, bank and account number required");
      return { hint: `${input.bankName} ····${input.accountNumber.slice(-4)}` };
    case "revolut":
      if (!isValidRevolutTag(input.username)) throw new Error("invalid Revolut username");
      return { hint: `Revolut @${input.username.replace(/^@/, "")}` };
    case "paypal":
      if (!isValidEmail(input.email)) throw new Error("invalid PayPal email");
      return { hint: `PayPal ${maskEmail(input.email)}` };
    case "wise":
      if (!isValidEmail(input.email)) throw new Error("invalid Wise email");
      return { hint: `Wise ${maskEmail(input.email)}` };
    case "crypto":
      throw new Error("crypto payouts are not enabled yet");
  }
}

/** Replace the active payment method (single-active enforced by partial unique index). */
export async function setPaymentMethod(profileId: string, input: PaymentDetailsInput) {
  const key = process.env.PAYMENT_ENC_KEY;
  if (!key) throw new Error("PAYMENT_ENC_KEY not configured");
  const { hint } = validatePaymentDetails(input);
  const d = db();
  await d.transaction(async (tx) => {
    await tx
      .update(s.ambassadorPaymentMethods)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(s.ambassadorPaymentMethods.ambassadorId, profileId));
    await tx.insert(s.ambassadorPaymentMethods).values({
      ambassadorId: profileId,
      kind: input.kind,
      detailsEncrypted: encryptJson(input, key),
      displayHint: hint,
      isActive: true,
    });
  });
  return { hint };
}

/** Masked view for UIs — never returns decrypted content. */
export async function activePaymentMethod(profileId: string) {
  const d = db();
  const row = await d.query.ambassadorPaymentMethods.findFirst({
    where: and(
      eq(s.ambassadorPaymentMethods.ambassadorId, profileId),
      eq(s.ambassadorPaymentMethods.isActive, true)
    ),
  });
  return row ? { kind: row.kind, hint: row.displayHint, updatedAt: row.updatedAt } : null;
}

/** Decrypted details — ADMIN payout execution only. Callers must audit. */
export async function decryptedPaymentMethod(profileId: string) {
  const key = process.env.PAYMENT_ENC_KEY;
  if (!key) throw new Error("PAYMENT_ENC_KEY not configured");
  const d = db();
  const row = await d.query.ambassadorPaymentMethods.findFirst({
    where: and(
      eq(s.ambassadorPaymentMethods.ambassadorId, profileId),
      eq(s.ambassadorPaymentMethods.isActive, true)
    ),
  });
  return row ? decryptJson<PaymentDetailsInput>(row.detailsEncrypted, key) : null;
}

export async function logReferralVisit(codeId: string, ambassadorId: string) {
  await db().insert(s.referralVisits).values({ codeId, ambassadorId });
}
