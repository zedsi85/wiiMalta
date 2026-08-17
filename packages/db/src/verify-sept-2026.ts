/** Read-only verification of the September 2026 catalogue reset. */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as s from "./schema";

const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("no DB url");
const client = postgres(url, { max: 1, prepare: false });
const db = drizzle(client, { schema: s });

async function main() {
  const events = await db.select().from(s.events);
  const venues = await db.select().from(s.venues);
  const lineup = await db.select().from(s.eventLineup);
  const tiers = await db.select().from(s.ticketTiers);
  const phases = await db.select().from(s.pricePhases);
  const pools = await db.select().from(s.inventoryPools);
  const counts: Record<string, number> = {};
  for (const [name, t] of Object.entries({
    orders: s.orders, tickets: s.tickets, holds: s.holds, payments: s.payments,
    redemptions: s.redemptions, scan_attempts: s.scanAttempts, commissions: s.commissions,
    referral_codes: s.referralCodes, ambassador_profiles: s.ambassadorProfiles, users: s.users,
  })) counts[name] = await db.$count(t as never);

  console.log(`EVENTS (${events.length}):`);
  for (const e of events.sort((a, b) => +a.startAt - +b.startAt)) {
    const v = venues.find((x) => x.id === e.venueId);
    const l = lineup.filter((x) => x.eventId === e.id).map((x) => x.name);
    const t = tiers.filter((x) => x.eventId === e.id);
    const p = pools.filter((x) => x.eventId === e.id);
    console.log(
      ` ${e.slug} | "${e.title}" | ${e.status} | start=${e.startAt.toISOString()} | venue=${v?.name} (${v?.city}) | lineup=[${l.join(", ")}] | tiers=${t.map((x) => `${x.name}:${x.status}`).join(",")} | phases=${phases.filter((ph) => t.some((x) => x.id === ph.tierId)).map((ph) => `${ph.name}=€${ph.priceCents / 100}`).join(",")} | pools=${p.map((x) => `${x.tierId ? "tier" : "event"}:${x.soldCount}+${x.heldCount}/${x.capacity}`).join(" ")}`
    );
  }
  console.log(`VENUES (${venues.length}): ${venues.map((v) => `${v.name}@${v.city}`).join(" | ")}`);
  console.log("TABLE COUNTS:", JSON.stringify(counts));
  await client.end();
}
main().catch(async (e) => { console.error(e); await client.end(); process.exit(1); });
