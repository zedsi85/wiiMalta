import { NextResponse } from "next/server";
import { guardDayStats, guardAssignedEvents } from "@wii/api";
import { guardFromSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Today's personal stats + live event door counts. */
export async function GET() {
  const guard = await guardFromSession();
  if (!guard) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const [stats, events] = await Promise.all([
    guardDayStats(guard.userId),
    guardAssignedEvents(guard.userId, { seesAll: guard.seesAllEvents }),
  ]);
  return NextResponse.json({ stats, events });
}
