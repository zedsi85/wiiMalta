import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { verifyOrderKey } from "@wii/core";
import { MoodSetter } from "@/components/layout/MoodSetter";
import { Section } from "@/components/ui/Section";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { getOrderView } from "@wii/api";
import { PendingRefresher } from "./PendingRefresher";
import { QrRefresher } from "@/components/ui/QrRefresher";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { key?: string };
}) {
  if (!verifyOrderKey(params.id, searchParams.key ?? "", process.env.ORDER_LINK_SECRET!)) {
    notFound();
  }
  const view = await getOrderView(params.id);
  if (!view) notFound();

  const pending = view.status === "draft" || view.status === "pending_payment";
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Malta",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(view.event.startAt));

  const qrImages = new Map<string, string>();
  for (const t of view.tickets) {
    if (t.qrToken) {
      qrImages.set(
        t.id,
        await QRCode.toDataURL(t.qrToken, { margin: 1, width: 480, color: { dark: "#0b0b0e", light: "#fbf8f1" } })
      );
    }
  }

  return (
    <>
      <MoodSetter mood="community" />
      <Section max="var(--container)" style={{ paddingTop: "clamp(110px, 16vh, 190px)", paddingBottom: "var(--space-8)" }}>
        <SectionLabel style={{ marginBottom: 14 }}>
          Order {view.id.slice(0, 8).toUpperCase()} · {view.status.replace("_", " ")}
        </SectionLabel>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(2.25rem,6vw,4rem)", textTransform: "uppercase", letterSpacing: "-0.03em", lineHeight: 0.9, color: "var(--bone)" }}>
          {pending ? "Confirming…" : view.status === "paid" ? "You're in." : view.status === "expired" ? "Reservation lapsed" : "Order " + view.status}
        </h1>
        <p style={{ marginTop: 14, color: "var(--sand)", maxWidth: "52ch", lineHeight: 1.6 }}>
          {view.event.title} · {date} · {view.event.venue}
        </p>

        {pending && <PendingRefresher />}

        {view.status === "paid" && (
          <>
            <p style={{ marginTop: 10, fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-muted)" }}>
              {view.tickets.length} ticket{view.tickets.length === 1 ? "" : "s"} · sent to {view.email} ·
              keep this link private — it IS your ticket.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--grid-gap)", marginTop: 40 }}>
              {view.tickets.map((t) => (
                <div key={t.id} style={{ background: "var(--bone)", color: "var(--ink)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-lg)" }}>
                  <div style={{ padding: "18px 20px 10px" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.625rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ember-600)" }}>
                      Wii Event Malta · {t.tierName}
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.125rem", textTransform: "uppercase", letterSpacing: "-0.01em", marginTop: 4 }}>
                      {view.event.title}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", marginTop: 2, color: "var(--steel)" }}>
                      {date} · {view.event.venue}
                    </div>
                  </div>
                  {t.status === "active" && qrImages.get(t.id) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrImages.get(t.id)} alt={`QR for ${t.serial}`} style={{ width: "100%", display: "block", padding: "0 42px" }} />
                  ) : (
                    <div style={{ padding: "40px 20px", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--steel)" }}>
                      {t.status === "redeemed" ? "✓ Checked in" : t.status.toUpperCase()}
                    </div>
                  )}
                  <div style={{ padding: "10px 20px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", fontWeight: 700, letterSpacing: "0.06em" }}>{t.serial}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.625rem", textTransform: "uppercase", color: t.status === "active" ? "var(--go-600)" : "var(--steel)" }}>
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {view.tickets.some((t) => t.status === "active") ? (
              <QrRefresher />
            ) : (
              <p style={{ marginTop: 24, fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--text-faint)" }}>
                Screenshots won&apos;t scan at the door — open this page live.
              </p>
            )}
          </>
        )}

        <div style={{ display: "flex", gap: 14, marginTop: 40, flexWrap: "wrap" }}>
          <Button href="/events" variant="primary">Browse more events</Button>
          <Button href="/" variant="secondary">Back home</Button>
        </div>
      </Section>
    </>
  );
}
