import { NextRequest, NextResponse } from "next/server";
import { signTicketKey } from "@wii/core";
import { createTicketTransfer, cancelTicketTransfer, sendActionEmail, ticketView } from "@wii/api";
import { accountEmail } from "@/lib/account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Create or cancel a ticket transfer (buyer-account session required). */
export async function POST(req: NextRequest) {
  const email = accountEmail();
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  let body: { ticketId?: string; toEmail?: string; action?: "create" | "cancel" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (!body.ticketId) return NextResponse.json({ error: "missing_ticket" }, { status: 400 });

  if (body.action === "cancel") {
    await cancelTicketTransfer({ ticketId: body.ticketId, ownerEmail: email });
    return NextResponse.json({ ok: true });
  }

  const result = await createTicketTransfer({
    ticketId: body.ticketId,
    ownerEmail: email,
    toEmail: body.toEmail ?? "",
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const view = await ticketView(body.ticketId);
  await sendActionEmail({
    to: body.toEmail!.trim().toLowerCase(),
    subject: `A ticket for ${view?.eventTitle ?? "a Wii event"} is waiting for you`,
    heading: "Ticket incoming",
    body: `${email} is sending you a <b>${view?.tierName ?? "ticket"}</b> for <b>${view?.eventTitle ?? "a Wii event"}</b>.<br>
      Accept it within 72 hours — once accepted, the ticket becomes yours with a fresh QR.`,
    ctaLabel: "Accept ticket",
    ctaUrl: `${site}/claim/${result.claimToken}`,
  }).catch(() => {});
  return NextResponse.json({ ok: true, expiresAt: result.expiresAt });
}
