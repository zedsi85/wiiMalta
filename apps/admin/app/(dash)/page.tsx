import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { requireStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  await requireStaff();
  const d = db();

  const [[events], [sold], [ambassadors], [codes]] = await Promise.all([
    d
      .select({ n: sql<number>`count(*)::int` })
      .from(s.events)
      .where(eq(s.events.status, "published")),
    d
      .select({ n: sql<number>`coalesce(sum(${s.inventoryPools.soldCount}),0)::int` })
      .from(s.inventoryPools)
      .where(sql`${s.inventoryPools.tierId} is not null`),
    d
      .select({ n: sql<number>`count(*)::int` })
      .from(s.ambassadorProfiles)
      .where(eq(s.ambassadorProfiles.status, "approved")),
    d
      .select({ n: sql<number>`count(*)::int` })
      .from(s.referralCodes)
      .where(eq(s.referralCodes.status, "active")),
  ]);

  const stats: [string, number, string][] = [
    ["Published events", events.n, "/events"],
    ["Tickets sold", sold.n, "/events"],
    ["Approved ambassadors", ambassadors.n, "/ambassadors"],
    ["Active referral codes", codes.n, "/ambassadors"],
  ];

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(([label, n, href]) => (
          <Link key={label} href={href} className="card transition-colors hover:border-ember">
            <div className="label mb-2">{label}</div>
            <div className="text-3xl font-bold">{n}</div>
          </Link>
        ))}
      </div>
      <p className="mt-8 text-sm text-fog">
        Sales, orders and check-in modules arrive with Phase 2 (payments) and Phase 3 (door ops).
      </p>
    </>
  );
}
