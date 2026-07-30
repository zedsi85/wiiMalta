import { NextRequest, NextResponse } from "next/server";
import { commissionsAdminList } from "@wii/api";
import { COMMISSION_LABELS, COMMISSION_STATUSES, type CommissionStatus } from "@wii/core";
import { requireStaff } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** CSV export of the filtered commission queue (staff only). */
export async function GET(req: NextRequest) {
  await requireStaff(); // redirects to /login if not staff
  const p = req.nextUrl.searchParams;
  const status = p.get("status") ?? "";
  const statuses =
    status === "unpaid"
      ? (["payable", "approved", "processing"] as CommissionStatus[])
      : COMMISSION_STATUSES.includes(status as CommissionStatus)
        ? [status as CommissionStatus]
        : undefined;

  const rows = await commissionsAdminList({
    statuses,
    ambassadorId: p.get("ambassador") || undefined,
    eventId: p.get("event") || undefined,
    limit: 5000,
  });

  const esc = (v: string) => `"${v.replaceAll('"', '""')}"`;
  const lines = [
    "commission_id,ambassador,email,event,order_ref,status,rate_pct,amount_eur,unlocks_at,created_at",
    ...rows.map((r) =>
      [
        r.id,
        esc(r.ambassadorName),
        r.ambassadorEmail,
        esc(r.eventTitle),
        r.orderRef,
        COMMISSION_LABELS[r.status as CommissionStatus] ?? r.status,
        (r.rateBps / 100).toFixed(2),
        (r.amountCents / 100).toFixed(2),
        r.payableAt.toISOString(),
        r.createdAt.toISOString(),
      ].join(",")
    ),
  ];
  return new NextResponse(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="wii-commissions-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
