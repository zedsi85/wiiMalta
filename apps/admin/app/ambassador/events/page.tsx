import { ambassadorEvents } from "@wii/api";
import { requireAmbassador } from "@/lib/auth";
import { AmbassadorNav } from "../nav";

export const dynamic = "force-dynamic";
const eur = (c: number) => `€${(c / 100).toFixed(2)}`;

export default async function MyEventsPage() {
  const ctx = await requireAmbassador();
  const rows = await ambassadorEvents(ctx.profileId);
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Malta", day: "2-digit", month: "short", year: "numeric" });

  return (
    <>
      <AmbassadorNav name={ctx.displayName ?? ctx.email.split("@")[0]} />
      <h1 className="mb-4 text-xl font-bold">My events</h1>
      <div className="card overflow-x-auto p-0">
        <table className="table-admin">
          <thead>
            <tr><th>Event</th><th>Date</th><th className="text-right">Orders</th><th className="text-right">Revenue</th><th className="text-right">My commission</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="text-fog">No attributed sales yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.eventId}>
                <td className="font-semibold">{r.title}</td>
                <td className="font-mono text-xs text-fog">{fmt.format(r.startAt)}</td>
                <td className="text-right font-mono">{r.orders}</td>
                <td className="text-right font-mono">{eur(r.net)}</td>
                <td className="text-right font-mono text-go">{eur(r.commission)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
