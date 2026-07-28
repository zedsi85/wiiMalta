import { asc, desc, eq } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { requireStaff } from "@/lib/auth";
import {
  inviteAmbassador,
  setAmbassadorStatus,
  createReferralCode,
  setReferralCodeStatus,
} from "../actions";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  approved: "text-go",
  applied: "text-gold",
  suspended: "text-ember",
  rejected: "text-ash",
};

export default async function AmbassadorsPage() {
  await requireStaff();
  const d = db();

  const [profiles, codes, events] = await Promise.all([
    d
      .select({
        id: s.ambassadorProfiles.id,
        status: s.ambassadorProfiles.status,
        commissionBps: s.ambassadorProfiles.commissionBps,
        createdAt: s.ambassadorProfiles.createdAt,
        email: s.users.email,
        name: s.users.displayName,
      })
      .from(s.ambassadorProfiles)
      .innerJoin(s.users, eq(s.ambassadorProfiles.userId, s.users.id))
      .orderBy(desc(s.ambassadorProfiles.createdAt)),
    d
      .select({
        id: s.referralCodes.id,
        code: s.referralCodes.code,
        status: s.referralCodes.status,
        bps: s.referralCodes.commissionBpsOverride,
        eventId: s.referralCodes.eventId,
        email: s.users.email,
      })
      .from(s.referralCodes)
      .innerJoin(s.ambassadorProfiles, eq(s.referralCodes.ambassadorId, s.ambassadorProfiles.id))
      .innerJoin(s.users, eq(s.ambassadorProfiles.userId, s.users.id))
      .orderBy(asc(s.referralCodes.code)),
    d
      .select({ id: s.events.id, title: s.events.title })
      .from(s.events)
      .where(eq(s.events.status, "published"))
      .orderBy(asc(s.events.startAt)),
  ]);

  const approved = profiles.filter((p) => p.status === "approved");
  const eventTitle = new Map(events.map((e) => [e.id, e.title]));

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Ambassadors</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Invite */}
        <section className="card">
          <h2 className="label mb-4">Invite ambassador</h2>
          <form action={inviteAmbassador} className="grid gap-3">
            <input name="email" type="email" required placeholder="email" className="input-admin" />
            <input name="name" placeholder="display name (optional)" className="input-admin" />
            <input
              name="bps"
              type="number"
              min={0}
              max={5000}
              placeholder="commission bps (default 1000 = 10%)"
              className="input-admin"
            />
            <button className="btn-admin-primary justify-self-start">Invite (auto-approved)</button>
          </form>
        </section>

        {/* Create code */}
        <section className="card">
          <h2 className="label mb-4">Create referral code</h2>
          {approved.length === 0 ? (
            <p className="text-sm text-fog">Invite an ambassador first.</p>
          ) : (
            <form action={createReferralCode} className="grid gap-3">
              <select name="ambassadorId" className="input-admin" required>
                {approved.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name ?? p.email}
                  </option>
                ))}
              </select>
              <input name="code" required placeholder="CODE (e.g. SARA10)" className="input-admin" />
              <select name="eventId" className="input-admin">
                <option value="">All events</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
              <input
                name="bps"
                type="number"
                min={0}
                max={5000}
                placeholder="bps override (optional)"
                className="input-admin"
              />
              <button className="btn-admin-primary justify-self-start">Create code</button>
            </form>
          )}
        </section>

        {/* Profiles */}
        <section className="card overflow-x-auto p-0 lg:col-span-2">
          <table className="table-admin">
            <thead>
              <tr>
                <th>Ambassador</th>
                <th>Status</th>
                <th className="text-right">Commission</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-fog">
                    No ambassadors yet — invite the first one above.
                  </td>
                </tr>
              )}
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="font-semibold">{p.name ?? "—"}</span>
                    <div className="font-mono text-xs text-ash">{p.email}</div>
                  </td>
                  <td>
                    <span className={`pill ${STATUS_COLOR[p.status] ?? ""}`}>{p.status}</span>
                  </td>
                  <td className="text-right font-mono">
                    {p.commissionBps != null ? `${p.commissionBps / 100}%` : "default 10%"}
                  </td>
                  <td className="text-right">
                    {p.status !== "approved" && (
                      <form action={setAmbassadorStatus.bind(null, p.id, "approved")} className="inline">
                        <button className="btn-admin">Approve</button>
                      </form>
                    )}{" "}
                    {p.status === "approved" && (
                      <form action={setAmbassadorStatus.bind(null, p.id, "suspended")} className="inline">
                        <button className="btn-admin border-ember/60 text-ember hover:bg-ember/10">
                          Suspend
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Codes */}
        <section className="card overflow-x-auto p-0 lg:col-span-2">
          <table className="table-admin">
            <thead>
              <tr>
                <th>Code</th>
                <th>Ambassador</th>
                <th>Scope</th>
                <th className="text-right">Override</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-fog">
                    No codes yet. Share links as{" "}
                    <code className="font-mono">wiimalta.com/events?ref=CODE</code>
                  </td>
                </tr>
              )}
              {codes.map((c) => (
                <tr key={c.id}>
                  <td className="font-mono font-bold text-ember-300">{c.code}</td>
                  <td className="text-fog">{c.email}</td>
                  <td>{c.eventId ? eventTitle.get(c.eventId) ?? "one event" : "All events"}</td>
                  <td className="text-right font-mono">{c.bps != null ? `${c.bps / 100}%` : "—"}</td>
                  <td>
                    <span className={`pill ${c.status === "active" ? "text-go" : "text-ash"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <form
                      action={setReferralCodeStatus.bind(
                        null,
                        c.id,
                        c.status === "active" ? "paused" : "active"
                      )}
                      className="inline"
                    >
                      <button className="btn-admin">
                        {c.status === "active" ? "Pause" : "Activate"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
