import { NextRequest, NextResponse } from "next/server";
import { redeemTicket, guardAssignedEvents, logScanAttempt } from "@wii/api";
import { guardFromSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface QueuedScan {
  code: string;
  clientScanId: string;
  eventId?: string;
  scannedAt?: string;
  device?: string;
}

/**
 * Offline queue flush. Each scan replays through the same engine call with
 * its original clientScanId (idempotent) and timestamp; QR tokens that
 * expired while the device was offline are accepted (signature still must
 * verify) because wasOffline is stamped on the redemption.
 */
export async function POST(req: NextRequest) {
  const guard = await guardFromSession();
  if (!guard) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let body: { scans?: QueuedScan[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const scans = (body.scans ?? []).slice(0, 200);

  const events = await guardAssignedEvents(guard.userId, { seesAll: guard.seesAllEvents });
  const allowed = events.map((e) => e.eventId);

  const results = [];
  for (const scan of scans) {
    if (!scan.code || !scan.clientScanId) {
      results.push({ clientScanId: scan.clientScanId ?? null, ok: false, reason: "invalid" });
      continue;
    }
    const result = await redeemTicket({
      tokenOrSerial: scan.code,
      scannerUserId: guard.userId,
      clientScanId: scan.clientScanId,
      device: scan.device,
      scannedAt: scan.scannedAt ? new Date(scan.scannedAt) : undefined,
      wasOffline: true,
      allowExpiredToken: true,
      restrictToEventIds: scan.eventId ? [scan.eventId] : allowed,
      gate: events.find((e) => e.eventId === scan.eventId)?.gate ?? undefined,
    });
    await logScanAttempt({
      guardUserId: guard.userId,
      eventId: scan.eventId ?? null,
      result: result.ok ? (result.alreadyRedeemed ? "duplicate" : "admitted") : result.reason,
      device: scan.device,
      clientScanId: scan.clientScanId,
    });
    results.push({ clientScanId: scan.clientScanId, ...result });
  }
  return NextResponse.json({ results });
}
