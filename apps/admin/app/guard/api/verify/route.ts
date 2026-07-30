import { NextRequest, NextResponse } from "next/server";
import { inspectTicket, guardAssignedEvents, logScanAttempt } from "@wii/api";
import { guardFromSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Peek: resolve a scanned code to attendee details WITHOUT redeeming. */
export async function POST(req: NextRequest) {
  const guard = await guardFromSession();
  if (!guard) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let body: { code?: string; eventId?: string; device?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (!body.code) return NextResponse.json({ error: "missing_code" }, { status: 400 });

  const events = await guardAssignedEvents(guard.userId, { seesAll: guard.seesAllEvents });
  const allowed = events.map((e) => e.eventId);
  if (body.eventId && !allowed.includes(body.eventId)) {
    return NextResponse.json({ error: "event_not_assigned" }, { status: 403 });
  }

  const result = await inspectTicket({
    tokenOrSerial: body.code,
    restrictToEventIds: body.eventId ? [body.eventId] : allowed,
  });

  // Telemetry for rejects and duplicate discoveries at peek time; the happy
  // path is logged as "admitted" only when the redeem commits.
  if (!result.ok) {
    await logScanAttempt({
      guardUserId: guard.userId,
      eventId: body.eventId ?? null,
      result: result.reason,
      device: body.device,
    });
  } else if (result.info.status === "redeemed") {
    await logScanAttempt({
      guardUserId: guard.userId,
      eventId: result.info.eventId,
      ticketId: result.info.ticketId,
      result: "duplicate",
      device: body.device,
    });
  }
  return NextResponse.json(result);
}
