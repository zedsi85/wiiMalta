import { NextRequest, NextResponse } from "next/server";
import { verifyLoginChallenge, signAccountSession } from "@wii/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { email?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  const code = body.code?.trim();
  const challenge = req.cookies.get("wii_login_challenge")?.value ?? "";
  if (!email || !code || !verifyLoginChallenge(email, code, challenge, process.env.ORDER_LINK_SECRET!)) {
    return NextResponse.json({ ok: false, error: "bad_code" }, { status: 401 });
  }
  const session = signAccountSession(email, process.env.ORDER_LINK_SECRET!);
  // token in body: the mobile app stores it in SecureStore and sends it as
  // Authorization: Bearer — same signed value the web cookie carries.
  const res = NextResponse.json({ ok: true, token: session, email });
  res.cookies.set("wii_account", session, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 3600,
    path: "/",
  });
  res.cookies.set("wii_login_challenge", "", { path: "/", maxAge: 0 });
  return res;
}
