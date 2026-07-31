import QRCode from "qrcode";
import { ambassadorDashboard } from "@wii/api";
import { requireAmbassador } from "@/lib/auth";
import { StatTile } from "@/components/charts/StatTile";
import { Bars } from "@/components/charts/Bars";
import { AmbassadorNav } from "./nav";
import { CopyButton } from "./copy";

export const dynamic = "force-dynamic";

const eur = (c: number) => `€${(c / 100).toFixed(2)}`;

export default async function AmbassadorDashboardPage() {
  const ctx = await requireAmbassador();
  const d = (await ambassadorDashboard(ctx.profileId))!;

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const link = d.profile.code ? `${site}/events?ref=${d.profile.code}` : null;
  const qr = link
    ? await QRCode.toDataURL(link, { margin: 1, width: 360, color: { dark: "#fbf8f1", light: "#131318" } })
    : null;

  return (
    <>
      <AmbassadorNav name={ctx.displayName ?? ctx.email.split("@")[0]} />

      {ctx.status === "applied" && (
        <p className="mb-4 rounded-md border border-gold/40 bg-gold/10 p-3 text-sm text-gold">
          Your application is under review — stats activate once you&apos;re approved.
        </p>
      )}

      {/* Referral link + QR */}
      <section className="card mb-4 flex flex-wrap items-center gap-5">
        <div className="min-w-0 flex-1">
          <div className="label mb-2">Your referral link</div>
          {link ? (
            <>
              <div className="truncate rounded-md bg-graphite px-3 py-2 font-mono text-sm text-ember-300">
                {link}
              </div>
              <div className="mt-2 flex gap-2">
                <CopyButton text={link} />
                <span className="pill self-center">
                  {(d.profile.commissionBps / 100).toFixed(0)}% commission
                  {d.profile.fixedBonusCents > 0 ? ` + ${eur(d.profile.fixedBonusCents)}/order` : ""}
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-fog">No referral code yet — the Wii team assigns yours.</p>
          )}
        </div>
        {qr && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="Referral QR" className="h-28 w-28 rounded-md" />
        )}
      </section>

      {/* Performance */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Tickets sold" value={String(d.ticketsSold)} />
        <StatTile label="Revenue generated" value={eur(d.revenueNetCents)} tone="go" />
        <StatTile label="Visitors" value={String(d.visitors)} />
        <StatTile label="Conversion" value={`${d.conversionRatePct}%`} sub={`${d.attributedOrders} orders`} />
      </div>

      {/* Commission buckets */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Earned (all live)" value={eur(d.commission.earnedCents)} tone="go" />
        <StatTile label="Pending" value={eur(d.commission.pendingCents)} />
        <StatTile label="Locked" value={eur(d.commission.lockedCents)} />
        <StatTile label="Approved" value={eur(d.commission.approvedCents)} />
        <StatTile label="Paid" value={eur(d.commission.paidCents)} sub={d.commission.cancelledCents ? `${eur(d.commission.cancelledCents)} cancelled` : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="label mb-4">Monthly earnings — live commission, EUR</h2>
          <Bars data={d.monthlyEarnings} kind="eur" emptyText="No earnings yet — share your link" />
        </section>
        <section className="card">
          <h2 className="label mb-4">Standing</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="label !text-[0.5625rem]">Leaderboard</div>
              <div className="mt-1 text-3xl font-bold">
                #{d.leaderboard.position}
                <span className="text-base font-normal text-fog"> / {d.leaderboard.of}</span>
              </div>
            </div>
            <div>
              <div className="label !text-[0.5625rem]">Top performing event</div>
              {d.topEvent ? (
                <>
                  <div className="mt-1 text-lg font-bold">{d.topEvent.title}</div>
                  <div className="font-mono text-xs text-fog">
                    {eur(d.topEvent.revenueNetCents)} · {d.topEvent.orders} orders
                  </div>
                </>
              ) : (
                <div className="mt-1 text-sm text-fog">—</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
