import { NextRequest, NextResponse } from "next/server";
import { signOrderKey } from "@wii/core";
import { createDraftOrder, OrderError } from "@wii/api";

export const runtime = "nodejs";

/** O1 — create a draft order with holds. Body: {slug, lines, idempotencyKey, email?} */
export async function POST(req: NextRequest) {
  let body: {
    slug?: string;
    lines?: { tierId: string; qty: number }[];
    idempotencyKey?: string;
    email?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (!body.slug || !Array.isArray(body.lines) || !body.idempotencyKey) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const refCookie = req.cookies.get("wii_ref")?.value ?? null;

  try {
    const order = await createDraftOrder({
      slug: body.slug,
      lines: body.lines,
      idempotencyKey: body.idempotencyKey,
      email: body.email,
      candidateReferralCodeId: refCookie,
    });
    return NextResponse.json({
      orderId: order.id,
      key: signOrderKey(order.id, process.env.ORDER_LINK_SECRET!),
      status: order.status,
      totalCents: order.totalCents,
      currency: order.currency,
      expiresAt: order.expiresAt,
    });
  } catch (e) {
    if (e instanceof OrderError) {
      return NextResponse.json({ error: e.code, detail: e.detail }, { status: 409 });
    }
    console.error("[orders.create]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
