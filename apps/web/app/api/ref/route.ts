import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { logReferralVisit } from "@wii/api";

export const runtime = "nodejs";

/**
 * Referral capture. The client posts a ?ref= code; if it belongs to an
 * approved ambassador and is active, we store it in an httpOnly cookie
 * (7 days, last-click wins — per docs/architecture/checkout-flow.md).
 * Attribution is only LOCKED at payment success (Phase 2); this cookie is
 * merely the candidate.
 */
export async function POST(req: NextRequest) {
  let code: unknown;
  try {
    ({ code } = await req.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (typeof code !== "string" || !/^[a-zA-Z0-9_-]{2,32}$/.test(code)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const rows = await db()
    .select({
      id: s.referralCodes.id,
      code: s.referralCodes.code,
      ambassadorId: s.referralCodes.ambassadorId,
    })
    .from(s.referralCodes)
    .innerJoin(s.ambassadorProfiles, eq(s.referralCodes.ambassadorId, s.ambassadorProfiles.id))
    .where(
      and(
        eq(sql`lower(${s.referralCodes.code})`, code.toLowerCase()),
        eq(s.referralCodes.status, "active"),
        eq(s.ambassadorProfiles.status, "approved")
      )
    )
    .limit(1);

  if (rows.length === 0) return NextResponse.json({ ok: false }, { status: 404 });

  // Conversion funnel: each validated landing is a visit
  await logReferralVisit(rows[0].id, rows[0].ambassadorId).catch(() => {});

  const res = NextResponse.json({ ok: true });
  res.cookies.set("wii_ref", rows[0].id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
