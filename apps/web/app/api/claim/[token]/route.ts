import { NextRequest, NextResponse } from "next/server";
import { signTicketKey } from "@wii/core";
import { acceptTicketTransfer, sendActionEmail, ticketView, transferByToken } from "@wii/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Accept a ticket transfer; returns the recipient's private ticket URL. */
export async function POST(_req: NextRequest, { params }: { params: { token: string } }) {
  const info = await transferByToken(params.token);
  const result = await acceptTicketTransfer(params.token);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const ticketUrl = `${site}/tickets/${result.newTicketId}?k=${signTicketKey(result.newTicketId, process.env.ORDER_LINK_SECRET!)}`;

  // Email the recipient their permanent ticket link
  if (info) {
    const view = await ticketView(result.newTicketId);
    await sendActionEmail({
      to: info.transfer.toEmail,
      subject: `Your ticket — ${view?.eventTitle ?? "Wii Event Malta"}`,
      heading: "It's yours.",
      body: `Your <b>${view?.tierName ?? "ticket"}</b> for <b>${view?.eventTitle ?? "the event"}</b> is ready.
        Serial <b>${view?.serial ?? ""}</b>. Keep this link private — it IS your ticket.`,
      ctaLabel: "Open my ticket",
      ctaUrl: ticketUrl,
    }).catch(() => {});
  }
  return NextResponse.json({ ok: true, ticketUrl });
}
