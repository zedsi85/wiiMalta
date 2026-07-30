import { NextRequest, NextResponse } from "next/server";
import { verifyOrderKey } from "@wii/core";
import { getOrderView } from "@wii/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Order view (checkout polling + tickets page). Requires ?key= (signed link). */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const key = req.nextUrl.searchParams.get("key") ?? "";
  if (!verifyOrderKey(params.id, key, process.env.ORDER_LINK_SECRET!)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const view = await getOrderView(params.id);
  if (!view) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(view);
}
