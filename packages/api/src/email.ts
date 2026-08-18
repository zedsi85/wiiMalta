import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { signOrderKey } from "@wii/core";

/**
 * Transactional email — ticket delivery. Provider: Brevo HTTP API
 * (BREVO_API_KEY, `xkeysib-…`). Without a key, falls back to "log" mode so
 * local flows never break (the rendered HTML lands in server logs).
 *
 * Design: 600px table layout, inline styles only (Gmail/Outlook-safe).
 * The email deliberately links to the LIVE ticket page instead of embedding
 * final QR codes — our QR tokens are short-lived and rotate on revocation,
 * so a static image in an email would die in minutes. The button IS the
 * wallet, matching the platform's security model.
 */

const BRAND = {
  void: "#0b0b0e",
  charcoal: "#131318",
  ember: "#ff4d1f",
  bone: "#fbf8f1",
  sand: "#efe7d6",
  ink: "#0b0b0e",
  steel: "#3a3a45",
  fog: "#9a9aa6",
};

export interface OrderEmailData {
  orderRef: string;
  email: string;
  eventTitle: string;
  dateLine: string;
  venue: string;
  tickets: { serial: string; tierName: string }[];
  totalLine: string;
  ticketUrl: string;
  isComp: boolean;
}

export function renderOrderEmail(data: OrderEmailData): { html: string; text: string; subject: string } {
  const subject = data.isComp
    ? `Your guest tickets — ${data.eventTitle}`
    : `You're in — ${data.eventTitle}`;
  const preheader = `${data.tickets.length} ticket${data.tickets.length === 1 ? "" : "s"} · ${data.dateLine} · ${data.venue}`;

  const ticketRows = data.tickets
    .map(
      (t) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e8e2d4;font-family:'Courier New',monospace;font-size:14px;font-weight:bold;color:${BRAND.ink};letter-spacing:1px;">${t.serial}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e8e2d4;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${BRAND.steel};text-align:right;">${t.tierName}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#0b0b0e;">
  <div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.void};">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="padding:8px 8px 24px;">
          <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:${BRAND.ember};text-transform:uppercase;">Wii Event Malta</div>
          <div style="font-family:Arial Black,Arial,Helvetica,sans-serif;font-size:34px;font-weight:900;color:${BRAND.bone};text-transform:uppercase;letter-spacing:-1px;line-height:1;margin-top:8px;">
            ${data.isComp ? "Guest list." : "You're in."}
          </div>
        </td></tr>

        <!-- Event card -->
        <tr><td style="background-color:${BRAND.bone};border-radius:14px;padding:28px;">
          <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:${BRAND.ember};text-transform:uppercase;">Your night</div>
          <div style="font-family:Arial Black,Arial,Helvetica,sans-serif;font-size:24px;font-weight:900;color:${BRAND.ink};text-transform:uppercase;margin-top:6px;">${data.eventTitle}</div>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.steel};margin-top:8px;line-height:1.5;">
            ${data.dateLine}<br>${data.venue}
          </div>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-top:2px solid ${BRAND.ink};">
            ${ticketRows}
            <tr>
              <td style="padding:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${BRAND.steel};">Total</td>
              <td style="padding:12px 0 0;font-family:'Courier New',monospace;font-size:16px;font-weight:bold;color:${BRAND.ink};text-align:right;">${data.totalLine}</td>
            </tr>
          </table>

          <!-- CTA -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px;">
            <tr><td align="center" style="border-radius:10px;background-color:${BRAND.ember};">
              <a href="${data.ticketUrl}" style="display:block;padding:16px 24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:${BRAND.void};text-decoration:none;text-transform:uppercase;letter-spacing:1px;">
                Open my tickets &amp; QR →
              </a>
            </td></tr>
          </table>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${BRAND.steel};margin-top:14px;line-height:1.5;">
            Show the QR from that page at the door — it refreshes automatically, so screenshots won't scan.
            This link is your ticket: don't forward it.
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 8px 8px;">
          <div style="font-family:'Courier New',monospace;font-size:11px;color:${BRAND.fog};line-height:1.7;">
            Order ${data.orderRef} · sent to ${data.email}<br>
            Wii Event Malta — Malta After Dark<br>
            Questions? Reply to this email.
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    data.isComp ? "GUEST LIST — Wii Event Malta" : "YOU'RE IN — Wii Event Malta",
    "",
    data.eventTitle,
    data.dateLine,
    data.venue,
    "",
    ...data.tickets.map((t) => `  ${t.serial}  —  ${t.tierName}`),
    `  Total: ${data.totalLine}`,
    "",
    `Your tickets & QR: ${data.ticketUrl}`,
    "",
    "Show the QR from that page at the door — it refreshes automatically, so",
    "screenshots won't scan. This link is your ticket: don't forward it.",
    "",
    `Order ${data.orderRef}`,
  ].join("\n");

  return { html, text, subject };
}

async function deliver(to: string, subject: string, html: string, text: string): Promise<{ provider: string; id?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.EMAIL_FROM ?? "zedsi85@gmail.com";
  const fromName = process.env.EMAIL_FROM_NAME ?? "Wii Event Malta";

  if (!apiKey) {
    console.log(`[email:log-mode] to=${to} subject="${subject}" (BREVO_API_KEY not set — not sent)`);
    return { provider: "log" };
  }
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { email: fromEmail, name: fromName },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { messageId?: string };
  if (!res.ok) throw new Error(`Brevo send failed (${res.status}): ${JSON.stringify(json).slice(0, 200)}`);
  return { provider: "brevo", id: json.messageId };
}

/** Send (or resend) the ticket email for a paid order. Never throws into payment flows. */
export async function sendOrderTickets(orderId: string): Promise<{ sent: boolean; provider?: string; error?: string }> {
  try {
    const d = db();
    const order = await d.query.orders.findFirst({ where: eq(s.orders.id, orderId) });
    if (!order || (order.status !== "paid" && order.status !== "partially_refunded")) {
      return { sent: false, error: "order not in a deliverable state" };
    }
    const [event, lines] = await Promise.all([
      d.query.events.findFirst({ where: eq(s.events.id, order.eventId) }),
      d.select().from(s.orderLines).where(eq(s.orderLines.orderId, order.id)),
    ]);
    const venue = event?.venueId
      ? await d.query.venues.findFirst({ where: eq(s.venues.id, event.venueId) })
      : undefined;
    const tiers = lines.length
      ? await d.select().from(s.ticketTiers).where(inArray(s.ticketTiers.id, lines.map((l) => l.tierId)))
      : [];
    const tierName = new Map(tiers.map((t) => [t.id, t.name]));
    const tickets = lines.length
      ? await d
          .select()
          .from(s.tickets)
          .where(inArray(s.tickets.orderLineId, lines.map((l) => l.id)))
          .orderBy(asc(s.tickets.serial))
      : [];
    const live = tickets.filter((t) => t.status === "active" || t.status === "issued" || t.status === "redeemed");
    if (live.length === 0) return { sent: false, error: "no live tickets on order" };

    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const key = signOrderKey(order.id, process.env.ORDER_LINK_SECRET!);
    const dateLine = event
      ? new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/Malta",
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        }).format(event.startAt)
      : "";

    const { html, text, subject } = renderOrderEmail({
      orderRef: order.id.slice(0, 8).toUpperCase(),
      email: order.email,
      eventTitle: event?.title ?? "Wii Event",
      dateLine,
      venue: venue ? `${venue.name} — ${venue.city}` : "Venue TBA",
      tickets: live.map((t) => ({ serial: t.serial, tierName: tierName.get(t.tierId) ?? "Ticket" })),
      totalLine: order.totalCents === 0 ? "Complimentary" : `€${(order.totalCents / 100).toFixed(2)}`,
      ticketUrl: `${site}/orders/${order.id}?key=${key}`,
      isComp: order.totalCents === 0,
    });

    const result = await deliver(order.email, subject, html, text);
    await d.insert(s.auditLog).values({
      action: "order.tickets_emailed",
      entityType: "order",
      entityId: order.id,
      before: null,
      after: { to: order.email, provider: result.provider, messageId: result.id ?? null },
    });
    return { sent: result.provider !== "log", provider: result.provider };
  } catch (e) {
    console.error("[email] sendOrderTickets failed:", e);
    return { sent: false, error: (e as Error).message };
  }
}

/* ---------------- Login code email (PWA-friendly OTP) ---------------- */

export function renderLoginCodeEmail(code: string, portalLabel: string): {
  html: string;
  text: string;
  subject: string;
} {
  const subject = `${code} — your Wii ${portalLabel} code`;
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;background:#0b0b0e;padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="440" cellpadding="0" cellspacing="0" style="max-width:440px;width:100%;">
      <tr><td style="padding-bottom:18px;">
        <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#ff4d1f;text-transform:uppercase;">Wii Event Malta</div>
        <div style="font-family:Arial Black,Arial,sans-serif;font-size:24px;font-weight:900;color:#fbf8f1;text-transform:uppercase;margin-top:6px;">Your sign-in code</div>
      </td></tr>
      <tr><td style="background:#fbf8f1;border-radius:14px;padding:26px;text-align:center;">
        <div style="font-family:'Courier New',monospace;font-size:40px;font-weight:bold;letter-spacing:10px;color:#0b0b0e;">${code}</div>
        <div style="font-family:Arial,sans-serif;font-size:13px;color:#3a3a45;margin-top:12px;">
          Type this into the ${portalLabel} app. Expires in 1 hour · single use.<br>
          Didn't request it? Ignore this email.
        </div>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  const text = `Wii Event Malta — your ${portalLabel} sign-in code: ${code}\nExpires in 1 hour, single use. Didn't request it? Ignore this email.`;
  return { html, text, subject };
}

/** Send a login OTP code via our own mailer (bypasses the PWA↔Safari cookie split). */
export async function sendLoginCode(to: string, code: string, portalLabel: string) {
  const { html, text, subject } = renderLoginCodeEmail(code, portalLabel);
  return deliver(to, subject, html, text);
}

/* ---------------- Ambassador approved ---------------- */

const AMBASSADOR_PORTAL_URL = "https://admin.wiievent.com/ambassador";

/**
 * "You're in" — sent the moment an ambassador application is approved
 * (or a direct invite is created). Wii design: ember eyebrow, Archivo-style
 * black heading on the void, bone card, code highlighted like a login code.
 */
export async function sendAmbassadorApprovedEmail(args: {
  to: string;
  name?: string | null;
  /** Personal referral code, when one already exists. */
  code?: string | null;
  /** Resolved commission rate in basis points (e.g. 1000 = 10%). */
  rateBps: number;
}) {
  const first = (args.name ?? "").trim().split(/\s+/)[0] || null;
  const rate = `${(args.rateBps / 100).toFixed(args.rateBps % 100 === 0 ? 0 : 1)}%`;
  const subject = "You're in — welcome to the Wii Ambassadors";
  const codeBlock = args.code
    ? `<div style="margin-top:18px;background:#0b0b0e;border-radius:10px;padding:18px;text-align:center;">
        <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:3px;color:#ff9e7a;text-transform:uppercase;">Your code</div>
        <div style="font-family:'Courier New',monospace;font-size:28px;font-weight:bold;letter-spacing:6px;color:#fbf8f1;margin-top:6px;">${args.code}</div>
      </div>`
    : "";
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;background:#0b0b0e;padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
      <tr><td style="padding-bottom:16px;">
        <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#ff4d1f;text-transform:uppercase;">Wii Ambassadors</div>
        <div style="font-family:Arial Black,Arial,sans-serif;font-size:26px;font-weight:900;color:#fbf8f1;text-transform:uppercase;margin-top:6px;">You're in${first ? `, ${first}` : ""}</div>
      </td></tr>
      <tr><td style="background:#fbf8f1;border-radius:14px;padding:24px;">
        <div style="font-family:Arial,sans-serif;font-size:14px;color:#3a3a45;line-height:1.6;">
          The team reviewed your application — welcome to the crew.<br><br>
          Your link, your crowd, your commission: you earn <b style="color:#0b0b0e;">${rate}</b> on
          every ticket bought through your personal link, tracked live in your dashboard.
          Commissions unlock after each event.
        </div>
        ${codeBlock}
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:20px;">
          <tr><td align="center" style="border-radius:10px;background-color:#ff4d1f;">
            <a href="${AMBASSADOR_PORTAL_URL}" style="display:block;padding:15px 22px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#0b0b0e;text-decoration:none;text-transform:uppercase;letter-spacing:1px;">Open your dashboard →</a>
          </td></tr></table>
        <div style="font-family:Arial,sans-serif;font-size:12px;color:#6a6a77;line-height:1.6;margin-top:16px;">
          Sign in with this email address — a one-time code, no passwords. Inside you'll find your
          ${args.code ? "link, printable flyer" : "personal code and link once assigned, your printable flyer"},
          live sales, and payout settings (IBAN / Revolut / PayPal).
        </div>
      </td></tr>
      <tr><td style="padding-top:16px;font-family:'Courier New',monospace;font-size:10px;color:#9a9aa6;">Wii Event Malta — Malta After Dark</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  const text = `Wii Ambassadors — you're in${first ? `, ${first}` : ""}!\n\nYou earn ${rate} on every ticket bought through your personal link.${args.code ? `\nYour code: ${args.code}` : ""}\n\nOpen your dashboard: ${AMBASSADOR_PORTAL_URL}\nSign in with this email address — a one-time code, no passwords.`;
  return deliver(args.to, subject, html, text);
}

/* ---------------- Generic action email (transfers, applications) ---------------- */

export async function sendActionEmail(args: {
  to: string;
  subject: string;
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  const cta =
    args.ctaLabel && args.ctaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:20px;">
          <tr><td align="center" style="border-radius:10px;background-color:#ff4d1f;">
            <a href="${args.ctaUrl}" style="display:block;padding:15px 22px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#0b0b0e;text-decoration:none;text-transform:uppercase;letter-spacing:1px;">${args.ctaLabel} →</a>
          </td></tr></table>`
      : "";
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;background:#0b0b0e;padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
      <tr><td style="padding-bottom:16px;">
        <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:4px;color:#ff4d1f;text-transform:uppercase;">Wii Event Malta</div>
        <div style="font-family:Arial Black,Arial,sans-serif;font-size:24px;font-weight:900;color:#fbf8f1;text-transform:uppercase;margin-top:6px;">${args.heading}</div>
      </td></tr>
      <tr><td style="background:#fbf8f1;border-radius:14px;padding:24px;">
        <div style="font-family:Arial,sans-serif;font-size:14px;color:#3a3a45;line-height:1.6;">${args.body}</div>
        ${cta}
      </td></tr>
      <tr><td style="padding-top:16px;font-family:'Courier New',monospace;font-size:10px;color:#9a9aa6;">Wii Event Malta — Malta After Dark</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  const text = `${args.heading}\n\n${args.body.replace(/<[^>]+>/g, "")}${args.ctaUrl ? `\n\n${args.ctaLabel}: ${args.ctaUrl}` : ""}`;
  return deliver(args.to, args.subject, html, text);
}
