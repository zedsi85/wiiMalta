import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { savedEventIds, saveEvent, unsaveEvent } from "@wii/api";
import { accountEmail } from "@/lib/account";

export const dynamic = "force-dynamic";

/** Saved events — slug-based contract (catalog speaks slugs); ids internal. */
export async function GET() {
  const email = accountEmail();
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const ids = await savedEventIds(email);
  if (ids.length === 0) return NextResponse.json({ eventIds: [] });
  const rows = await db()
    .select({ slug: s.events.slug })
    .from(s.events)
    .where(inArray(s.events.id, ids));
  return NextResponse.json({ eventIds: rows.map((r) => r.slug) });
}

export async function POST(req: NextRequest) {
  const email = accountEmail();
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { eventId, save } = (await req.json().catch(() => ({}))) as { eventId?: string; save?: boolean };
  if (!eventId) return NextResponse.json({ error: "missing_event" }, { status: 400 });
  const event = await db().query.events.findFirst({ where: eq(s.events.slug, eventId) });
  if (!event) return NextResponse.json({ error: "unknown_event" }, { status: 404 });
  if (save === false) await unsaveEvent(email, event.id);
  else await saveEvent(email, event.id);
  return NextResponse.json({ ok: true });
}
