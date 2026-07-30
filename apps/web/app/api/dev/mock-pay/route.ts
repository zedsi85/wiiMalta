import { NextRequest, NextResponse } from "next/server";
import { verifyOrderKey } from "@wii/core";
import { finalizePaidOrder } from "@wii/api";
import { paymentProvider } from "@wii/api";

export const runtime = "nodejs";

/**
 * DEV ONLY — simulates the provider's ORDER_COMPLETED webhook when
 * PAYMENT_PROVIDER=mock. Refuses to exist under a real provider.
 */
export async function POST(req: NextRequest) {
  if (paymentProvider().name !== "mock") {
    return NextResponse.json({ error: "not_available" }, { status: 404 });
  }
  let body: { orderId?: string; key?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (
    !body.orderId ||
    !verifyOrderKey(body.orderId, body.key ?? "", process.env.ORDER_LINK_SECRET!)
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const result = await finalizePaidOrder({
    orderId: body.orderId,
    providerPaymentId: `mockpay_${body.orderId}`,
  });
  return NextResponse.json(result);
}
