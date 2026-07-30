import "server-only";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";

/**
 * Guard-portal services: event scoping, door statistics, scan telemetry.
 * "Security guard" is the existing `scanner` org-member role, scoped per
 * event through `scanner_assignments` (schema migration 0000 — reused, not
 * duplicated).
 */

export interface GuardEvent {
  eventId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  venue: string;
  gate: string | null;
  admitted: number;
  capacity: number;
}

/** Start of "today" in the venue timezone (Europe/Malta). */
export function maltaDayStart(now = new Date()): Date {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Malta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA gives YYYY-MM-DD; Malta is UTC+1/+2 — resolve the local midnight instant
  const day = fmt.format(now);
  for (const offset of ["+02:00", "+01:00"]) {
    const candidate = new Date(`${day}T00:00:00${offset}`);
    if (fmt.format(candidate) === day) return candidate;
  }
  return new Date(`${day}T00:00:00Z`);
}

/** Events this guard may scan (assignments; staff/admin passes see all live events). */
export async function guardAssignedEvents(
  userId: string,
  opts: { seesAll: boolean }
): Promise<GuardEvent[]> {
  const d = db();

  let rows: { eventId: string; gate: string | null }[];
  if (opts.seesAll) {
    const events = await d
      .select({ id: s.events.id })
      .from(s.events)
      .where(eq(s.events.status, "published"));
    rows = events.map((e) => ({ eventId: e.id, gate: null }));
  } else {
    rows = await d
      .select({ eventId: s.scannerAssignments.eventId, gate: s.scannerAssignments.gate })
      .from(s.scannerAssignments)
      .where(eq(s.scannerAssignments.userId, userId));
  }
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.eventId);
  const gateByEvent = new Map(rows.map((r) => [r.eventId, r.gate]));

  const [events, venues, pools] = await Promise.all([
    d.select().from(s.events).where(inArray(s.events.id, ids)),
    d.select().from(s.venues),
    d
      .select({
        eventId: s.inventoryPools.eventId,
        sold: sql<number>`coalesce(sum(${s.inventoryPools.soldCount}),0)::int`,
        capacity: sql<number>`coalesce(sum(${s.inventoryPools.capacity}),0)::int`,
      })
      .from(s.inventoryPools)
      .where(and(inArray(s.inventoryPools.eventId, ids), sql`${s.inventoryPools.tierId} is not null`))
      .groupBy(s.inventoryPools.eventId),
  ]);
  const venueById = new Map(venues.map((v) => [v.id, v]));
  const poolByEvent = new Map(pools.map((p) => [p.eventId, p]));

  const admittedRows = await d
    .select({ eventId: s.redemptions.eventId, n: sql<number>`count(*)::int` })
    .from(s.redemptions)
    .where(inArray(s.redemptions.eventId, ids))
    .groupBy(s.redemptions.eventId);
  const admittedByEvent = new Map(admittedRows.map((r) => [r.eventId, r.n]));

  return events
    .filter((e) => e.status === "published")
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
    .map((e) => {
      const venue = e.venueId ? venueById.get(e.venueId) : undefined;
      return {
        eventId: e.id,
        title: e.title,
        startAt: e.startAt,
        endAt: e.endAt,
        venue: venue ? `${venue.name} — ${venue.city}` : "TBA",
        gate: gateByEvent.get(e.id) ?? null,
        admitted: admittedByEvent.get(e.id) ?? 0,
        capacity: poolByEvent.get(e.id)?.capacity ?? 0,
      };
    });
}

export interface GuardDayStats {
  scansToday: number;
  admitted: number;
  invalid: number;
  duplicates: number;
}

export async function guardDayStats(userId: string): Promise<GuardDayStats> {
  const d = db();
  const since = maltaDayStart();
  const rows = await d
    .select({ result: s.scanAttempts.result, n: sql<number>`count(*)::int` })
    .from(s.scanAttempts)
    .where(and(eq(s.scanAttempts.guardUserId, userId), gte(s.scanAttempts.createdAt, since)))
    .groupBy(s.scanAttempts.result);
  const byResult = new Map(rows.map((r) => [r.result, r.n]));
  const admitted = byResult.get("admitted") ?? 0;
  const duplicates = byResult.get("duplicate") ?? 0;
  const invalid = [...byResult.entries()]
    .filter(([k]) => k !== "admitted" && k !== "duplicate")
    .reduce((n, [, v]) => n + v, 0);
  return { scansToday: admitted + duplicates + invalid, admitted, invalid, duplicates };
}

/** Telemetry write — every scan outcome, success or reject. */
export async function logScanAttempt(args: {
  guardUserId: string;
  eventId?: string | null;
  ticketId?: string | null;
  result: string;
  device?: string | null;
  clientScanId?: string | null;
}) {
  await db().insert(s.scanAttempts).values({
    guardUserId: args.guardUserId,
    eventId: args.eventId ?? null,
    ticketId: args.ticketId ?? null,
    result: args.result,
    device: args.device?.slice(0, 120) ?? null,
    clientScanId: args.clientScanId ?? null,
  });
}
