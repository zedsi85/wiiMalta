import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { sendLoginCode } from "@wii/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PWA login: emails a 6-digit sign-in code through OUR mailer (Brevo).
 * Why: installed PWAs on iOS have cookie storage separate from Safari, so
 * emailed magic LINKS authenticate the wrong browser. A code typed into the
 * PWA itself keeps the session where the user is.
 *
 * The OTP comes from Supabase admin generateLink (email_otp) — verified
 * client-side with verifyOtp, so Supabase still owns the session. Only
 * provisioned users (any role/profile) get emails; responses never reveal
 * whether an account exists.
 */
const recent = new Map<string, number>(); // per-instance soft rate limit

export async function POST(req: NextRequest) {
  let body: { email?: string; portal?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const generic = NextResponse.json({ ok: true }); // never leak account existence

  const last = recent.get(email) ?? 0;
  if (Date.now() - last < 55_000) return generic;
  recent.set(email, Date.now());

  const d = db();
  const user = await d.query.users.findFirst({ where: eq(s.users.email, email) });
  if (!user) return generic;
  const [member, assignment, ambassador] = await Promise.all([
    d.query.organizerMembers.findFirst({ where: eq(s.organizerMembers.userId, user.id) }),
    d.query.scannerAssignments.findFirst({ where: eq(s.scannerAssignments.userId, user.id) }),
    d.query.ambassadorProfiles.findFirst({ where: eq(s.ambassadorProfiles.userId, user.id) }),
  ]);
  if (!member && !assignment && !ambassador && user.platformRole !== "platform_admin") {
    return generic;
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SECRET_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "magiclink", email }),
  });
  const json = (await res.json()) as { email_otp?: string; properties?: { email_otp?: string } };
  const code = json.email_otp ?? json.properties?.email_otp;
  if (!res.ok || !code) {
    console.error("[request-code] generate_link failed", res.status);
    return generic;
  }

  const portalLabel =
    body.portal === "guard" ? "Door crew" : body.portal === "ambassador" ? "Ambassadors" : "Admin";
  await sendLoginCode(email, code, portalLabel).catch((e: unknown) =>
    console.error("[request-code] send failed", e)
  );
  return generic;
}
