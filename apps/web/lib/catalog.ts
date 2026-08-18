import "server-only";
import { inArray, eq, asc } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import type { WiiEvent, TicketTier, LineupArtist, EventStatus } from "@/lib/events";

/**
 * Catalog data-access layer — reads the live catalogue from Postgres and maps
 * it onto the existing `WiiEvent` view-model so every component renders
 * unchanged. This is the seam where the mock module used to sit.
 *
 * Derivation rules (spec: docs/architecture/state-machines.md):
 *  - "invite"   → event is unlisted
 *  - "soldout"  → every tier sold out (tier status or full pool)
 *  - "limited"  → any on-sale tier pool ≥85% sold
 *  - "earlybird"→ editorial badge on the live content version
 *  - otherwise  → "available"
 */

const TZ = "Europe/Malta";

function fmt(d: Date, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...opts }).format(d);
}

function timeHM(d: Date): string {
  return fmt(d, { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** "SAT · 12 JUL · 22:00" */
function dateBadge(start: Date): string {
  const wd = fmt(start, { weekday: "short" }).toUpperCase();
  const dm = fmt(start, { day: "2-digit", month: "short" }).toUpperCase().replace(" ", " ");
  return `${wd} · ${dm} · ${timeHM(start)}`;
}

/** "Saturday 12 July · 22:00 – 06:00" */
function dateLong(start: Date, end: Date): string {
  const day = fmt(start, { weekday: "long", day: "numeric", month: "long" });
  return `${day} · ${timeHM(start)} – ${timeHM(end)}`;
}

/** "12.07" */
function dateShort(start: Date): string {
  return fmt(start, { day: "2-digit", month: "2-digit" }).replace("/", ".");
}

function euro(cents: number): string {
  return cents % 100 === 0 ? `€${cents / 100}` : `€${(cents / 100).toFixed(2)}`;
}

interface PoolInfo {
  capacity: number;
  sold: number;
  held: number;
}

function tierViewStatus(
  dbStatus: string,
  pool: PoolInfo | undefined,
  badge: string | null
): EventStatus {
  if (dbStatus === "sold_out") return "soldout";
  if (pool && pool.sold + pool.held >= pool.capacity) return "soldout";
  if (dbStatus === "hidden") return "invite";
  if (pool && (pool.sold + pool.held) / pool.capacity >= 0.85) return "limited";
  if (badge === "earlybird") return "earlybird";
  return "available";
}

export async function fetchCatalogEvents(): Promise<WiiEvent[]> {
  const d = db();

  const events = await d
    .select()
    .from(s.events)
    .where(eq(s.events.status, "published"))
    .orderBy(asc(s.events.startAt));
  if (events.length === 0) return [];
  const ids = events.map((e) => e.id);

  const [contents, lineups, tiers, phases, pools, venues] = await Promise.all([
    d.select().from(s.eventContent).where(inArray(s.eventContent.eventId, ids)),
    d.select().from(s.eventLineup).where(inArray(s.eventLineup.eventId, ids)).orderBy(asc(s.eventLineup.sort)),
    d.select().from(s.ticketTiers).where(inArray(s.ticketTiers.eventId, ids)).orderBy(asc(s.ticketTiers.sort)),
    d.select().from(s.pricePhases),
    d.select().from(s.inventoryPools).where(inArray(s.inventoryPools.eventId, ids)),
    d.select().from(s.venues),
  ]);

  const contentByEvent = new Map(contents.filter((c) => c.isLive).map((c) => [c.eventId, c]));
  const venueById = new Map(venues.map((v) => [v.id, v]));
  const phasesByTier = new Map<string, (typeof phases)[number][]>();
  for (const p of phases) {
    (phasesByTier.get(p.tierId) ?? phasesByTier.set(p.tierId, []).get(p.tierId)!).push(p);
  }
  const poolByTier = new Map<string, PoolInfo>();
  const eventPool = new Map<string, PoolInfo>();
  for (const p of pools) {
    const info = { capacity: p.capacity, sold: p.soldCount, held: p.heldCount };
    if (p.tierId) poolByTier.set(p.tierId, info);
    else eventPool.set(p.eventId, info);
  }

  return events.map((ev) => {
    const content = contentByEvent.get(ev.id);
    const venue = ev.venueId ? venueById.get(ev.venueId) : undefined;
    const evTiers = tiers.filter((t) => t.eventId === ev.id);
    const badge = content?.badge ?? null;

    const viewTiers: TicketTier[] = evTiers.map((t) => {
      const phase = (phasesByTier.get(t.id) ?? []).sort((a, b) => a.sort - b.sort)[0];
      return {
        id: t.id,
        name: t.name,
        price: euro(phase?.priceCents ?? 0),
        note: phase?.name ?? t.note ?? undefined,
        status: tierViewStatus(t.status, poolByTier.get(t.id), badge),
        vip: t.isVip || undefined,
        perks: (t.perks as string[]) ?? [],
      };
    });

    // Event-level availability
    const ePool = eventPool.get(ev.id);
    let status: EventStatus;
    if (ev.isUnlisted) status = "invite";
    else if (
      viewTiers.length > 0 &&
      (viewTiers.every((t) => t.status === "soldout") ||
        (ePool && ePool.sold + ePool.held >= ePool.capacity))
    )
      status = "soldout";
    else if (viewTiers.some((t) => t.status === "limited")) status = "limited";
    else if (badge === "earlybird") status = "earlybird";
    else status = "available";

    const onSale = viewTiers.filter((t) => t.status !== "soldout");
    const cheapest = (onSale.length ? onSale : viewTiers)
      .map((t) => t.price)
      .sort((a, b) => parseFloat(a.slice(1)) - parseFloat(b.slice(1)))[0];

    const artists: LineupArtist[] = lineups
      .filter((l) => l.eventId === ev.id)
      .map((l) => ({
        name: l.name,
        role: l.role ?? "",
        setTime: l.setTime ?? undefined,
        country: l.country ?? undefined,
        headliner: l.isHeadliner || undefined,
      }));

    const start = ev.startAt;
    const end = ev.endAt;

    return {
      slug: ev.slug,
      title: ev.title,
      date: dateBadge(start),
      dateLong: dateLong(start, end),
      dateShort: dateShort(start),
      iso: start.toISOString(),
      venue: venue ? `${venue.name} — ${venue.city}` : "TBA",
      city: venue?.city ?? "Malta",
      genres: (content?.genres as string[]) ?? [],
      lineup: artists.map((a) => a.name),
      priceFrom: cheapest ?? "€0",
      status,
      type: content?.kind ?? "Night",
      tint: (content?.media as { tint?: string } | null)?.tint ?? "linear-gradient(150deg,#241318,#0a0a0c 72%)",
      posterUrl: (content?.media as { posterKey?: string } | null)?.posterKey || undefined,
      blurb: content?.blurb ?? "",
      artists,
      tiers: viewTiers,
      info: (content?.info as [string, string][]) ?? [],
      faq: (content?.faq as [string, string][]) ?? [],
    };
  });
}

export async function fetchCatalogEvent(slug: string): Promise<WiiEvent | undefined> {
  const all = await fetchCatalogEvents();
  return all.find((e) => e.slug === slug);
}

export async function fetchSimilar(slug: string, count = 3): Promise<WiiEvent[]> {
  const all = await fetchCatalogEvents();
  return all.filter((e) => e.slug !== slug).slice(0, count);
}

/** Featured = the next upcoming published event (fallback: first). */
export async function fetchFeatured(): Promise<WiiEvent | undefined> {
  const all = await fetchCatalogEvents();
  const now = Date.now();
  return all.find((e) => new Date(e.iso).getTime() > now && e.status !== "soldout") ?? all[0];
}
