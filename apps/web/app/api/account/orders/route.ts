import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { signOrderKey } from "@wii/core";
import { accountEmail } from "@/lib/account";

export const dynamic = "force-dynamic";

export async function GET() {
  const email = accountEmail();
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const d = db();
  const rows = await d
    .select({
      id: s.orders.id,
      status: s.orders.status,
      totalCents: s.orders.totalCents,
      paidAt: s.orders.paidAt,
      eventTitle: s.events.title,
      eventSlug: s.events.slug,
    })
    .from(s.orders)
    .leftJoin(s.events, eq(s.orders.eventId, s.events.id))
    .where(eq(s.orders.email, email))
    .orderBy(desc(s.orders.createdAt))
    .limit(50);
  return NextResponse.json({
    orders: rows.map((o) => ({ ...o, key: signOrderKey(o.id, process.env.ORDER_LINK_SECRET!) })),
  });
}
