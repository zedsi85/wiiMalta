import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { signLoginChallenge } from "@wii/core";
import { sendLoginCode } from "@wii/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Buyer-account sign-in: emails a 6-digit code; the matching challenge lives
 * in a short-lived signed cookie, so verification is stateless. Any email may
 * request a code (buyers include guests who've never "registered").
 */
const recent = new Map<string, number>();

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
  const last = recent.get(email) ?? 0;
  if (Date.now() - last < 55_000) return NextResponse.json({ ok: true });
  recent.set(email, Date.now());

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
