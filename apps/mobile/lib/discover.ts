import type { WiiEvent } from "./api";

/**
 * Pure discovery logic — grouping, time windows, filtering, price parsing.
 * No React, no I/O: unit-tested in lib/discover.test.ts. The backend remains
 * the source of truth for availability; this only arranges what it returns.
 */
export type When = "all" | "today" | "week" | "weekend" | "later";
export const WHEN_LABELS: Record<When, string> = { all: "Any time", today: "Tonight", week: "This week", weekend: "This weekend", later: "Later" };

const DAY = 24 * 3600_000;

/** Days until the event starts, in the viewer's local calendar (0 = today). */
export function daysUntil(iso: string, now: number): number {
  const start = new Date(iso);
  const a = new Date(now); a.setHours(0, 0, 0, 0);
  const b = new Date(start); b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / DAY);
}

export function isPast(e: WiiEvent, now: number): boolean {
  // Nights run past midnight: treat an event as live until ~6h after its start.
  return new Date(e.iso).getTime() + 6 * 3600_000 < now;
}

/** Window an event falls in relative to `now`. */
export function windowOf(e: WiiEvent, now: number): Exclude<When, "all"> | "past" {
  if (isPast(e, now)) return "past";
  const d = daysUntil(e.iso, now);
  if (d <= 0) return "today";
  const dow = new Date(e.iso).getDay(); // 0 Sun … 6 Sat
  const weekendDay = dow === 5 || dow === 6 || dow === 0;
  if (d <= 7 && weekendDay) return "weekend";
  if (d <= 7) return "week";
  return "later";
}

export function priceValue(price: string): number {
  const n = parseFloat(price.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export interface Filters { q?: string; genre?: string; city?: string; when?: When }

export function matches(e: WiiEvent, f: Filters, now: number): boolean {
  if (isPast(e, now)) return false;
  if (f.genre && f.genre !== "All" && !e.genres.includes(f.genre)) return false;
  if (f.city && f.city !== "All" && e.city !== f.city) return false;
  if (f.when && f.when !== "all") {
    const w = windowOf(e, now);
    if (f.when === "week" ? !(w === "today" || w === "week" || w === "weekend") : w !== f.when) return false;
  }
  const needle = (f.q ?? "").trim().toLowerCase();
  if (needle) {
    const hay = [e.title, e.venue, e.city, e.type, ...e.genres, ...e.lineup].join(" ").toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  return true;
}

export function filterEvents(events: WiiEvent[], f: Filters, now = Date.now()): WiiEvent[] {
  return events.filter((e) => matches(e, f, now)).sort((a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime());
}

export interface HomeGroups {
  next?: WiiEvent;
  tonight: WiiEvent[];
  weekend: WiiEvent[];
  almostGone: WiiEvent[];
  byGenre: { genre: string; events: WiiEvent[] }[];
  upcoming: WiiEvent[];
}

/** Arrange the catalogue for the home feed. `next` = first upcoming that can still be bought. */
export function groupHome(events: WiiEvent[], now = Date.now()): HomeGroups {
  const upcoming = events.filter((e) => !isPast(e, now)).sort((a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime());
  const next = upcoming.find((e) => e.status !== "soldout") ?? upcoming[0];
  const tonight = upcoming.filter((e) => windowOf(e, now) === "today");
  const weekend = upcoming.filter((e) => windowOf(e, now) === "weekend" || windowOf(e, now) === "today");
  const almostGone = upcoming.filter((e) => e.status === "limited");
  const genres = new Map<string, WiiEvent[]>();
  for (const e of upcoming) for (const g of e.genres) genres.set(g, [...(genres.get(g) ?? []), e]);
  const byGenre = [...genres.entries()].filter(([, es]) => es.length >= 1).sort((a, b) => b[1].length - a[1].length).map(([genre, events]) => ({ genre, events }));
  return { next, tonight, weekend, almostGone, byGenre, upcoming };
}
