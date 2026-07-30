import { ambassadorCommissions } from "@wii/api";
import { COMMISSION_LABELS, type CommissionStatus } from "@wii/core";
import { requireAmbassador } from "@/lib/auth";
import { AmbassadorNav } from "../nav";

export const dynamic = "force-dynamic";
const eur = (c: number) => `€${(c / 100).toFixed(2)}`;
const TONE: Record<string, string> = { paid: "text-go", approved: "text-go", processing: "text-azure-300", payable: "text-gold", pending: "text-fog", rejected: "text-ember", clawed_back: "text-ember", void: "text-ash" };

export default async function MyCommissionsPage() {
  const ctx = await requireAmbassador();
  const rows = await ambassadorCommissions(ctx.profileId);
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Malta", day: "2-digit", month: "short", year: "2-digit" });

  return (
    <>
      <AmbassadorNav name={ctx.displayName ?? ctx.email.split("@")[0]} />
      <h1 className="mb-1 text-xl font-bold">My commissions</h1>
      <p className="mb-4 text-xs text-fog">
        pending → locked (after the event) → approved → paid. Refunded orders cancel their commission.
      </p>
      <div className="card overflow-x-auto p-0">
        <table className="table-admin">
          <thead>
            <tr><th>Event</th><th>Rate</th><th>Status</th><th className="text-right">Amount</th><th className="text-right">Unlocks</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="text-fog">No commissions yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.eventTitle ?? "—"}</td>
                <td className="font-mono text-xs">{(r.rateBps / 100).toFixed(0)}%</td>
                <td><span className={`pill ${TONE[r.status] ?? ""}`}>{COMMISSION_LABELS[r.status as CommissionStatus] ?? r.status}</span></td>
                <td className="text-right font-mono">{eur(r.amountCents)}</td>
                <td className="text-right font-mono text-xs text-fog">{fmt.format(r.payableAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
