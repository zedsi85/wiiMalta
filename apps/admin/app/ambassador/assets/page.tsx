import Link from "next/link";
import QRCode from "qrcode";
import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { ambassadorDashboard } from "@wii/api";
import { requireAmbassador } from "@/lib/auth";
import { AmbassadorNav } from "../nav";
import { CopyButton } from "../copy";

export const dynamic = "force-dynamic";

export default async function MarketingAssetsPage() {
  const ctx = await requireAmbassador();
  const d = (await ambassadorDashboard(ctx.profileId))!;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const code = d.profile.code;

  const events = await db()
    .select({ slug: s.events.slug, title: s.events.title })
    .from(s.events)
    .where(eq(s.events.status, "published"))
    .orderBy(asc(s.events.startAt));

  const generalLink = code ? `${site}/events?ref=${code}` : null;
  const qr = generalLink
    ? await QRCode.toDataURL(generalLink, { margin: 1, width: 720, color: { dark: "#0b0b0e", light: "#fbf8f1" } })
    : null;

  return (
    <>
      <AmbassadorNav name={ctx.displayName ?? ctx.email.split("@")[0]} />
      <h1 className="mb-4 text-xl font-bold">Marketing assets</h1>
      {!code ? (
        <p className="text-sm text-fog">You need a referral code first — ask the Wii team.</p>
      ) : (
        <div className="grid gap-4">
          <section className="card flex flex-wrap items-center gap-5">
            <div className="min-w-0 flex-1">
              <div className="label mb-2">High-res QR (print / stories)</div>
              <p className="text-xs text-fog">Long-press or right-click to save. Links to all events with your code attached.</p>
              <div className="mt-2"><CopyButton text={generalLink!} /></div>
            </div>
            {qr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="Referral QR" className="h-40 w-40 rounded-md" />
            )}
          </section>

          <section className="card">
            <div className="label mb-3">Printable flyers — A5, with your QR</div>
            <p className="mb-3 text-xs text-fog">
              Poster-style flyer built from the event artwork. Open → Print / save as PDF. Hand them
              out, pin them up — every scan is your referral.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/ambassador/flyer" className="btn-admin-primary text-xs">
                ★ General flyer
              </Link>
              {events.map((e) => (
                <Link key={e.slug} href={`/ambassador/flyer?event=${e.slug}`} className="btn-admin text-xs">
                  {e.title}
                </Link>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="label mb-3">Per-event links</div>
            <div className="grid gap-2">
              {events.map((e) => {
                const link = `${site}/events/${e.slug}?ref=${code}`;
                return (
                  <div key={e.slug} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{e.title}</div>
                      <div className="truncate font-mono text-xs text-fog">{link}</div>
                    </div>
                    <CopyButton text={link} label="Copy" />
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card">
            <div className="label mb-3">Caption starter</div>
            <p className="rounded-md bg-graphite p-3 text-sm text-sand">
              Malta after dark hits different 🌙🔥 Get your tickets with my link — see you on the floor.
              {" "}{generalLink}
            </p>
            <div className="mt-2">
              <CopyButton text={`Malta after dark hits different 🌙🔥 Get your tickets with my link — see you on the floor. ${generalLink}`} label="Copy caption" />
            </div>
          </section>
        </div>
      )}
    </>
  );
}
