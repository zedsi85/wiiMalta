import Link from "next/link";
import { asc, sql, eq } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  draft: "text-fog",
  published: "text-go",
  cancelled: "text-ember",
  completed: "text-azure-300",
  archived: "text-ash",
};

export default async function EventsPage() {
  await requireStaff();
  const d = db();

  const rows = await d
    .select({
      id: s.events.id,
      slug: s.events.slug,
      title: s.events.title,
      status: s.events.status,
      startAt: s.events.startAt,
      venue: s.venues.name,
      city: s.venues.city,
      sold: sql<number>`coalesce(sum(${s.inventoryPools.soldCount}),0)::int`,
      capacity: sql<number>`coalesce(sum(${s.inventoryPools.capacity}),0)::int`,
    })
    .from(s.events)
    .leftJoin(s.venues, eq(s.events.venueId, s.venues.id))
    .leftJoin(
      s.inventoryPools,
      sql`${s.inventoryPools.eventId} = ${s.events.id} and ${s.inventoryPools.tierId} is not null`
    )
    .groupBy(s.events.id, s.venues.name, s.venues.city)
    .orderBy(asc(s.events.startAt));

  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Malta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events</h1>
        <div className="flex items-center gap-4">
          <span className="label">{rows.length} total</span>
          <Link href="/events/new" className="btn-admin-primary">
            + New event
          </Link>
        </div>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="table-admin">
          <thead>
            <tr>
              <th>Event</th>
              <th>Date (Malta)</th>
              <th>Venue</th>
              <th>Status</th>
              <th className="text-right">Sold / Cap</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-graphite/50">
                <td>
                  <Link href={`/events/${r.id}`} className="font-semibold hover:text-ember">
                    {r.title}
                  </Link>
                  <div className="font-mono text-xs text-ash">/{r.slug}</div>
                </td>
                <td className="whitespace-nowrap">{fmt.format(r.startAt)}</td>
                <td>
                  {r.venue ?? "TBA"}
                  {r.city ? <span className="text-fog"> — {r.city}</span> : null}
                </td>
                <td>
                  <span className={`pill ${STATUS_COLOR[r.status] ?? ""}`}>{r.status}</span>
                </td>
                <td className="text-right font-mono">
                  {r.sold} / {r.capacity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
