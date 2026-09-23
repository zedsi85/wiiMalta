/**
 * Halloween Prison ROOM — Old Historical Prison, Kordin / Paola, 31 Oct 2026.
 * Creates the event through the existing model (venue → event → live content →
 * lineup → tier/phase/pools). Idempotent: re-running updates in place.
 *
 * Times: 22:00–04:00 Europe/Malta. Note: Malta leaves DST on 25 Oct 2026, so
 * the night is CET (+01:00); the site renders local time, so it shows 22:00.
 * Capacity: the ROOM series' configured 500 is reused — NOT a confirmed venue
 * number; adjust in admin once the prison's licensed capacity is known.
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, isNull } from "drizzle-orm";
import * as s from "./schema";

const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("no DB url");
const client = postgres(url, { max: 1, prepare: false });
const db = drizzle(client, { schema: s });

const SLUG = "halloween-prison-room";
const CAPACITY = 500; // series default — confirm against venue licence

async function main() {
  const org = await db.query.organizers.findFirst({ where: eq(s.organizers.slug, "wii-malta") });
  const owner = await db.query.users.findFirst({ where: eq(s.users.email, "zedsi85@gmail.com") });
  if (!org || !owner) throw new Error("organizer/owner missing");

  // Venue (reuse if it already exists)
  let venue = await db.query.venues.findFirst({ where: eq(s.venues.name, "Old Historical Prison") });
  if (!venue) {
    [venue] = await db
      .insert(s.venues)
      .values({ organizerId: org.id, name: "Old Historical Prison", address: "Kordin", city: "Paola", country: "MT" })
      .returning();
  }

  const startAt = new Date("2026-10-31T22:00:00+01:00");
  const endAt = new Date("2026-11-01T04:00:00+01:00");
  let event = await db.query.events.findFirst({ where: eq(s.events.slug, SLUG) });
  if (!event) {
    [event] = await db
      .insert(s.events)
      .values({
        organizerId: org.id, venueId: venue.id, slug: SLUG, title: "Halloween Prison ROOM",
        status: "published", timezone: "Europe/Malta", startAt, endAt, doorsAt: startAt,
        currency: "EUR", publishedAt: new Date(), createdBy: owner.id,
      })
      .returning();
  } else {
    await db.update(s.events).set({ venueId: venue.id, startAt, endAt, doorsAt: startAt, updatedAt: new Date() }).where(eq(s.events.id, event.id));
  }

  const content = {
    blurb:
      "Wii takes over a historic prison in Kordin this Halloween. One night only: Markelov, Marko Nastic and Mato inside the walls of a 19th-century prison complex. €25 including a welcome drink.",
    description:
      "This Halloween, we're not going to a club. We're going to prison.\n\nFor one night, Wii takes over a historic prison complex on the Kordin heights above Paola and opens its doors for music. Techno in the wings, the exercise yard as the floor, stone and iron where there would usually be velvet and mirrors.\n\nThe Corradino prison complex dates to the 19th century — constructed in 1866 as a naval prison for the British forces on the island and later transferred to military use. Long wings, rows of barred cell windows, enclosed exercise yards. Nothing here is a set.\n\nMarkelov, Marko Nastic and Mato. 22:00 to 04:00. €25, one free welcome drink included.",
    kind: "Prison",
    genres: ["Techno"],
    media: { tint: "linear-gradient(150deg,#1c1a17,#0b0b0e 72%)", posterKey: "/venues/old-prison/cell-block.webp" },
    info: [
      ["Location", "Old Historical Prison — Kordin, Paola"],
      ["Date", "Saturday 31 October 2026"],
      ["Doors", "22:00 — close 04:00"],
      ["Ticket", "€25 — one free welcome drink included"],
      ["Line-up", "Markelov · Marko Nastic · Mato"],
      ["Entry", "Your QR ticket on your phone (app or email link) — screenshots won't scan"],
    ] as [string, string][],
    faq: [
      ["What's included in the ticket?", "Entry for the night plus one free welcome drink at the bar."],
      ["How do I get my ticket?", "Your QR ticket arrives by email and lives in your Wii account and the app. Tickets are transferable to a friend before the event."],
    ] as [string, string][],
  };
  const live = await db.query.eventContent.findFirst({ where: and(eq(s.eventContent.eventId, event.id), eq(s.eventContent.isLive, true)) });
  if (live) await db.update(s.eventContent).set(content).where(eq(s.eventContent.id, live.id));
  else await db.insert(s.eventContent).values({ eventId: event.id, version: 1, isLive: true, ...content });

  // Lineup (as supplied — no roles/set times invented)
  await db.delete(s.eventLineup).where(eq(s.eventLineup.eventId, event.id));
  await db.insert(s.eventLineup).values(
    ["Markelov", "Marko Nastic", "Mato"].map((name, i) => ({ eventId: event!.id, name, sort: i }))
  );

  // Tier: €25 GA with the welcome drink perk, on sale
  let tier = (await db.select().from(s.ticketTiers).where(eq(s.ticketTiers.eventId, event.id)))[0];
  if (!tier) {
    [tier] = await db
      .insert(s.ticketTiers)
      .values({ eventId: event.id, organizerId: org.id, name: "General Admission", perks: ["One free welcome drink"], status: "on_sale", sort: 0 })
      .returning();
    await db.insert(s.pricePhases).values({ tierId: tier.id, name: "Welcome drink included", priceCents: 2500, sort: 0 });
    await db.insert(s.inventoryPools).values([
      { eventId: event.id, tierId: null, capacity: CAPACITY },
      { eventId: event.id, tierId: tier.id, capacity: CAPACITY },
    ]);
  } else {
    await db.update(s.ticketTiers).set({ perks: ["One free welcome drink"], status: "on_sale", note: null }).where(eq(s.ticketTiers.id, tier.id));
    await db.update(s.pricePhases).set({ name: "Welcome drink included", priceCents: 2500 }).where(eq(s.pricePhases.tierId, tier.id));
  }

  const pools = await db.select().from(s.inventoryPools).where(eq(s.inventoryPools.eventId, event.id));
  console.log(`✓ ${SLUG}: venue=${venue.name} (${venue.city}) start=${startAt.toISOString()} tier=€25 on_sale pools=${pools.map((p) => `${p.tierId ? "tier" : "event"}:${p.capacity}`).join(",")} lineup=Markelov,Marko Nastic,Mato`);
  void isNull;
  await client.end();
}
main().catch(async (e) => { console.error(e); await client.end(); process.exit(1); });
