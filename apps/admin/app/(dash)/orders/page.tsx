import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { requireStaff } from "@/lib/auth";
import { sweepOrdersAction } from "../actions";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  paid: "text-go",
  pending_payment: "text-gold",
  draft: "text-fog",
  refunded: "text-ember",
  partially_refunded: "text-ember-300",
  expired: "text-ash",
  cancelled: "text-ash",
};

export default async function OrdersPage() {
  await requireStaff();
  const d = db();

  const rows = await d
    .select({
      id: s.orders.id,
      email: s.orders.email,
      status: s.orders.status,
      totalCents: s.orders.totalCents,
      currency: s.orders.currency,
      createdAt: s.orders.createdAt,
      eventTitle: s.events.title,
    })
    .from(s.orders)
    .leftJoin(s.events, eq(s.orders.eventId, s.events.id))
    .orderBy(desc(s.orders.createdAt))
    .limit(100);

  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Malta",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="flex flex-wrap items-center gap-3">
          <span className="label">last {rows.length}</span>
          <form action={sweepOrdersAction}>
            <button className="btn-admin" title="Expire overdue draft/pending orders and release their holds">
              Run expiry sweep
            </button>
          </form>
        </div>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="table-admin">
          <thead>
            <tr>
              <th>Order</th>
              <th>Event</th>
              <th>Buyer</th>
              <th>Status</th>
              <th className="text-right">Total</th>
              <th className="text-right">Created (Malta)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-fog">
                  No orders yet — buy something on the site.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-graphite/50">
                <td>
                  <Link href={`/orders/${r.id}`} className="font-mono font-semibold hover:text-ember">
                    {r.id.slice(0, 8).toUpperCase()}
                  </Link>
                </td>
                <td>{r.eventTitle ?? "—"}</td>
                <td className="text-fog">{r.email}</td>
                <td>
                  <span className={`pill ${STATUS_COLOR[r.status] ?? ""}`}>{r.status}</span>
                </td>
                <td className="text-right font-mono">€{(r.totalCents / 100).toFixed(2)}</td>
                <td className="text-right font-mono text-xs text-fog">{fmt.format(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
