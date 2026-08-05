import { NextResponse } from "next/server";
import { deleteAccountData } from "@wii/api";
import { accountEmail } from "@/lib/account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Self-service account deletion (App Store 5.1.1(v) / Play data-deletion). */
export async function POST() {
  const email = accountEmail();
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await deleteAccountData(email);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("wii_account", "", { path: "/", maxAge: 0 });
  return res;
}
