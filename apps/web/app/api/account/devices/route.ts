import { NextRequest, NextResponse } from "next/server";
import { registerDevice, unregisterDevice } from "@wii/api";
import { accountEmail } from "@/lib/account";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const email = accountEmail();
  if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    pushToken?: string;
    platform?: "ios" | "android";
    appVersion?: string;
    remove?: boolean;
  };
  if (!body.pushToken) return NextResponse.json({ error: "missing_token" }, { status: 400 });
  if (body.remove) await unregisterDevice(body.pushToken);
  else await registerDevice({ email, pushToken: body.pushToken, platform: body.platform ?? "ios", appVersion: body.appVersion });
  return NextResponse.json({ ok: true });
}
