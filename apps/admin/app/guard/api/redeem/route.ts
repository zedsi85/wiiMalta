import { NextRequest, NextResponse } from "next/server";
import { redeemTicket, guardAssignedEvents, logScanAttempt } from "@wii/api";
import { guardFromSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admit: atomic redemption (T3). Duplicate-safe via ticket lock + clientScanId. */
export async function POST(req: NextRequest) {
  const guard = await guardFromSession();
  if (!guard) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let body: {
    code?: string;
    eventId?: string;
    clientScanId?: string;
    device?: string;
    location?: string;
    gate?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (!body.code) return NextResponse.json({ error: "missing_code" }, { status: 400 });

  const events = await guardAssignedEvents(guard.userId, { seesAll: guard.seesAllEvents });
  const allowed = events.map((e) => e.eventId);
  const gate = body.gate ?? events.find((e) => e.eventId === body.eventId)?.gate ?? null;

  const result = await redeemTicket({
    tokenOrSerial: body.code,
    scannerUserId: guard.userId,
    gate: gate ?? undefined,
    clientScanId: body.clientScanId,
    device: body.device,
    location: body.location,
    restrictToEventIds: body.eventId ? [body.eventId] : allowed,
  });

  await logScanAttempt({
    guardUserId: guard.userId,
    eventId: body.eventId ?? null,
    result: result.ok ? (result.alreadyRedeemed ? "duplicate" : "admitted") : result.reason,
    device: body.device,
    clientScanId: body.clientScanId,
  });
  return NextResponse.json(result);
}
