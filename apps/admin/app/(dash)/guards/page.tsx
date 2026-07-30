import { asc, eq, gte, and, sql, inArray } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { maltaDayStart } from "@wii/api";
import { requireStaff } from "@/lib/auth";
import { assignGuardAction, removeGuardAssignmentAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function GuardsPage() {
  await requireStaff();
  const d = db();

  const [assignments, events] = await Promise.all([
    d
      .select({
        eventId: s.scannerAssignments.eventId,
        userId: s.scannerAssignments.userId,
        gate: s.scannerAssignments.gate,
        email: s.users.email,
        name: s.users.displayName,
        eventTitle: s.events.title,
        startAt: s.events.startAt,
      })
      .from(s.scannerAssignments)
      .innerJoin(s.users, eq(s.scannerAssignments.userId, s.users.id))
      .innerJoin(s.events, eq(s.scannerAssignments.eventId, s.events.id))
      .orderBy(asc(s.events.startAt)),
    d
      .select({ id: s.events.id, title: s.events.title })
      .from(s.events)
      .where(eq(s.events.status, "published"))
      .orderBy(asc(s.events.startAt)),
  ]);

  // Today's per-guard telemetry
  const guardIds = [...new Set(assignments.map((a) => a.userId))];
  const since = maltaDayStart();
  const statRows = guardIds.length
    ? await d
        .select({
          guardUserId: s.scanAttempts.guardUserId,
          result: s.scanAttempts.result,
          n: sql<number>`count(*)::int`,
        })
        .from(s.scanAttempts)
        .where(
          and(inArray(s.scanAttempts.guardUserId, guardIds), gte(s.scanAttempts.createdAt, since))
        )
        .groupBy(s.scanAttempts.guardUserId, s.scanAttempts.result)
    : [];
  const statsFor = (id: string) => {
    const mine = statRows.filter((r) => r.guardUserId === id);
    const get = (k: string) => mine.find((r) => r.result === k)?.n ?? 0;
    const admitted = get("admitted");
    const duplicates = get("duplicate");
    const invalid = mine.reduce((n, r) => n + r.n, 0) - admitted - duplicates;
    return { total: admitted + duplicates + invalid, admitted, duplicates, invalid };
  };

  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Malta",
    day: "2-digit",
    month: "short",
  });

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">Door crew</h1>
      <p className="mb-6 text-sm text-fog">
        Guards sign in at <code className="font-mono text-ember-300">/guard/login</code> on their
        phone (installable as an app). They see only assigned events — never admin modules,
        revenue, customers or payments.
      </p>

      <div className="grid gap-6">
        <section className="card">
          <h2 className="label mb-4">Assign a guard</h2>
          <form action={assignGuardAction} className="flex flex-wrap items-end gap-2">
            <input name="email" type="email" required placeholder="guard email" className="input-admin max-w-60" />
            <input name="name" placeholder="name (optional)" className="input-admin max-w-44" />
            <select name="eventId" required className="input-admin max-w-64">
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
            <input name="gate" placeholder="gate (optional)" className="input-admin w-32" />
            <button className="btn-admin-primary">Assign</button>
          </form>
        </section>

        <section className="card overflow-x-auto p-0">
          <table className="table-admin">
            <thead>
              <tr>
                <th>Guard</th>
                <th>Event</th>
                <th>Gate</th>
                <th className="text-right">Today: scans</th>
                <th className="text-right">Valid</th>
                <th className="text-right">Invalid</th>
                <th className="text-right">Dupes</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-fog">
                    No guards assigned yet.
                  </td>
                </tr>
              )}
              {assignments.map((a) => {
                const st = statsFor(a.userId);
                return (
                  <tr key={`${a.eventId}:${a.userId}`}>
                    <td>
                      <span className="font-semibold">{a.name ?? "—"}</span>
                      <div className="font-mono text-xs text-ash">{a.email}</div>
                    </td>
                    <td>
                      {a.eventTitle}
                      <span className="ml-2 font-mono text-xs text-ash">{fmt.format(a.startAt)}</span>
                    </td>
                    <td className="font-mono">{a.gate ?? "—"}</td>
                    <td className="text-right font-mono">{st.total}</td>
                    <td className="text-right font-mono text-go">{st.admitted}</td>
                    <td className="text-right font-mono text-ember">{st.invalid}</td>
                    <td className="text-right font-mono text-gold">{st.duplicates}</td>
                    <td className="text-right">
                      <form action={removeGuardAssignmentAction.bind(null, a.eventId, a.userId)} className="inline">
                        <button className="btn-admin">Remove</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
