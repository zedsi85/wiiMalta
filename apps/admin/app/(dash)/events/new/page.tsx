import { asc } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { requireStaff } from "@/lib/auth";
import { createEvent } from "../../actions";

export const dynamic = "force-dynamic";

const TINTS: [string, string][] = [
  ["Ember cave", "linear-gradient(150deg,#3a1410,#120a18 72%)"],
  ["Azure fort", "linear-gradient(150deg,#101a2e,#0a0a14 72%)"],
  ["Haze coast", "linear-gradient(150deg,#1a1030,#0a0a14 72%)"],
  ["Sunset rooftop", "linear-gradient(150deg,#2a1810,#0a0a0c 72%)"],
  ["Lagoon", "linear-gradient(150deg,#10221f,#0a0a12 72%)"],
  ["Underground", "linear-gradient(150deg,#241318,#0a0a0c 72%)"],
];

export default async function NewEventPage() {
  await requireStaff();
  const venues = await db().select().from(s.venues).orderBy(asc(s.venues.name));

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">New event</h1>
      <p className="mb-6 text-sm text-fog">
        Created as a <span className="pill">draft</span> — publish from the event page when ready.
        All times are Malta local.
      </p>

      <form action={createEvent} className="grid max-w-3xl gap-6">
        <section className="card grid gap-3">
          <h2 className="label">Basics</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className="label" htmlFor="title">Title</label>
              <input id="title" name="title" required placeholder="Salt & Bass II" className="input-admin" />
            </div>
            <div className="grid gap-1.5">
              <label className="label" htmlFor="slug">Slug (URL)</label>
              <input
                id="slug"
                name="slug"
                required
                pattern="[a-z0-9-]{3,60}"
                placeholder="salt-bass-ii"
                className="input-admin"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="label" htmlFor="startAt">Starts (Malta)</label>
              <input id="startAt" name="startAt" type="datetime-local" required className="input-admin" />
            </div>
            <div className="grid gap-1.5">
              <label className="label" htmlFor="endAt">Ends (Malta)</label>
              <input id="endAt" name="endAt" type="datetime-local" required className="input-admin" />
            </div>
            <div className="grid gap-1.5">
              <label className="label" htmlFor="kind">Format label</label>
              <input id="kind" name="kind" placeholder="Cave · Fort · Rooftop · Boat…" className="input-admin" />
            </div>
            <div className="grid gap-1.5">
              <label className="label" htmlFor="age">Age restriction</label>
              <input id="age" name="age" type="number" min={16} max={30} placeholder="21" className="input-admin" />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <label className="label" htmlFor="genres">Genres (comma-separated)</label>
              <input id="genres" name="genres" placeholder="Techno, Organic House" className="input-admin" />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <label className="label" htmlFor="blurb">Blurb</label>
              <textarea id="blurb" name="blurb" rows={3} className="input-admin" />
            </div>
            <div className="grid gap-1.5">
              <label className="label" htmlFor="tint">Poster tint</label>
              <select id="tint" name="tint" className="input-admin">
                {TINTS.map(([label, value]) => (
                  <option key={label} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" name="unlisted" className="accent-[--ember-500]" />
              Unlisted (invite-only)
            </label>
          </div>
        </section>

        <section className="card grid gap-3">
          <h2 className="label">Venue</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <label className="label" htmlFor="venueId">Existing</label>
              <select id="venueId" name="venueId" className="input-admin">
                <option value="">— create new below —</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} — {v.city}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <label className="label" htmlFor="newVenueName">New venue name</label>
              <input id="newVenueName" name="newVenueName" placeholder="Fort Manoel" className="input-admin" />
            </div>
            <div className="grid gap-1.5">
              <label className="label" htmlFor="newVenueCity">City</label>
              <input id="newVenueCity" name="newVenueCity" placeholder="Gżira" className="input-admin" />
            </div>
          </div>
        </section>

        <section className="card grid gap-3">
          <h2 className="label">Tiers (leave name blank to skip a row)</h2>
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_110px_110px_1fr_60px]">
              <input name="tierName" placeholder={["General Admission", "Early Bird", "VIP"][i]} className="input-admin" />
              <input name="tierPrice" placeholder="€45" className="input-admin" />
              <input name="tierCap" type="number" min={1} placeholder="cap" className="input-admin" />
              <input name="tierPerks" placeholder="perks, comma, separated" className="input-admin" />
              <label className="flex items-center justify-center gap-1 text-xs text-fog">
                <input type="checkbox" name="tierVip" value={String(i)} className="accent-[--gold-500]" />
                VIP
              </label>
            </div>
          ))}
        </section>

        <button className="btn-admin-primary justify-self-start">Create draft event</button>
      </form>
    </>
  );
}
