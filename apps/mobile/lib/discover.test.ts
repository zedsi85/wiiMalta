import { test } from "node:test";
import assert from "node:assert/strict";
import { daysUntil, filterEvents, groupHome, isPast, priceValue, windowOf } from "./discover";
import type { WiiEvent } from "./api";

const now = new Date("2026-10-19T12:00:00Z").getTime(); // a Monday
const ev = (slug: string, iso: string, extra: Partial<WiiEvent> = {}): WiiEvent => ({
  slug, title: slug.toUpperCase(), date: "", dateLong: "", dateShort: "", iso, venue: "Nine Lives", city: "Paola",
  genres: ["Techno"], lineup: ["Markelov"], priceFrom: "€25", status: "available", type: "Club", tint: "", blurb: "",
  artists: [], tiers: [], info: [], faq: [], ...extra,
});

test("time windows", () => {
  assert.equal(windowOf(ev("a", "2026-10-19T21:00:00Z"), now), "today");
  assert.equal(windowOf(ev("b", "2026-10-22T21:00:00Z"), now), "week");      // Thursday
  assert.equal(windowOf(ev("c", "2026-10-24T21:00:00Z"), now), "weekend");   // Saturday
  assert.equal(windowOf(ev("d", "2026-10-31T21:00:00Z"), now), "later");
  assert.equal(windowOf(ev("e", "2026-10-18T21:00:00Z"), now), "past");
  assert.equal(daysUntil("2026-10-24T21:00:00Z", now), 5);
});

test("events stay live for the night after their start", () => {
  assert.equal(isPast(ev("a", "2026-10-19T08:00:00Z"), now), false); // started 4h ago → still tonight
  assert.equal(isPast(ev("a", "2026-10-19T04:00:00Z"), now), true);  // 8h ago → over
});

test("filters: search across title/venue/artists, genre, city, when", () => {
  const es = [ev("prison", "2026-10-31T21:00:00Z", { lineup: ["Marko Nastic"], genres: ["Techno"] }), ev("disco", "2026-10-24T21:00:00Z", { genres: ["Disco"], city: "Malta" })];
  assert.deepEqual(filterEvents(es, { q: "nastic" }, now).map((e) => e.slug), ["prison"]);
  assert.deepEqual(filterEvents(es, { genre: "Disco" }, now).map((e) => e.slug), ["disco"]);
  assert.deepEqual(filterEvents(es, { city: "Paola" }, now).map((e) => e.slug), ["prison"]);
  assert.deepEqual(filterEvents(es, { when: "weekend" }, now).map((e) => e.slug), ["disco"]);
  assert.deepEqual(filterEvents(es, { when: "later" }, now).map((e) => e.slug), ["prison"]);
  assert.equal(filterEvents(es, { q: "zzz" }, now).length, 0);
  assert.deepEqual(filterEvents(es, {}, now).map((e) => e.slug), ["disco", "prison"]); // date order
});

test("home groups: next skips sold out, genres ranked", () => {
  const es = [ev("sold", "2026-10-20T21:00:00Z", { status: "soldout" }), ev("open", "2026-10-22T21:00:00Z", { status: "limited" }), ev("later", "2026-11-05T21:00:00Z", { genres: ["Disco", "Techno"] })];
  const g = groupHome(es, now);
  assert.equal(g.next?.slug, "open");
  assert.deepEqual(g.almostGone.map((e) => e.slug), ["open"]);
  assert.equal(g.byGenre[0].genre, "Techno");
  assert.equal(g.upcoming.length, 3);
});

test("price parsing", () => {
  assert.equal(priceValue("€25"), 25);
  assert.equal(priceValue("€12.50"), 12.5);
  assert.equal(priceValue("free"), 0);
});
