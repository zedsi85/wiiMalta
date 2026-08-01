import QRCode from "qrcode";
import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { ambassadorDashboard } from "@wii/api";
import { requireAmbassador } from "@/lib/auth";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

/**
 * Printable ambassador flyer — A5, print-exact colors, built from the event
 * artwork system (poster tints). The Print/Download button uses the
 * browser's native print-to-PDF, so it works identically on phone and
 * desktop with no server-side PDF stack.
 */
export default async function FlyerPage({
  searchParams,
}: {
  searchParams: { event?: string };
}) {
  const ctx = await requireAmbassador();
  const dash = (await ambassadorDashboard(ctx.profileId))!;
  const code = dash.profile.code;
  const d = db();

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // Event-specific flyer or the general "all events" flyer
  let event: {
    title: string;
    dateLine: string;
    venue: string;
    tint: string;
    kind: string;
    slug: string | null;
  } | null = null;

  if (searchParams.event) {
    const ev = await d.query.events.findFirst({
      where: and(eq(s.events.slug, searchParams.event), eq(s.events.status, "published")),
    });
    if (ev) {
      const [content, venue] = await Promise.all([
        d.query.eventContent.findFirst({
          where: and(eq(s.eventContent.eventId, ev.id), eq(s.eventContent.isLive, true)),
        }),
        ev.venueId ? d.query.venues.findFirst({ where: eq(s.venues.id, ev.venueId) }) : null,
      ]);
      event = {
        title: ev.title,
        dateLine: new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/Malta",
          weekday: "long",
          day: "2-digit",
          month: "long",
        }).format(ev.startAt),
        venue: venue ? `${venue.name} — ${venue.city}` : "Venue TBA",
        tint: (content?.media as { tint?: string } | null)?.tint ?? "linear-gradient(150deg,#241318,#0a0a0c 72%)",
        kind: content?.kind ?? "Night",
        slug: ev.slug,
      };
    }
  }

  const link = code
    ? event?.slug
      ? `${site}/events/${event.slug}?ref=${code}`
      : `${site}/events?ref=${code}`
    : null;
  const qr = link
    ? await QRCode.toDataURL(link, {
        margin: 0,
        width: 900,
        errorCorrectionLevel: "H",
        color: { dark: "#0b0b0e", light: "#fbf8f1" },
      })
    : null;

  const tint = event?.tint ?? "linear-gradient(150deg,#3a1410,#120a18 72%)";
  const holder = ctx.displayName ?? ctx.email.split("@")[0];

  if (!code || !qr) {
    return (
      <main className="p-6">
        <p className="text-sm text-fog">
          You need a referral code before printing flyers — ask the Wii team.
        </p>
        <Link href="/ambassador/assets" className="btn-admin mt-4 inline-block">← Back to assets</Link>
      </main>
    );
  }

  return (
    <>
      {/* Screen chrome — hidden in print */}
      <div className="screen-only mx-auto flex max-w-md items-center justify-between gap-3 py-4">
        <Link href="/ambassador/assets" className="btn-admin text-xs">← Assets</Link>
        <PrintButton />
      </div>

      {/* The flyer — A5 portrait */}
      <div className="flyer">
        {/* Artwork zone */}
        <div className="flyer-art" style={{ background: `${tint}` }}>
          <div className="flyer-eyebrow">Wii Event Malta · {event?.kind ?? "Malta After Dark"}</div>
          <div className="flyer-title">{event?.title ?? "Malta\nAfter\nDark"}</div>
          {event ? (
            <div className="flyer-meta">
              {event.dateLine}
              <br />
              {event.venue}
            </div>
          ) : (
            <div className="flyer-meta">
              Curated nights across the island —<br />
              caves, forts, rooftops &amp; lagoons.
            </div>
          )}
          <div className="flyer-grain" aria-hidden="true" />
        </div>

        {/* QR zone */}
        <div className="flyer-qr-zone">
          <div className="flyer-qr-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={`Ticket QR — code ${code}`} className="flyer-qr" />
          </div>
          <div className="flyer-cta">
            <div className="flyer-scan">Scan for tickets</div>
            <div className="flyer-code">code: {code}</div>
            <div className="flyer-host">your plug on the inside — {holder}</div>
          </div>
        </div>

        <div className="flyer-footer">
          <span>wii-malta · connected after dark</span>
          <span>21+ · ID required</span>
        </div>
      </div>

      {/* Print + layout styles */}
      <style>{`
        .flyer {
          width: 148mm;
          height: 210mm;
          margin: 0 auto;
          background: #0b0b0e;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-radius: 6px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.65);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .flyer-art {
          position: relative;
          flex: 1.35;
          padding: 14mm 12mm 10mm;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }
        .flyer-eyebrow {
          font-family: 'Courier New', monospace;
          font-size: 8pt;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #ff4d1f;
          margin-bottom: 4mm;
        }
        .flyer-title {
          font-family: 'Arial Black', Arial, sans-serif;
          font-weight: 900;
          font-size: 34pt;
          line-height: 0.92;
          text-transform: uppercase;
          letter-spacing: -0.02em;
          color: #fbf8f1;
          white-space: pre-line;
          text-wrap: balance;
        }
        .flyer-meta {
          margin-top: 5mm;
          font-family: Arial, sans-serif;
          font-size: 10.5pt;
          line-height: 1.45;
          color: #efe7d6;
        }
        .flyer-grain {
          position: absolute; inset: 0; pointer-events: none;
          background-image: radial-gradient(rgba(255,255,255,0.05) 0.5px, transparent 0.5px);
          background-size: 3px 3px;
          mix-blend-mode: overlay;
        }
        .flyer-qr-zone {
          background: #fbf8f1;
          padding: 8mm 12mm;
          display: flex;
          align-items: center;
          gap: 8mm;
        }
        .flyer-qr-card { flex-shrink: 0; }
        .flyer-qr { width: 44mm; height: 44mm; display: block; }
        .flyer-scan {
          font-family: 'Arial Black', Arial, sans-serif;
          font-size: 16pt;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: -0.01em;
          color: #0b0b0e;
        }
        .flyer-code {
          margin-top: 2mm;
          font-family: 'Courier New', monospace;
          font-size: 11pt;
          font-weight: bold;
          letter-spacing: 0.12em;
          color: #ed3a0e;
          text-transform: uppercase;
        }
        .flyer-host {
          margin-top: 2mm;
          font-family: 'Courier New', monospace;
          font-size: 7.5pt;
          letter-spacing: 0.06em;
          color: #3a3a45;
        }
        .flyer-footer {
          background: #0b0b0e;
          padding: 4mm 12mm;
          display: flex;
          justify-content: space-between;
          font-family: 'Courier New', monospace;
          font-size: 7pt;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #9a9aa6;
        }
        @media screen and (max-width: 640px) {
          .flyer { transform: scale(0.62); transform-origin: top center; margin-bottom: -75mm; }
        }
        @media print {
          @page { size: A5 portrait; margin: 0; }
          body { background: #0b0b0e !important; }
          .screen-only, header, nav { display: none !important; }
          .flyer { border-radius: 0; box-shadow: none; margin: 0; transform: none; }
        }
      `}</style>
    </>
  );
}
