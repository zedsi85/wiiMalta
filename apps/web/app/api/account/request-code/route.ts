import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { signLoginChallenge } from "@wii/core";
import { sendLoginCode, rateLimit } from "@wii/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Buyer-account sign-in: emails a 6-digit code; the matching challenge lives
 * in a short-lived signed cookie, so verification is stateless. Any email may
 * request a code (buyers include guests who've never "registered").
 */
export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  // Shared cap on code sends per email (anti-bombing): 4 per 15 min. Ack 200
  // regardless so the endpoint never reveals whether an address was throttled.
  const { allowed } = await rateLimit(`code:${email}`, 4, 15 * 60_000);
  if (!allowed) return NextResponse.json({ ok: true });

  const code = String(randomInt(100000, 999999));
  const challenge = signLoginChallenge(email, code, process.env.ORDER_LINK_SECRET!);
  await sendLoginCode(email, code, "My Tickets").catch((e: unknown) =>
    console.error("[account code] send failed", e)
  );
  const res = NextResponse.json({ ok: true });
  res.cookies.set("wii_login_challenge", challenge, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 900,
    path: "/",
  });
  return res;
}
