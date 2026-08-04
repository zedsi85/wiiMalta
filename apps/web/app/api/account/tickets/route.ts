import { NextResponse } from "next/server";
import { signTicketKey, signOrderKey } from "@wii/core";
import { ownedTickets } from "@wii/api";
import { accountEmail } from "@/lib/account";

export const dynamic = "force-dynamic";

/** The wallet: every ticket owned by the account, with scoped access keys. */
export async function GET() {
  const email = accountEmail();
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const secret = process.env.ORDER_LINK_SECRET!;
  const tickets = await ownedTickets(email);
  return NextResponse.json({
    tickets: tickets.map((t) => ({
      ...t,
      ticketKey: signTicketKey(t.id, secret),
      orderKey: t.orderId ? signOrderKey(t.orderId, secret) : null,
    })),
  });
}
