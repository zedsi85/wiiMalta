import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { finalizePaidOrder, sendOrderTickets, pushToUserEmail, getOrderView, refundUnfulfilledOrder } from "@wii/api";

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
  // Stable dedup key (no timestamp): Revolut redeliveries of the SAME event
  // share it, so a delivery that failed after finalize is reprocessed (finalize
  // + email are idempotent) rather than short-circuited before the email sends.
  const providerEventId = `${eventType}:${providerOrderId}`;

  const d = db();
  const existing = await d.query.webhookEvents.findFirst({
    where: and(eq(s.webhookEvents.provider, "revolut"), eq(s.webhookEvents.providerEventId, providerEventId)),
  });
  // Already fully processed → true replay, ack without reprocessing.
  if (existing?.status === "processed") return NextResponse.json({ ok: true, dedup: true });

  const inserted = existing
    ? [existing]
    : await d
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
  // Lost the insert race to a concurrent delivery — the winner will process it.
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
        const result = await finalizePaidOrder({
          orderId: payment.orderId,
          providerPaymentId: providerOrderId,
        });
        // Deliver on first finalize AND on idempotent redelivery — sendOrderTickets
        // guards its own re-send, so a delivery that crashed post-finalize still
        // gets the buyer their email on Revolut's retry.
        if (result.outcome === "paid" || result.outcome === "already_paid") {
          await sendOrderTickets(payment.orderId);
          const view = await getOrderView(payment.orderId);
          if (view) {
            await pushToUserEmail(view.email, {
              title: "Your Wii tickets are ready 🎟",
              body: `${view.event.title} — tap to open your QR.`,
              data: { url: `/tickets` },
            });
          }
        } else if (result.outcome === "refund_required") {
          // Money captured but the order can't be fulfilled (stock resold, or
          // paid-after-cancel). Auto-refund instead of silently keeping funds.
          await refundUnfulfilledOrder({
            orderId: payment.orderId,
            providerOrderId,
            reason: "tickets unavailable at payment settlement",
          });
        }
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
