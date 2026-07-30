import { notFound } from "next/navigation";
import { asc, eq, inArray } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { requireStaff } from "@/lib/auth";
import { refundOrderAction, revokeTicketAction, unredeemTicketAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function OrderAdminPage({ params }: { params: { id: string } }) {
  await requireStaff();
  const d = db();

  const order = await d.query.orders.findFirst({ where: eq(s.orders.id, params.id) });
  if (!order) notFound();

  const [event, lines, payments, refunds] = await Promise.all([
    d.query.events.findFirst({ where: eq(s.events.id, order.eventId) }),
    d.select().from(s.orderLines).where(eq(s.orderLines.orderId, order.id)),
    d.select().from(s.payments).where(eq(s.payments.orderId, order.id)),
    d.select().from(s.refunds).where(eq(s.refunds.orderId, order.id)),
  ]);
  const tiers = lines.length
    ? await d.select().from(s.ticketTiers).where(inArray(s.ticketTiers.id, lines.map((l) => l.tierId)))
    : [];
  const tierName = new Map(tiers.map((t) => [t.id, t.name]));
  const tickets = lines.length
    ? await d
        .select()
        .from(s.tickets)
        .where(inArray(s.tickets.orderLineId, lines.map((l) => l.id)))
        .orderBy(asc(s.tickets.serial))
    : [];

  const refundable = order.status === "paid" || order.status === "partially_refunded";
  const refundWithId = refundOrderAction.bind(null, order.id);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Order <span className="font-mono">{order.id.slice(0, 8).toUpperCase()}</span>
        </h1>
        <div className="mt-1 text-sm text-fog">
          {event?.title} · {order.email} · <span className="pill">{order.status}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="label mb-4">Lines</h2>
          <table className="table-admin">
            <tbody>
              {lines.map((l) => (
                <tr key={l.id}>
                  <td>
                    {l.qty} × {tierName.get(l.tierId) ?? "Tier"}
                  </td>
                  <td className="text-right font-mono">€{(l.lineTotalCents / 100).toFixed(2)}</td>
                </tr>
              ))}
              <tr>
                <td className="font-semibold">Total</td>
                <td className="text-right font-mono font-semibold">
                  €{(order.totalCents / 100).toFixed(2)}
                </td>
              </tr>
              {order.refundedCents > 0 && (
                <tr>
                  <td className="text-ember">Refunded</td>
                  <td className="text-right font-mono text-ember">
                    −€{(order.refundedCents / 100).toFixed(2)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2 className="label mb-4">Payments</h2>
          {payments.length === 0 && <p className="text-sm text-fog">No payment attempts.</p>}
          {payments.map((p) => (
            <div key={p.id} className="mb-2 text-sm">
              <span className="pill mr-2">{p.provider}</span>
              <span className="font-mono text-xs">{p.providerOrderId}</span>
              <span className={`pill ml-2 ${p.status === "succeeded" ? "text-go" : "text-fog"}`}>
                {p.status}
              </span>
            </div>
          ))}
          {refunds.map((r) => (
            <div key={r.id} className="mb-2 text-sm text-ember-300">
              refund €{(r.amountCents / 100).toFixed(2)} — {r.reason}
            </div>
          ))}
          {refundable && (
            <form action={refundWithId} className="mt-4 flex gap-2">
              <input name="reason" required placeholder="refund reason (audited)" className="input-admin" />
              <button className="btn-admin border-ember/60 text-ember hover:bg-ember/10">
                Refund fully
              </button>
            </form>
          )}
        </section>

        <section className="card overflow-x-auto p-0 lg:col-span-2">
          <table className="table-admin">
            <thead>
              <tr>
                <th>Serial</th>
                <th>Tier</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-fog">
                    No tickets (order not paid yet).
                  </td>
                </tr>
              )}
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td className="font-mono font-semibold">{t.serial}</td>
                  <td>{tierName.get(t.tierId)}</td>
                  <td>
                    <span className={`pill ${t.status === "active" ? "text-go" : t.status === "redeemed" ? "text-azure-300" : "text-ash"}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="text-right">
                    {(t.status === "active" || t.status === "issued") && (
                      <form action={revokeTicketAction.bind(null, t.id)} className="inline-flex gap-2">
                        <input name="reason" placeholder="reason" className="input-admin max-w-40 py-1 text-xs" />
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
      </div>
    </>
  );
}
