import { notFound } from "next/navigation";
import { eq, and, asc, sql } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { requireStaff } from "@/lib/auth";
import { publishEvent, cancelEvent, updateEventBasics } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EventAdminPage({ params }: { params: { id: string } }) {
  await requireStaff();
  const d = db();

  const ev = await d.query.events.findFirst({ where: eq(s.events.id, params.id) });
  if (!ev) notFound();

  const [content, tiers, pools, phases] = await Promise.all([
    d.query.eventContent.findFirst({
      where: and(eq(s.eventContent.eventId, ev.id), eq(s.eventContent.isLive, true)),
    }),
    d.select().from(s.ticketTiers).where(eq(s.ticketTiers.eventId, ev.id)).orderBy(asc(s.ticketTiers.sort)),
    d.select().from(s.inventoryPools).where(eq(s.inventoryPools.eventId, ev.id)),
    d
      .select()
      .from(s.pricePhases)
      .where(
        sql`${s.pricePhases.tierId} in (select id from ${s.ticketTiers} where ${s.ticketTiers.eventId} = ${ev.id})`
      ),
  ]);

  const poolByTier = new Map(pools.filter((p) => p.tierId).map((p) => [p.tierId!, p]));
  const phaseByTier = new Map(phases.map((p) => [p.tierId, p]));
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Malta",
    dateStyle: "full",
    timeStyle: "short",
  });

  const publishWithId = publishEvent.bind(null, ev.id);
  const cancelWithId = cancelEvent.bind(null, ev.id);
  const updateWithId = updateEventBasics.bind(null, ev.id);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{ev.title}</h1>
          <div className="font-mono text-xs text-ash">
            /{ev.slug} · <span className="pill">{ev.status}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {ev.status === "draft" && (
            <form action={publishWithId}>
              <button className="btn-admin-primary">Publish</button>
            </form>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="label mb-4">Details</h2>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-fog">Starts</dt>
              <dd>{fmt.format(ev.startAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fog">Ends</dt>
              <dd>{fmt.format(ev.endAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fog">Currency</dt>
              <dd>{ev.currency}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fog">Age</dt>
              <dd>{ev.ageRestriction ? `${ev.ageRestriction}+` : "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fog">Visibility</dt>
              <dd>{ev.isUnlisted ? "Unlisted (invite)" : "Public"}</dd>
            </div>
          </dl>
        </section>

        <section className="card">
          <h2 className="label mb-4">Edit basics</h2>
          <form action={updateWithId} className="grid gap-3">
            <label className="label" htmlFor="title">
              Title
            </label>
            <input id="title" name="title" defaultValue={ev.title} className="input-admin" required />
            <label className="label" htmlFor="blurb">
              Blurb (live content)
            </label>
            <textarea
              id="blurb"
              name="blurb"
              defaultValue={content?.blurb ?? ""}
              rows={3}
              className="input-admin"
            />
            <button className="btn-admin justify-self-start">Save</button>
          </form>
        </section>

        <section className="card lg:col-span-2">
          <h2 className="label mb-4">Tiers & inventory</h2>
          <table className="table-admin">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Phase</th>
                <th className="text-right">Price</th>
                <th>Status</th>
                <th className="text-right">Sold</th>
                <th className="text-right">Held</th>
                <th className="text-right">Capacity</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((t) => {
                const pool = poolByTier.get(t.id);
                const phase = phaseByTier.get(t.id);
                return (
                  <tr key={t.id}>
                    <td className="font-semibold">
                      {t.name}
                      {t.isVip && <span className="pill ml-2 text-gold">VIP</span>}
                    </td>
                    <td className="text-fog">{phase?.name ?? "—"}</td>
                    <td className="text-right font-mono">
                      {phase ? `€${(phase.priceCents / 100).toFixed(2)}` : "—"}
                    </td>
                    <td>
                      <span className="pill">{t.status}</span>
                    </td>
                    <td className="text-right font-mono">{pool?.soldCount ?? 0}</td>
                    <td className="text-right font-mono">{pool?.heldCount ?? 0}</td>
                    <td className="text-right font-mono">{pool?.capacity ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {ev.status === "published" && (
          <section className="card border-ember/40 lg:col-span-2">
            <h2 className="label mb-2 text-ember">Danger zone</h2>
            <p className="mb-3 text-sm text-fog">
              Cancelling notifies nothing yet (Phase 2 wires mass refunds + revocations). Type{" "}
              <code className="font-mono text-ember-300">{ev.slug}</code> to confirm.
            </p>
            <form action={cancelWithId} className="flex gap-2">
              <input name="confirm" placeholder={ev.slug} className="input-admin max-w-56" />
              <button className="btn-admin border-ember/60 text-ember hover:bg-ember/10">
                Cancel event
              </button>
            </form>
          </section>
        )}
      </div>
    </>
  );
}
