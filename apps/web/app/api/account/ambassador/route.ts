import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { ambassadorDashboard } from "@wii/api";
import { accountEmail } from "@/lib/account";

export const dynamic = "force-dynamic";

/** Ambassador status + dashboard for the signed-in account (mobile). */
export async function GET() {
  const email = accountEmail();
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const d = db();
  const user = await d.query.users.findFirst({ where: eq(s.users.email, email) });
  const profile = user
    ? await d.query.ambassadorProfiles.findFirst({ where: eq(s.ambassadorProfiles.userId, user.id) })
    : null;
  if (!profile) return NextResponse.json({ status: "none" });
  if (profile.status !== "approved" && profile.status !== "verified") {
    return NextResponse.json({ status: profile.status });
  }
  const dash = await ambassadorDashboard(profile.id);
  return NextResponse.json({ status: profile.status, dashboard: dash });
}
