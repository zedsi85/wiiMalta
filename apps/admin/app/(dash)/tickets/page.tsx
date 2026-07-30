import Link from "next/link";
import { asc, desc, eq, ilike, or, inArray } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { requireStaff } from "@/lib/auth";
import { compTicketsAction, revokeTicketAction, unredeemTicketAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  await requireStaff();
  const d = db();
  const q = (searchParams.q ?? "").trim();

  // Search by serial or buyer email; default to most recent
  let ticketRows;
  if (q) {
    const users = await d
      .select({ id: s.users.id })
      .from(s.users)
      .where(ilike(s.users.email, `%${q}%`));
    ticketRows = await d
      .select()
      .from(s.tickets)
      .where(
        or(
          ilike(s.tickets.serial, `%${q}%`),
          users.length ? inArray(s.tickets.ownerUserId, users.map((u) => u.id)) : undefined
        )
      )
      .orderBy(desc(s.tickets.issuedAt))
      .limit(100);
  } else {
    ticketRows = await d.select().from(s.tickets).orderBy(desc(s.tickets.issuedAt)).limit(50);
  }

  const [events, tiers, owners] = await Promise.all([
    d.select({ id: s.events.id, title: s.events.title, status: s.events.status }).from(s.events),
    d.select().from(s.ticketTiers).orderBy(asc(s.ticketTiers.sort)),
    ticketRows.length
      ? d
          .select({ id: s.users.id, email: s.users.email })
          .from(s.users)
          .where(inArray(s.users.id, [...new Set(ticketRows.map((t) => t.ownerUserId))]))
      : Promise.resolve([]),
  ]);
  const eventTitle = new Map(events.map((e) => [e.id, e.title]));
  const tierName = new Map(tiers.map((t) => [t.id, t.name]));
  const ownerEmail = new Map(owners.map((o) => [o.id, o.email]));
  const publishedEvents = events.filter((e) => e.status === "published");

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Tickets</h1>
        <form className="flex gap-2" action="/tickets" method="get">
          <input
            name="q"
            defaultValue={q}
            placeholder="search serial or email…"
            className="input-admin w-72"
          />
          <button className="btn-admin">Search</button>
        </form>
      </div>

      <div className="grid gap-6">
        {/* Comp issuance */}
        <section className="card">
          <h2 className="label mb-4">Issue comp tickets (free of charge, consumes inventory)</h2>
          <form action={compTicketsAction} className="flex flex-wrap items-end gap-2">
            <select name="eventId" className="input-admin max-w-64" required>
              {publishedEvents.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
            <select name="tierId" className="input-admin max-w-56" required>
              {tiers
                .filter((t) => publishedEvents.some((e) => e.id === t.eventId))
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {eventTitle.get(t.eventId)?.slice(0, 18)} — {t.name}
                  </option>
                ))}
            </select>
            <input name="email" type="email" required placeholder="guest email" className="input-admin max-w-64" />
            <input name="qty" type="number" min={1} max={20} defaultValue={1} className="input-admin w-20" />
            <button className="btn-admin-primary">Issue comps</button>
          </form>
          <p className="mt-2 text-xs text-fog">
            The guest&apos;s tickets appear under Orders as a €0.00 paid order; every comp is audit-logged.
          </p>
        </section>

        {/* Results */}
        <section className="card overflow-x-auto p-0">
          <table className="table-admin">
            <thead>
              <tr>
                <th>Serial</th>
                <th>Event</th>
                <th>Tier</th>
                <th>Owner</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ticketRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-fog">
                    {q ? `Nothing matches "${q}".` : "No tickets yet."}
                  </td>
                </tr>
              )}
              {ticketRows.map((t) => (
                <tr key={t.id}>
                  <td className="font-mono font-semibold">{t.serial}</td>
                  <td>{eventTitle.get(t.eventId)}</td>
                  <td>{tierName.get(t.tierId)}</td>
                  <td className="text-fog">{ownerEmail.get(t.ownerUserId)}</td>
                  <td>
                    <span className={`pill ${t.status === "active" ? "text-go" : t.status === "redeemed" ? "text-azure-300" : "text-ash"}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="text-right">
                    {(t.status === "active" || t.status === "issued") && (
                      <form action={revokeTicketAction.bind(null, t.id)} className="inline-flex gap-2">
                        <input name="reason" placeholder="reason" className="input-admin max-w-36 py-1 text-xs" />
                        <button className="btn-admin border-ember/60 text-ember hover:bg-ember/10">Revoke</button>
                      </form>
                    )}
                    {t.status === "redeemed" && (
                      <form action={unredeemTicketAction.bind(null, t.id)} className="inline">
                        <button className="btn-admin">Un-redeem</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <p className="text-xs text-fog">
          Looking for a specific order? <Link className="underline hover:text-ember" href="/orders">Orders</Link> ·
          door check-in lives in <Link className="underline hover:text-ember" href="/scan">Scan</Link>.
        </p>
      </div>
    </>
  );
}
