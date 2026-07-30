import { ambassadorPayouts } from "@wii/api";
import { requireAmbassador } from "@/lib/auth";
import { AmbassadorNav } from "../nav";

export const dynamic = "force-dynamic";
const eur = (c: number) => `€${(c / 100).toFixed(2)}`;

export default async function PayoutHistoryPage() {
  const ctx = await requireAmbassador();
  const rows = await ambassadorPayouts(ctx.profileId);
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Malta", day: "2-digit", month: "short", year: "numeric" });

  return (
    <>
      <AmbassadorNav name={ctx.displayName ?? ctx.email.split("@")[0]} />
      <h1 className="mb-4 text-xl font-bold">Payout history</h1>
      <div className="card overflow-x-auto p-0">
        <table className="table-admin">
          <thead>
            <tr><th>Date</th><th>Method</th><th>Reference</th><th>Status</th><th className="text-right">Amount</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="text-fog">No payouts yet — commissions unlock after each event.</td></tr>}
            {rows.map((p) => (
              <tr key={p.id}>
                <td className="font-mono text-xs">{p.paidAt ? fmt.format(p.paidAt) : fmt.format(p.createdAt)}</td>
                <td>{p.method}</td>
                <td className="font-mono text-xs text-fog">{p.reference ?? "—"}</td>
                <td><span className={`pill ${p.status === "paid" ? "text-go" : "text-fog"}`}>{p.status}</span></td>
                <td className="text-right font-mono text-go">{eur(p.totalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
