/**
 * Phase 1 seed — ports the launch catalogue (formerly apps/web/lib/events.ts
 * mock data) into Postgres. Idempotent: refuses to run if the organizer row
 * already exists, unless FORCE_RESEED=1 (which wipes catalogue tables first).
 *
 * Run: npm run seed -w @wii/db   (needs DIRECT_DATABASE_URL in env)
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { centsFromLegacyString } from "@wii/core";
import * as s from "./schema";

const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("DIRECT_DATABASE_URL / DATABASE_URL not set");
const client = postgres(url, { max: 1, prepare: false });
const db = drizzle(client, { schema: s });

/* ---------------- Launch catalogue data ---------------- */

const TIERS = [
  {
    key: "early",
    name: "Early Bird",
    price: "€35",
    note: "Phase 2 of 4",
    perks: ["Entry after 22:00", "Welcome drink"],
    vip: false,
    capacity: 150,
  },
  {
    key: "ga",
    name: "General Admission",
    price: "€45",
    note: "Standard entry",
    perks: ["Entry after 22:00", "Access to all floors"],
    vip: false,
    capacity: 400,
  },
  {
    key: "vip",
    name: "VIP Terrace",
    price: "€95",
    note: "Sea-view terrace",
    perks: ["Fast-track entry", "Private sea-view terrace", "Table service", "Dedicated bar"],
    vip: true,
    capacity: 60,
  },
] as const;

const SHARED_INFO: [string, string][] = [
  ["Doors", "22:00 — last entry 02:00"],
  ["Age", "21+ · ID required"],
  ["Dress", "No flip-flops. Come as the night."],
  ["Getting there", "Ferry + shuttle from Ċirkewwa"],
];

const SHARED_FAQ: [string, string][] = [
  ["Is there re-entry?", "No re-entry once you leave the venue perimeter."],
  ["How do I get my ticket?", "Your QR ticket arrives by email and lives in your account — add it to Apple/Google Wallet."],
  ["What's the refund policy?", "Tickets are transferable up to 48h before. No refunds, but you can resell via the official waitlist."],
  ["Is there parking?", "Limited. We strongly recommend the official shuttle."],
];

interface SeedEvent {
  slug: string;
  title: string;
  venue: { name: string; city: string };
  // Malta is CEST (+02:00) for all launch dates (Jul–Sep)
  startAt: string;
  endAt: string;
  genres: string[];
  type: string;
  tint: string;
  blurb: string;
  /** mock status → drives tier status + pool fill below */
  mood: "available" | "limited" | "soldout" | "invite" | "earlybird";
  artists: { name: string; role: string; setTime?: string; country?: string; headliner?: boolean }[];
}

const EVENTS: SeedEvent[] = [
  {
    slug: "sunset-iv",
    title: "Sunset Sessions IV",
    venue: { name: "Cave 12", city: "Gozo" },
    startAt: "2026-07-12T22:00:00+02:00",
    endAt: "2026-07-13T06:00:00+02:00",
    genres: ["Melodic Techno", "Organic House"],
    type: "Cave",
    tint: "linear-gradient(150deg,#3a1410,#120a18 72%)",
    blurb:
      "An all-night descent into a sea cave on the north coast of Gozo. Sound by Funktion-One, light by the Mediterranean.",
    mood: "limited",
    artists: [
      { name: "Adriatique", role: "DJ Set", setTime: "01:00 – 03:00", country: "🇨🇭", headliner: true },
      { name: "Massano", role: "Live", setTime: "23:30 – 01:00", country: "🇬🇧" },
      { name: "Cassian", role: "DJ Set", setTime: "03:00 – 05:00", country: "🇦🇺" },
      { name: "WII Residents", role: "Opening", setTime: "22:00 – 23:30", country: "🇲🇹" },
    ],
  },
  {
    slug: "salt-bass",
    title: "Salt & Bass",
    venue: { name: "Fort Ricasoli", city: "Kalkara" },
    startAt: "2026-08-01T23:00:00+02:00",
    endAt: "2026-08-02T06:00:00+02:00",
    genres: ["House", "Afro House"],
    type: "Fort",
    tint: "linear-gradient(150deg,#101a2e,#0a0a14 72%)",
    blurb:
      "Bass against bastion walls. A historic fort opens its gates for one night of house and afro rhythms by the water.",
    mood: "available",
    artists: [
      { name: "Cassian", role: "DJ Set", setTime: "02:00 – 04:00", country: "🇦🇺", headliner: true },
      { name: "Âme", role: "DJ Set", setTime: "00:00 – 02:00", country: "🇩🇪" },
      { name: "Local Heroes", role: "Opening", setTime: "23:00 – 00:00", country: "🇲🇹" },
    ],
  },
  {
    slug: "blue-grotto",
    title: "Blue Grotto",
    venue: { name: "Blue Grotto", city: "Żurrieq" },
    startAt: "2026-08-16T21:00:00+02:00",
    endAt: "2026-08-17T04:00:00+02:00",
    genres: ["Downtempo", "Organic"],
    type: "Coast",
    tint: "linear-gradient(150deg,#1a1030,#0a0a14 72%)",
    blurb:
      "Downtempo and organic textures above one of Malta's most cinematic coastlines. Sold out — join the waitlist.",
    mood: "soldout",
    artists: [
      { name: "Bedouin", role: "DJ Set", setTime: "01:00 – 03:00", country: "🇺🇸", headliner: true },
      { name: "Sainte Vie", role: "Live", setTime: "23:00 – 01:00", country: "🇲🇽" },
    ],
  },
  {
    slug: "valletta-rooftop",
    title: "Valletta Rooftop",
    venue: { name: "Strait Street", city: "Valletta" },
    startAt: "2026-08-24T18:00:00+02:00",
    endAt: "2026-08-25T01:00:00+02:00",
    genres: ["Disco", "House"],
    type: "Rooftop",
    tint: "linear-gradient(150deg,#2a1810,#0a0a0c 72%)",
    blurb:
      "Golden hour into the night, high above the old city's most storied street. Disco, house and a sunset you'll keep.",
    mood: "earlybird",
    artists: [
      { name: "Folamour", role: "Live", setTime: "21:00 – 23:00", country: "🇫🇷", headliner: true },
      { name: "WII Residents", role: "Sunset", setTime: "18:00 – 21:00", country: "🇲🇹" },
    ],
  },
  {
    slug: "comino-day",
    title: "Comino Day Boat",
    venue: { name: "Blue Lagoon", city: "Comino" },
    startAt: "2026-09-06T14:00:00+02:00",
    endAt: "2026-09-06T22:00:00+02:00",
    genres: ["Beach", "Organic"],
    type: "Boat",
    tint: "linear-gradient(150deg,#10221f,#0a0a12 72%)",
    blurb:
      "Open water, open decks. An invite-only day on the Blue Lagoon for the community and friends of the house.",
    mood: "invite",
    artists: [
      { name: "Invited Guests", role: "All day", setTime: "14:00 – 22:00", country: "🌍", headliner: true },
    ],
  },
  {
    slug: "underground-vol9",
    title: "Underground Vol.9",
    venue: { name: "Secret Location", city: "Malta" },
    startAt: "2026-09-19T23:30:00+02:00",
    endAt: "2026-09-20T07:00:00+02:00",
    genres: ["Techno"],
    type: "Secret",
    tint: "linear-gradient(150deg,#241318,#0a0a0c 72%)",
    blurb:
      "Location revealed 24 hours before doors. Pure techno, capped capacity, no phones on the floor.",
    mood: "available",
    artists: [
      { name: "TBA", role: "Headline", setTime: "02:00 – 05:00", country: "🌍", headliner: true },
      { name: "WII Residents", role: "Opening", setTime: "23:30 – 02:00", country: "🇲🇹" },
    ],
  },
];

/* ---------------- Seed ---------------- */

async function main() {
  const existing = await db.query.organizers.findFirst({
    where: eq(s.organizers.slug, "wii-malta"),
  });
  if (existing && process.env.FORCE_RESEED !== "1") {
    console.log("Organizer 'wii-malta' already seeded — set FORCE_RESEED=1 to wipe & reseed.");
    await client.end();
    return;
  }
  if (existing) {
    console.log("FORCE_RESEED: wiping catalogue tables…");
    // FK-safe order; catalogue only — never touches orders/tickets tables.
    await db.delete(s.inventoryPools);
    await db.delete(s.pricePhases);
    await db.delete(s.ticketTiers);
    await db.delete(s.eventLineup);
    await db.delete(s.eventContent);
    await db.delete(s.events);
    await db.delete(s.venues);
    await db.delete(s.organizerMembers);
    await db.delete(s.organizers);
  }

  // Owner user (claimable later by Supabase Auth via email match)
  const [owner] = await db
    .insert(s.users)
    .values({
      email: "zedsi85@gmail.com",
      displayName: "Zied",
      platformRole: "platform_admin",
    })
    .onConflictDoNothing()
    .returning();
  const ownerId =
    owner?.id ??
    (await db.query.users.findFirst({ where: eq(s.users.email, "zedsi85@gmail.com") }))!.id;

  const [org] = await db
    .insert(s.organizers)
    .values({
      slug: "wii-malta",
      name: "Wii Event Malta",
      // NOTE: 'active' without a Stripe account is a Phase-1 allowance —
      // catalogue is display-only until Phase 2 wires payments.
      status: "active",
      defaultCurrency: "EUR",
    })
    .returning();

  await db.insert(s.organizerMembers).values({
    organizerId: org.id,
    userId: ownerId,
    role: "owner",
  });

  let tiersN = 0;
  for (const ev of EVENTS) {
    const [venue] = await db
      .insert(s.venues)
      .values({
        organizerId: org.id,
        name: ev.venue.name,
        city: ev.venue.city,
        country: "MT",
      })
      .returning();

    const [event] = await db
      .insert(s.events)
      .values({
        organizerId: org.id,
        venueId: venue.id,
        slug: ev.slug,
        title: ev.title,
        status: "published",
        timezone: "Europe/Malta",
        startAt: new Date(ev.startAt),
        endAt: new Date(ev.endAt),
        doorsAt: new Date(ev.startAt),
        currency: "EUR",
        ageRestriction: 21,
        isUnlisted: ev.mood === "invite",
        publishedAt: new Date(),
        createdBy: ownerId,
      })
      .returning();

    await db.insert(s.eventContent).values({
      eventId: event.id,
      version: 1,
      isLive: true,
      blurb: ev.blurb,
      description: ev.blurb,
      kind: ev.type,
      badge: ev.mood === "earlybird" ? "earlybird" : null,
      genres: ev.genres,
      media: { tint: ev.tint },
      info: SHARED_INFO,
      faq: SHARED_FAQ,
    });

    await db.insert(s.eventLineup).values(
      ev.artists.map((a, i) => ({
        eventId: event.id,
        name: a.name,
        role: a.role,
        country: a.country,
        setTime: a.setTime,
        isHeadliner: !!a.headliner,
        sort: i,
      }))
    );

    // Event-wide pool caps total admission across tiers
    const totalCap = TIERS.reduce((n, t) => n + t.capacity, 0);
    await db.insert(s.inventoryPools).values({
      eventId: event.id,
      tierId: null,
      capacity: totalCap,
      soldCount: ev.mood === "soldout" ? totalCap : 0,
    });

    for (const [ti, t] of TIERS.entries()) {
      const tierStatus =
        ev.mood === "soldout" ? "sold_out" : ev.mood === "invite" ? "hidden" : "on_sale";
      const [tier] = await db
        .insert(s.ticketTiers)
        .values({
          eventId: event.id,
          organizerId: org.id,
          name: t.name,
          note: t.note,
          perks: [...t.perks],
          isVip: t.vip,
          status: tierStatus,
          sort: ti,
        })
        .returning();
      tiersN++;

      await db.insert(s.pricePhases).values({
        tierId: tier.id,
        name: t.note,
        priceCents: centsFromLegacyString(t.price),
        sort: 0,
      });

      // "limited" mood: early-bird tier nearly gone, others healthy
      const sold =
        ev.mood === "soldout"
          ? t.capacity
          : ev.mood === "limited" && t.key === "early"
            ? Math.floor(t.capacity * 0.9)
            : 0;
      await db.insert(s.inventoryPools).values({
        eventId: event.id,
        tierId: tier.id,
        capacity: t.capacity,
        soldCount: sold,
      });
    }
  }

  const counts = await Promise.all([
    db.$count(s.events),
    db.$count(s.venues),
    db.$count(s.ticketTiers),
    db.$count(s.inventoryPools),
    db.$count(s.eventLineup),
  ]);
  console.log(
    `Seeded ✓ events=${counts[0]} venues=${counts[1]} tiers=${counts[2]} pools=${counts[3]} lineup=${counts[4]}`
  );
  await client.end();
}

main().catch(async (e) => {
  console.error(e);
  await client.end();
  process.exit(1);
});
