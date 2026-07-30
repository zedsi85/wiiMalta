import { ambassadorSales } from "@wii/api";
import { requireAmbassador } from "@/lib/auth";
import { AmbassadorNav } from "../nav";

export const dynamic = "force-dynamic";
const eur = (c: number) => `€${(c / 100).toFixed(2)}`;

export default async function MySalesPage() {
  const ctx = await requireAmbassador();
  const rows = await ambassadorSales(ctx.profileId);
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Malta", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <AmbassadorNav name={ctx.displayName ?? ctx.email.split("@")[0]} />
      <h1 className="mb-4 text-xl font-bold">My sales</h1>
      <div className="card overflow-x-auto p-0">
        <table className="table-admin">
          <thead>
            <tr><th>Order</th><th>Event</th><th>Buyer</th><th>Status</th><th className="text-right">Net</th><th className="text-right">When</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="text-fog">No sales yet — share your link.</td></tr>}
            {rows.map((r) => (
              <tr key={r.orderId}>
                <td className="font-mono text-xs">{r.orderRef}</td>
                <td>{r.eventTitle}</td>
                <td className="font-mono text-xs text-fog">{r.email}</td>
                <td><span className={`pill ${r.status === "paid" ? "text-go" : r.status.includes("refund") ? "text-ember" : "text-fog"}`}>{r.status}</span></td>
                <td className="text-right font-mono">{eur(r.netCents)}</td>
                <td className="text-right font-mono text-xs text-fog">{r.paidAt ? fmt.format(r.paidAt) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
