import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { commissionsAdminList, monthlyPayoutReport } from "@wii/api";
import { COMMISSION_LABELS, COMMISSION_STATUSES, type CommissionStatus } from "@wii/core";
import { requireStaff } from "@/lib/auth";
import { commissionBulkAction, runMaturityAction } from "../actions";

export const dynamic = "force-dynamic";
const eur = (c: number) => `€${(c / 100).toFixed(2)}`;
const TONE: Record<string, string> = { paid: "text-go", approved: "text-go", processing: "text-azure-300", payable: "text-gold", pending: "text-fog", rejected: "text-ember", clawed_back: "text-ember", void: "text-ash" };

export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: { status?: string; ambassador?: string; event?: string };
}) {
  await requireStaff();
  const d = db();

  const statusFilter =
    searchParams.status === "unpaid"
      ? (["payable", "approved", "processing"] as CommissionStatus[])
      : searchParams.status && COMMISSION_STATUSES.includes(searchParams.status as CommissionStatus)
        ? [searchParams.status as CommissionStatus]
        : undefined;

  const [rows, ambassadors, events, monthly] = await Promise.all([
    commissionsAdminList({
      statuses: statusFilter,
      ambassadorId: searchParams.ambassador || undefined,
      eventId: searchParams.event || undefined,
    }),
    d
      .select({ id: s.ambassadorProfiles.id, email: s.users.email, name: s.users.displayName })
      .from(s.ambassadorProfiles)
      .innerJoin(s.users, eq(s.ambassadorProfiles.userId, s.users.id)),
    d.select({ id: s.events.id, title: s.events.title }).from(s.events).orderBy(asc(s.events.startAt)),
    monthlyPayoutReport(6),
  ]);

  const totalShown = rows.reduce((n, r) => n + r.amountCents, 0);
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Malta", day: "2-digit", month: "short" });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Ambassador payouts</h1>
        <div className="flex gap-2">
          <form action={runMaturityAction}>
            <button className="btn-admin" title="pending → locked for commissions past their unlock date">
              Run maturity
            </button>
          </form>
          <a
            className="btn-admin"
            href={`/api/payouts-csv?status=${searchParams.status ?? ""}&ambassador=${searchParams.ambassador ?? ""}&event=${searchParams.event ?? ""}`}
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Filters */}
      <form className="mb-4 flex flex-wrap gap-2" action="/payouts" method="get">
        <select name="status" defaultValue={searchParams.status ?? ""} className="input-admin max-w-44">
          <option value="">All statuses</option>
          <option value="unpaid">Unpaid (locked+approved+processing)</option>
          {COMMISSION_STATUSES.map((st) => (
            <option key={st} value={st}>{COMMISSION_LABELS[st]}</option>
          ))}
        </select>
        <select name="ambassador" defaultValue={searchParams.ambassador ?? ""} className="input-admin max-w-56">
          <option value="">All ambassadors</option>
          {ambassadors.map((a) => (
            <option key={a.id} value={a.id}>{a.name ?? a.email}</option>
          ))}
        </select>
        <select name="event" defaultValue={searchParams.event ?? ""} className="input-admin max-w-56">
          <option value="">All events</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </select>
        <button className="btn-admin">Filter</button>
        <span className="label self-center">{rows.length} rows · {eur(totalShown)}</span>
      </form>

      {/* Queue with bulk ops */}
      <form action={commissionBulkAction} className="grid gap-3">
        <div className="card overflow-x-auto p-0">
          <table className="table-admin">
            <thead>
              <tr>
                <th></th><th>Ambassador</th><th>Event</th><th>Order</th><th>Status</th>
                <th className="text-right">Rate</th><th className="text-right">Amount</th><th className="text-right">Unlocks</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={8} className="text-fog">Nothing matches the filter.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><input type="checkbox" name="ids" value={r.id} className="accent-[--ember-500]" /></td>
                  <td>
                    <span className="font-semibold">{r.ambassadorName}</span>
                    <div className="font-mono text-xs text-ash">{r.ambassadorEmail}</div>
                  </td>
                  <td>{r.eventTitle}</td>
                  <td className="font-mono text-xs">{r.orderRef}</td>
                  <td><span className={`pill ${TONE[r.status] ?? ""}`}>{COMMISSION_LABELS[r.status as CommissionStatus] ?? r.status}</span></td>
                  <td className="text-right font-mono text-xs">{(r.rateBps / 100).toFixed(0)}%</td>
                  <td className="text-right font-mono">{eur(r.amountCents)}</td>
                  <td className="text-right font-mono text-xs text-fog">{fmt.format(r.payableAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card flex flex-wrap items-center gap-2">
          <span className="label">With selected:</span>
          <button name="op" value="approve" className="btn-admin">Approve</button>
          <button name="op" value="processing" className="btn-admin">Mark processing</button>
          <button name="op" value="reject" className="btn-admin border-ember/60 text-ember hover:bg-ember/10">Reject</button>
          <span className="mx-2 h-5 w-px bg-slate" />
          <input name="reference" placeholder="payment reference (bank/Revolut tx id)" className="input-admin max-w-72" />
          <button name="op" value="paid" className="btn-admin-primary">Mark paid → create payout</button>
        </div>
      </form>

      {/* Monthly report */}
      <section className="card mt-6 overflow-x-auto p-0">
        <div className="label px-4 pt-4">Monthly payout report — last 6 months</div>
        <table className="table-admin">
          <thead>
            <tr><th>Month</th><th>Ambassador</th><th className="text-right">Accrued</th><th className="text-right">Paid</th><th className="text-right">Unpaid</th></tr>
          </thead>
          <tbody>
            {monthly.length === 0 && <tr><td colSpan={5} className="text-fog">No commissions yet.</td></tr>}
            {monthly.map((m, i) => (
              <tr key={i}>
                <td className="font-mono text-xs">{m.month}</td>
                <td>{m.ambassadorName}</td>
                <td className="text-right font-mono">{eur(m.accruedCents)}</td>
                <td className="text-right font-mono text-go">{eur(m.paidCents)}</td>
                <td className="text-right font-mono text-gold">{eur(m.unpaidCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
