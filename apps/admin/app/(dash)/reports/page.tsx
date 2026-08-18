import { ambassadorReport, eventReferralReport } from "@wii/api";
import { requireStaff } from "@/lib/auth";
import { HBars } from "@/components/charts/HBars";

export const dynamic = "force-dynamic";
const eur = (c: number) => `€${(c / 100).toFixed(2)}`;

export default async function ReportsPage() {
  await requireStaff();
  const [ambassadors, events] = await Promise.all([ambassadorReport(), eventReferralReport()]);
  const avgConversion = ambassadors.length
    ? Math.round(ambassadors.reduce((n, a) => n + a.conversionPct, 0) / ambassadors.length)
    : 0;
  const totalUnpaid = ambassadors.reduce((n, a) => n + a.unpaid, 0);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Referral reports</h1>
        <span className="label">
          avg conversion {avgConversion}% · unpaid balance {eur(totalUnpaid)}
        </span>
      </div>

      <div className="grid gap-6">
        <section className="card">
          <h2 className="label mb-4">Top ambassadors — attributed net revenue</h2>
          <HBars
            data={ambassadors.filter((a) => a.revenueNet > 0).slice(0, 8).map((a) => ({ label: a.name, value: a.revenueNet }))}
            kind="eur"
            emptyText="No attributed revenue yet"
          />
        </section>

        <section className="card overflow-x-auto p-0">
          <div className="label px-4 pt-4">Ambassador performance & ROI</div>
          <table className="table-admin">
            <thead>
              <tr>
                <th>Ambassador</th><th>Status</th>
                <th className="text-right">Visits</th><th className="text-right">Orders</th>
                <th className="text-right">Conv.</th><th className="text-right">Revenue</th>
                <th className="text-right">Commission</th><th className="text-right">Unpaid</th>
                <th className="text-right">ROI×</th>
              </tr>
            </thead>
            <tbody>
              {ambassadors.map((a) => (
                <tr key={a.ambassadorId}>
                  <td>
                    <span className="font-semibold">{a.name}</span>
                    <div className="font-mono text-xs text-ash">{a.email}</div>
                  </td>
                  <td><span className="pill">{a.status}</span></td>
                  <td className="text-right font-mono">{a.visits}</td>
                  <td className="text-right font-mono">{a.orders}</td>
                  <td className="text-right font-mono">{a.conversionPct}%</td>
                  <td className="text-right font-mono">{eur(a.revenueNet)}</td>
                  <td className="text-right font-mono">{eur(a.commissionLive)}</td>
                  <td className="text-right font-mono text-gold">{eur(a.unpaid)}</td>
                  <td className="text-right font-mono">{a.roi ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card overflow-x-auto p-0">
          <div className="label px-4 pt-4">Event referral report</div>
          <table className="table-admin">
            <thead>
              <tr><th>Event</th><th className="text-right">Attributed orders</th><th className="text-right">Attributed revenue</th><th className="text-right">Commission cost</th></tr>
            </thead>
            <tbody>
              {events.length === 0 && <tr><td colSpan={4} className="text-fog">No attributed sales yet.</td></tr>}
              {events.map((e) => (
                <tr key={e.eventTitle}>
                  <td className="font-semibold">{e.eventTitle}</td>
                  <td className="text-right font-mono">{e.attributedOrders}</td>
                  <td className="text-right font-mono">{eur(e.attributedNet)}</td>
                  <td className="text-right font-mono">{eur(e.commission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
