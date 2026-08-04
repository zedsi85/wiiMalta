import { NextResponse } from "next/server";
import { accountEmail } from "@/lib/account";

export const dynamic = "force-dynamic";

export async function GET() {
  const email = accountEmail();
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({ email });
}
