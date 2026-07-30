import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { finalizePaidOrder } from "@wii/api";

export const runtime = "nodejs";

/**
 * Revolut Merchant API webhook. Signature: Revolut-Signature: v1=<hex hmac256>
 * over `v1.{Revolut-Request-Timestamp}.{raw_body}` with the webhook signing
 * secret. Events of interest: ORDER_COMPLETED (money captured).
 * Dedup via webhook_events (provider_event_id unique).
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const timestamp = req.headers.get("revolut-request-timestamp") ?? "";
  const signatureHeader = req.headers.get("revolut-signature") ?? "";
  const secret = process.env.REVOLUT_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });

  const expected =
    "v1=" + createHmac("sha256", secret).update(`v1.${timestamp}.${raw}`).digest("hex");
  const provided = signatureHeader.split(",").map((sig) => sig.trim());
  const valid = provided.some((sig) => {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
  // Reject stale timestamps (>5 min) to blunt replay
  const age = Math.abs(Date.now() - Number(timestamp));
  if (!valid || !Number.isFinite(Number(timestamp)) || age > 5 * 60 * 1000) {
    return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  }

  let payload: { event?: string; order_id?: string };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const eventType = payload.event ?? "unknown";
  const providerOrderId = payload.order_id ?? "";
  const providerEventId = `${eventType}:${providerOrderId}:${timestamp}`;

  const d = db();
  // Dedup — replays ack 200 without reprocessing
  const inserted = await d
    .insert(s.webhookEvents)
    .values({
      provider: "revolut",
      providerEventId,
      type: eventType,
      payload: payload as Record<string, unknown>,
      status: "received",
    })
    .onConflictDoNothing()
    .returning();
  if (inserted.length === 0) return NextResponse.json({ ok: true, dedup: true });

  try {
    if (eventType === "ORDER_COMPLETED" && providerOrderId) {
      const payment = await d.query.payments.findFirst({
        where: and(
          eq(s.payments.providerOrderId, providerOrderId),
          eq(s.payments.provider, "revolut")
        ),
      });
      if (payment) {
        await finalizePaidOrder({ orderId: payment.orderId, providerPaymentId: providerOrderId });
      }
    }
    await d
      .update(s.webhookEvents)
      .set({ status: "processed", processedAt: new Date() })
      .where(eq(s.webhookEvents.id, inserted[0].id));
  } catch (e) {
    console.error("[webhook.revolut]", e);
    await d
      .update(s.webhookEvents)
      .set({ status: "failed", error: String(e).slice(0, 500) })
      .where(eq(s.webhookEvents.id, inserted[0].id));
    // Non-200 → Revolut retries
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
