import { NextRequest, NextResponse } from "next/server";
import { verifyOrderKey } from "@wii/core";
import { beginPayment, OrderError } from "@wii/api";

export const runtime = "nodejs";

/** O2 — begin payment. Body: {email}. Requires ?key=. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const key = req.nextUrl.searchParams.get("key") ?? "";
  if (!verifyOrderKey(params.id, key, process.env.ORDER_LINK_SECRET!)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "bad_email" }, { status: 400 });
  }
  try {
    const result = await beginPayment(params.id, email);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof OrderError) {
      return NextResponse.json({ error: e.code }, { status: 409 });
    }
    console.error("[orders.pay]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
