import { NextRequest, NextResponse } from "next/server";
import { verifyTicketKey, mintQrToken } from "@wii/core";
import { ticketView } from "@wii/api";
import { accountEmail } from "@/lib/account";

export const dynamic = "force-dynamic";

/**
 * Fresh signed QR token for one ticket — the SAME wt1 token the guard
 * scanner verifies. Access: scoped ticket key OR the owning account session.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const t = await ticketView(params.id);
  if (!t) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const key = req.nextUrl.searchParams.get("k") ?? "";
  const owner = accountEmail();
  const authorized =
    verifyTicketKey(params.id, key, process.env.ORDER_LINK_SECRET!) ||
    (owner !== null && owner === t.ownerEmail.toLowerCase());
  if (!authorized) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const exp = Date.now() + 5 * 60_000;
  const qrToken =
    t.status === "active"
      ? mintQrToken({ ticketId: t.id, qrVersion: t.qrVersion, exp }, process.env.QR_SIGNING_SECRET!)
      : null;
  return NextResponse.json({
    serial: t.serial,
    status: t.status,
    tierName: t.tierName,
    eventTitle: t.eventTitle,
    eventStartAt: t.eventStartAt,
    venue: t.venue,
    qrToken,
    exp,
  });
}
