import { desc, eq, inArray } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { signOrderKey } from "@wii/core";
import { ownedTickets } from "@wii/api";
import { MoodSetter } from "@/components/layout/MoodSetter";
import { Section } from "@/components/ui/Section";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { accountEmail } from "@/lib/account";
import { AccountLogin, LogoutButton, TransferControl } from "./client";

export const dynamic = "force-dynamic";

/** My Tickets — the buyer's wallet: orders, live tickets, transfers. */
export default async function AccountPage() {
  const email = accountEmail();

  if (!email) {
    return (
      <>
        <MoodSetter mood="community" />
        <Section max="var(--container-narrow)" style={{ paddingTop: "clamp(120px, 18vh, 200px)" }}>
          <SectionLabel style={{ marginBottom: 14 }}>My tickets</SectionLabel>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(2.25rem,6vw,4rem)", textTransform: "uppercase", letterSpacing: "-0.03em", lineHeight: 0.9, color: "var(--bone)" }}>
            Your nights,<br />in one place.
          </h1>
          <p style={{ marginTop: 16, color: "var(--sand)", maxWidth: "46ch", lineHeight: 1.6 }}>
            Enter the email you bought with — we&apos;ll send a sign-in code. No passwords, ever.
          </p>
          <AccountLogin />
        </Section>
      </>
    );
  }

  const d = db();
  const [orders, tickets] = await Promise.all([
    d
      .select({
        id: s.orders.id,
        status: s.orders.status,
        totalCents: s.orders.totalCents,
        paidAt: s.orders.paidAt,
        eventTitle: s.events.title,
      })
      .from(s.orders)
      .leftJoin(s.events, eq(s.orders.eventId, s.events.id))
      .where(
        eq(s.orders.email, email)
      )
      .orderBy(desc(s.orders.createdAt))
      .limit(50),
    ownedTickets(email),
  ]);
  const paidOrders = orders.filter((o) =>
    ["paid", "partially_refunded", "refunded"].includes(o.status)
  );
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Malta",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const liveTickets = tickets.filter((t) => t.status === "active");
  const pastTickets = tickets.filter((t) => t.status !== "active");

  return (
    <>
      <MoodSetter mood="community" />
      <Section max="var(--container)" style={{ paddingTop: "clamp(110px, 16vh, 180px)", paddingBottom: "var(--space-8)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
          <div>
            <SectionLabel style={{ marginBottom: 12 }}>My tickets</SectionLabel>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(2rem,5vw,3.25rem)", textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 0.92, color: "var(--bone)" }}>
              {email.split("@")[0]}
            </h1>
            <div style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-muted)" }}>{email}</div>
          </div>
          <LogoutButton />
        </div>

        {/* Live tickets */}
        <h2 style={{ marginTop: "var(--space-7)", fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ember-500)" }}>
          Upcoming · {liveTickets.length} ticket{liveTickets.length === 1 ? "" : "s"}
        </h2>
        {liveTickets.length === 0 && (
          <p style={{ marginTop: 14, color: "var(--text-muted)" }}>
            Nothing upcoming — the next drop is waiting on the events page.
          </p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "var(--grid-gap)", marginTop: 18 }}>
          {liveTickets.map((t) => (
            <div key={t.id} style={{ background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-lg)", padding: 20 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, textTransform: "uppercase", color: "var(--text-strong)" }}>
                {t.eventTitle}
              </div>
              <div style={{ marginTop: 6, fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {t.eventStartAt ? fmt.format(t.eventStartAt) : ""} · {t.tierName}
              </div>
              <div style={{ marginTop: 10, fontFamily: "var(--font-mono)", fontSize: "0.8125rem", fontWeight: 700, letterSpacing: "0.06em", color: "var(--sand)" }}>
                {t.serial}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
                {t.orderId && (
                  <a
                    className="btn btn-primary btn-sm"
                    href={`/orders/${t.orderId}?key=${signOrderKey(t.orderId, process.env.ORDER_LINK_SECRET!)}`}
                    data-cursor
                  >
                    Show QR
                  </a>
                )}
                <TransferControl ticketId={t.id} pendingTo={t.pendingTransferTo} eventStarted={t.eventStarted} />
              </div>
            </div>
          ))}
        </div>

        {/* Order history */}
        <h2 style={{ marginTop: "var(--space-8)", fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-faint)" }}>
          Order history
        </h2>
        <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
          {paidOrders.length === 0 && (
            <p style={{ color: "var(--text-muted)" }}>No orders yet.</p>
          )}
          {paidOrders.map((o) => (
            <a
              key={o.id}
              href={`/orders/${o.id}?key=${signOrderKey(o.id, process.env.ORDER_LINK_SECRET!)}`}
              data-cursor
              style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "14px 18px", background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-md)", color: "var(--text)" }}
            >
              <span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--ember-500)" }}>
                  {o.id.slice(0, 8).toUpperCase()}
                </span>
                {" · "}
                {o.eventTitle}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
                €{(o.totalCents / 100).toFixed(2)} · {o.status.replace("_", " ")}
              </span>
            </a>
          ))}
        </div>

        {pastTickets.length > 0 && (
          <p style={{ marginTop: 24, fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--text-faint)" }}>
            {pastTickets.length} past/transferred ticket{pastTickets.length === 1 ? "" : "s"} in your history.
          </p>
        )}
      </Section>
    </>
  );
}
