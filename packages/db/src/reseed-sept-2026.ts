/**
 * September 2026 catalogue reset — replaces the fictional launch seed with
 * the four real confirmed events. DML only: no schema, RLS, or policy
 * changes. Ticketing/referral engines untouched.
 *
 * Deletes (dev/staging data reset, explicitly authorized):
 *  - all seeded events + their catalogue rows (content, lineup, tiers,
 *    phases, pools — via FK cascade) and seed venues
 *  - all TEST transactional data attached to those events: orders, order
 *    lines, holds, payments, refunds, tickets, ticket events/transfers,
 *    redemptions, scan attempts, commissions, attributions, payouts,
 *    referral visits, saved events, waitlist entries
 * Preserves: users, organizer, members, ambassador profiles + referral
 * codes (event links nulled) + payment methods, devices, signing keys,
 * audit log, webhook log.
 *
 * Placeholders (fields the schema requires but the business hasn't decided —
 * flagged in the run report): event times 22:00–04:00 CEST, one hidden
 * "General Admission" tier at €0 phase "TBD", capacity 200, venue city
 * "Malta", lineup entry literally "TBD" for events 2–4.
 *
 * Run: npx tsx src/reseed-sept-2026.ts   (from packages/db, needs
 * DIRECT_DATABASE_URL or DATABASE_URL in env)
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, inArray, isNotNull } from "drizzle-orm";
import * as s from "./schema";

const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("DIRECT_DATABASE_URL / DATABASE_URL not set");
const client = postgres(url, { max: 1, prepare: false });
const db = drizzle(client, { schema: s });

/** Real September 2026 catalogue. Times are placeholders (22:00–04:00 CEST). */
const EVENTS = [
  {
    slug: "discoroom",
    title: "DiscoROOM",
    venue: "Nine Lives",
    startAt: "2026-09-05T22:00:00+02:00",
    endAt: "2026-09-06T04:00:00+02:00",
    lineup: ["DJ Montana"],
  },
  {
    slug: "white-sensation-room",
    title: "White Sensation Room",
    venue: "Hugo's Terrace",
    startAt: "2026-09-11T22:00:00+02:00",
    endAt: "2026-09-12T04:00:00+02:00",
    lineup: ["TBD"],
  },
  {
    slug: "redroom",
    title: "RedROOM",
    venue: "Hugo's Terrace",
    startAt: "2026-09-18T22:00:00+02:00",
    endAt: "2026-09-19T04:00:00+02:00",
    lineup: ["TBD"],
  },
  {
    slug: "jungleroom",
    title: "JungleROOM",
    venue: "Palm Beach",
    startAt: "2026-09-25T22:00:00+02:00",
    endAt: "2026-09-26T04:00:00+02:00",
    lineup: ["TBD"],
  },
] as const;

const PLACEHOLDER_CAPACITY = 200; // TBD — real venue capacity not yet provided

async function main() {
  const org = await db.query.organizers.findFirst({ where: eq(s.organizers.slug, "wii-malta") });
  if (!org) throw new Error("organizer 'wii-malta' not found — nothing to reset against");
  const owner = await db.query.users.findFirst({ where: eq(s.users.email, "zedsi85@gmail.com") });
  if (!owner) throw new Error("owner user not found");

  const oldEvents = await db.select({ id: s.events.id, slug: s.events.slug, title: s.events.title }).from(s.events);
  const oldVenues = await db.select({ id: s.venues.id, name: s.venues.name }).from(s.venues);
  console.log(`Deleting ${oldEvents.length} events: ${oldEvents.map((e) => e.slug).join(", ")}`);

  const deleted: Record<string, number> = {};
  const wipe = async (label: string, fn: () => Promise<unknown[]>) => {
    deleted[label] = (await fn()).length;
  };

  // Children-first wipe of test transactional data (every event in the DB is
  // part of the old fictional seed — verified in the printout above).
  await wipe("scan_attempts", () => db.delete(s.scanAttempts).returning());
  await wipe("redemptions", () => db.delete(s.redemptions).returning());
  await wipe("ticket_events", () => db.delete(s.ticketEvents).returning());
  await wipe("ticket_transfers", () => db.delete(s.ticketTransfers).returning());
  await wipe("commissions", () => db.delete(s.commissions).returning());
  await wipe("payouts", () => db.delete(s.payouts).returning());
  await wipe("referral_attributions", () => db.delete(s.referralAttributions).returning());
  await wipe("tickets", () => db.delete(s.tickets).returning());
  await wipe("refunds", () => db.delete(s.refunds).returning());
  await wipe("payments", () => db.delete(s.payments).returning());
  await wipe("orders", () => db.delete(s.orders).returning()); // holds + order_lines cascade
  // Referral CODES are ambassador property — keep them, just unlink dead events.
  const unlinked = await db
    .update(s.referralCodes)
    .set({ eventId: null })
    .where(isNotNull(s.referralCodes.eventId))
    .returning();
  deleted["referral_codes_unlinked (kept)"] = unlinked.length;
  // Catalogue: content/lineup/tiers/phases/pools/scanner assignments/saved/
  // waitlist/referral visits all cascade from events.
  await wipe("events", () => db.delete(s.events).where(inArray(s.events.id, oldEvents.map((e) => e.id))).returning());
  await wipe("venues", () => db.delete(s.venues).where(inArray(s.venues.id, oldVenues.map((v) => v.id))).returning());

  /* ---------------- Insert the real September catalogue ---------------- */

  const venueIds = new Map<string, string>();
  for (const name of new Set(EVENTS.map((e) => e.venue))) {
    const existing = await db.query.venues.findFirst({ where: eq(s.venues.name, name) });
    if (existing) {
      venueIds.set(name, existing.id);
      continue;
    }
    const [v] = await db
      .insert(s.venues)
      .values({ organizerId: org.id, name, city: "Malta" /* TBD — locality not provided */, country: "MT" })
      .returning();
    venueIds.set(name, v.id);
  }

  for (const ev of EVENTS) {
    const [event] = await db
      .insert(s.events)
      .values({
        organizerId: org.id,
        venueId: venueIds.get(ev.venue)!,
        slug: ev.slug,
        title: ev.title,
        status: "published",
        timezone: "Europe/Malta",
        startAt: new Date(ev.startAt),
        endAt: new Date(ev.endAt),
        currency: "EUR",
        publishedAt: new Date(),
        createdBy: owner.id,
      })
      .returning();

    // Minimal live content row (admin console expects one); no invented copy.
    await db.insert(s.eventContent).values({ eventId: event.id, version: 1, isLive: true });

    await db.insert(s.eventLineup).values(
      ev.lineup.map((name, i) => ({ eventId: event.id, name, sort: i }))
    );

    // One hidden GA tier so ticketing plumbing exists without publicly
    // advertising an invented price. Flip to on_sale once pricing lands.
    const [tier] = await db
      .insert(s.ticketTiers)
      .values({
        eventId: event.id,
        organizerId: org.id,
        name: "General Admission",
        note: "Pricing TBD",
        status: "hidden",
        sort: 0,
      })
      .returning();
    await db.insert(s.pricePhases).values({ tierId: tier.id, name: "TBD", priceCents: 0, sort: 0 });
    await db.insert(s.inventoryPools).values([
      { eventId: event.id, tierId: null, capacity: PLACEHOLDER_CAPACITY },
      { eventId: event.id, tierId: tier.id, capacity: PLACEHOLDER_CAPACITY },
    ]);
    console.log(`created ${ev.slug} @ ${ev.venue} · ${ev.startAt} · lineup: ${ev.lineup.join(", ")}`);
  }

  console.log("\nDeleted:", JSON.stringify(deleted, null, 1));
  const counts = await Promise.all([db.$count(s.events), db.$count(s.venues), db.$count(s.ticketTiers)]);
  console.log(`Now: events=${counts[0]} venues=${counts[1]} tiers=${counts[2]}`);
  await client.end();
}

main().catch(async (e) => {
  console.error(e);
  await client.end();
  process.exit(1);
});
