import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { verifyTicketKey, mintQrToken } from "@wii/core";
import { ticketView } from "@wii/api";
import { MoodSetter } from "@/components/layout/MoodSetter";
import { Section } from "@/components/ui/Section";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { QrRefresher } from "@/components/ui/QrRefresher";

export const dynamic = "force-dynamic";

/** Single-ticket wallet view — used by transfer recipients; never exposes the order. */
export default async function TicketPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { k?: string };
}) {
  if (!verifyTicketKey(params.id, searchParams.k ?? "", process.env.ORDER_LINK_SECRET!)) notFound();
  const t = await ticketView(params.id);
  if (!t) notFound();

  const date = t.eventStartAt
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Malta",
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(t.eventStartAt)
    : "";
  const qr =
    t.status === "active"
      ? await QRCode.toDataURL(
          mintQrToken(
            { ticketId: t.id, qrVersion: t.qrVersion, exp: Date.now() + 5 * 60_000 },
            process.env.QR_SIGNING_SECRET!
          ),
          { margin: 1, width: 480, color: { dark: "#0b0b0e", light: "#fbf8f1" } }
        )
      : null;

  return (
    <>
      <MoodSetter mood="community" />
      <Section max="var(--container-narrow)" style={{ paddingTop: "clamp(110px, 16vh, 190px)", textAlign: "center" }}>
        <SectionLabel style={{ marginBottom: 14 }}>Your ticket</SectionLabel>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(2rem,6vw,3.5rem)", textTransform: "uppercase", letterSpacing: "-0.03em", lineHeight: 0.9, color: "var(--bone)" }}>
          {t.eventTitle}
        </h1>
        <p style={{ marginTop: 12, fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-muted)" }}>
          {date} · {t.venue} · {t.tierName}
        </p>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
          <div style={{ background: "var(--bone)", color: "var(--ink)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-lg)", width: "min(320px, 90vw)" }}>
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt={`QR for ${t.serial}`} style={{ width: "100%", display: "block", padding: "24px 32px 8px" }} />
            ) : (
              <div style={{ padding: "48px 20px", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--steel)" }}>
                {t.status === "redeemed" ? "✓ Checked in" : t.status.toUpperCase()}
              </div>
            )}
            <div style={{ padding: "6px 20px 20px", fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 700, letterSpacing: "0.06em" }}>
              {t.serial}
            </div>
          </div>
        </div>
        {t.status === "active" ? (
          <QrRefresher />
        ) : (
          <p style={{ marginTop: 18, fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--text-faint)" }}>
            Screenshots won&apos;t scan at the door — open this page live.
          </p>
        )}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 28 }}>
          <Button href="/events" variant="secondary">Browse events</Button>
          <Button href="/account" variant="primary">My tickets</Button>
        </div>
      </Section>
    </>
  );
}
