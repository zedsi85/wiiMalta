import Link from "next/link";
import { notFound } from "next/navigation";
import { eventAnalytics } from "@wii/api";
import { requireStaff } from "@/lib/auth";
import { StatTile } from "@/components/charts/StatTile";
import { Bars } from "@/components/charts/Bars";
import { HBars } from "@/components/charts/HBars";
import { LiveRefresher } from "@/components/charts/LiveRefresher";

export const dynamic = "force-dynamic";

const eur = (cents: number) =>
  new Intl.NumberFormat("en-MT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);

export default async function EventAnalyticsPage({ params }: { params: { id: string } }) {
  await requireStaff();
  const a = await eventAnalytics(params.id);
  if (!a) notFound();

  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Malta",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const pctSold = a.capacity ? Math.round((a.sold / a.capacity) * 100) : 0;

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/events" className="font-mono text-xs text-fog hover:text-ember">
              Events /
            </Link>
            <span className="pill">{a.status}</span>
            <LiveRefresher seconds={10} />
          </div>
          <h1 className="mt-1 text-2xl font-bold">{a.title}</h1>
          <div className="mt-1 font-mono text-xs text-fog">
            {fmt.format(a.startAt)} → {fmt.format(a.endAt)} · Europe/Malta
          </div>
        </div>
        <Link href={`/events/${a.eventId}`} className="btn-admin">
          Manage event →
        </Link>
      </div>

      {/* Row 1 — money */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Revenue (net)" value={eur(a.revenueNetCents)} sub={`gross ${eur(a.revenueGrossCents)}`} tone="go" />
        <StatTile label="Avg ticket price" value={eur(a.avgTicketPriceCents)} />
        <StatTile label="Referral revenue" value={eur(a.referral.attributedRevenueCents)} sub={`${a.referral.attributedOrders} orders · ${eur(a.referral.commissionCents)} commission`} />
        <StatTile label="Conversion rate" value={`${a.conversionRatePct}%`} sub={`${a.decidedOrders.paid} paid · ${a.decidedOrders.expired} expired · ${a.decidedOrders.cancelled} cancelled`} />
      </div>

      {/* Row 2 — inventory */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Capacity" value={String(a.capacity)} sub={`${pctSold}% sold`} />
        <StatTile label="Tickets sold" value={String(a.sold)} />
        <StatTile label="Reserved (in carts)" value={String(a.reserved)} tone={a.reserved > 0 ? "warn" : "default"} />
        <StatTile label="Remaining" value={String(a.remaining)} />
      </div>

      {/* Row 3 — door */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Current attendance" value={String(a.currentAttendance)} tone="go" sub={`of ${a.sold} sold`} />
        <StatTile label="Redeemed today" value={String(a.redeemedToday)} />
        <StatTile label="Check-in rate" value={`${a.checkInRatePct}%`} />
        <StatTile label="No-show rate" value={`${a.noShowRatePct}%`} sub={a.status === "completed" ? undefined : "final after event"} />
        <StatTile label="Refunded / Cancelled" value={`${a.ticketsRefunded} / ${a.ordersCancelled}`} sub="tickets / checkouts" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="label mb-4">Hourly entries — door scans</h2>
          <Bars data={a.hourlyEntries} format={(v) => `${v} in`} emptyText="No check-ins yet" />
        </section>
        <section className="card">
          <h2 className="label mb-4">Revenue by day — net, EUR</h2>
          <Bars data={a.revenueByDay} format={eur} emptyText="No paid orders yet" />
        </section>
        <section className="card">
          <h2 className="label mb-4">Revenue by tier — gross, EUR</h2>
          <HBars data={a.revenueByTier} format={eur} emptyText="No paid orders yet" />
        </section>
        <section className="card">
          <h2 className="label mb-4">Referrals</h2>
          {a.referral.topAmbassador ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="label !text-[0.5625rem]">Top ambassador</div>
                <div className="mt-1 text-xl font-bold">{a.referral.topAmbassador.name}</div>
                <div className="mt-0.5 font-mono text-xs text-fog">
                  {a.referral.topAmbassador.orders} attributed order
                  {a.referral.topAmbassador.orders === 1 ? "" : "s"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold tabular-nums text-go">
                  {eur(a.referral.topAmbassador.revenueCents)}
                </div>
                <div className="font-mono text-[0.6875rem] text-fog">attributed revenue</div>
              </div>
            </div>
          ) : (
            <div className="grid h-24 place-items-center font-mono text-xs text-ash">
              No attributed sales yet — share links with ?ref=CODE
            </div>
          )}
        </section>
      </div>

      <p className="mt-6 font-mono text-[0.6875rem] text-ash">
        Definitions: revenue is net of refunds · conversion counts decided checkouts only ·
        check-in = redeemed ÷ valid tickets · all times Europe/Malta.
      </p>
    </>
  );
}
