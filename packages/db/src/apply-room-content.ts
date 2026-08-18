/**
 * ROOM Series content drop — applies the confirmed brief to the four
 * September events: descriptions (client copy, verbatim), poster artwork
 * (apps/web/public/posters/*.webp) + collection tints, and the confirmed
 * ticketing (€20, capacity 500) — tiers flip hidden → on_sale.
 * DML only; idempotent (safe to re-run).
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as s from "./schema";

const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("no DB url");
const client = postgres(url, { max: 1, prepare: false });
const db = drizzle(client, { schema: s });

const BASE_INFO: [string, string][] = [
  ["Doors", "22:00 — close 04:00 CEST"],
  ["Ticket", "€20"],
  ["Capacity", "500"],
];

const ROOMS: Record<
  string,
  { blurb: string; description: string; kind: string; genres: string[]; tint: string; info: [string, string][] }
> = {
  discoroom: {
    blurb:
      "A night built around movement, rhythm and pure disco energy — shimmering lights, hypnotic grooves and a packed dancefloor until sunrise.",
    description:
      "Step into the first Wii ROOM of the season.\n\nDISCOROOM is a night built around movement, rhythm and pure disco energy — where shimmering lights, hypnotic grooves and a packed dancefloor come together until sunrise.\n\nExpect a carefully curated night of house, disco and dancefloor-driven sounds, with DJ Montana setting the tone for the first Wii experience of the season.\n\nThis is not a throwback disco party. It is Wii's modern interpretation of disco: stylish, energetic, playful and made for the dancefloor.",
    kind: "Club",
    genres: ["Disco", "House"],
    tint: "linear-gradient(150deg,#26262E,#0B0B0E 72%)",
    info: BASE_INFO,
  },
  "white-sensation-room": {
    blurb:
      "A night dressed in white — an elegant Mediterranean terrace night where white becomes the atmosphere. Come dressed in white.",
    description:
      "A night dressed in white.\n\nWHITE SENSATION ROOM brings Wii to the terrace for an elegant Mediterranean night where white becomes the atmosphere.\n\nExpect warm summer air, elevated sounds, sunset energy turning into a late-night dancefloor, and a crowd dressed entirely in white.\n\nMinimal, sophisticated and effortlessly Mediterranean.\n\nCome dressed in white. Stay until the lights come on.",
    kind: "Terrace",
    genres: [],
    tint: "linear-gradient(150deg,#3D382E,#121009 72%)",
    info: [...BASE_INFO, ["Dress code", "All white"]],
  },
  redroom: {
    blurb:
      "A darker, deeper and more intense Wii experience built around one color: red. Red light. Deep sounds. Heat. Movement. Shadows.",
    description:
      "Enter the REDROOM.\n\nA darker, deeper and more intense Wii experience built around one color: red.\n\nRed light. Deep sounds. Heat. Movement. Shadows.\n\nAs the night progresses, the terrace transforms into an immersive red environment where the music, crowd and atmosphere become one.\n\nREDROOM is for the nights that start late and end even later. Expect intensity, energy and a dancefloor that doesn't slow down.",
    kind: "Terrace",
    genres: [],
    tint: "linear-gradient(150deg,#3A0E08,#120404 72%)",
    info: BASE_INFO,
  },
  jungleroom: {
    blurb:
      "Leave the city behind — a tropical after-dark world at Palm Beach. The jungle becomes the setting. The music becomes the journey.",
    description:
      "Leave the city behind.\n\nJUNGLEROOM takes Wii into a tropical after-dark world at Palm Beach.\n\nThink dense jungle shadows, warm night air, tropical textures and an immersive dancefloor surrounded by the feeling of somewhere far away.\n\nThe jungle becomes the setting. The music becomes the journey.\n\nA wild, atmospheric and unexpected Wii night.",
    kind: "Beach",
    genres: [],
    tint: "linear-gradient(150deg,#0F2A1C,#08110C 72%)",
    info: BASE_INFO,
  },
};

async function main() {
  for (const [slug, r] of Object.entries(ROOMS)) {
    const event = await db.query.events.findFirst({ where: eq(s.events.slug, slug) });
    if (!event) throw new Error(`event ${slug} missing`);

    await db
      .update(s.eventContent)
      .set({
        blurb: r.blurb,
        description: r.description,
        kind: r.kind,
        genres: r.genres,
        media: { tint: r.tint, posterKey: `/posters/${slug}.webp` },
        info: r.info,
      })
      .where(eq(s.eventContent.eventId, event.id));

    const [tier] = await db.select().from(s.ticketTiers).where(eq(s.ticketTiers.eventId, event.id));
    await db.update(s.ticketTiers).set({ status: "on_sale", note: null }).where(eq(s.ticketTiers.id, tier.id));
    await db
      .update(s.pricePhases)
      .set({ name: "Standard", priceCents: 2000 })
      .where(eq(s.pricePhases.tierId, tier.id));
    await db.update(s.inventoryPools).set({ capacity: 500 }).where(eq(s.inventoryPools.eventId, event.id));
    console.log(`${slug}: content + poster + €20 on_sale + cap 500 ✓`);
  }
  await client.end();
}
main().catch(async (e) => { console.error(e); await client.end(); process.exit(1); });
