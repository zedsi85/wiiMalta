import Link from "next/link";
import { guardAssignedEvents, guardDayStats } from "@wii/api";
import { requireGuard } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function GuardEventsPage() {
  const guard = await requireGuard();
  const [events, stats] = await Promise.all([
    guardAssignedEvents(guard.userId, { seesAll: guard.seesAllEvents }),
    guardDayStats(guard.userId),
  ]);

  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Malta",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const now = Date.now();

  return (
    <main className="flex flex-1 flex-col gap-5 p-5">
      <header className="flex items-start justify-between">
        <div>
          <div className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ember">
            Wii Door
          </div>
          <h1 className="text-2xl font-bold">{guard.displayName ?? guard.email.split("@")[0]}</h1>
        </div>
        <form action="/logout" method="post">
          <button className="btn-admin text-xs">Sign out</button>
        </form>
      </header>

      {/* Today's personal stats */}
      <section className="grid grid-cols-4 gap-2">
        {(
          [
            ["Scans", stats.scansToday, "text-bone"],
            ["Valid", stats.admitted, "text-go"],
            ["Invalid", stats.invalid, "text-ember"],
            ["Dupes", stats.duplicates, "text-gold"],
          ] as const
        ).map(([label, n, color]) => (
          <div key={label} className="card px-2 py-3 text-center">
            <div className={`text-xl font-bold ${color}`}>{n}</div>
            <div className="label mt-1 !text-[0.5625rem]">{label}</div>
          </div>
        ))}
      </section>

      <h2 className="label">Your events</h2>
      {events.length === 0 && (
        <p className="text-sm text-fog">
          No events assigned yet — your event manager adds you to the door list.
        </p>
      )}
      <div className="grid gap-3">
        {events.map((e) => {
          const live = e.startAt.getTime() - 2 * 3600_000 < now && now < e.endAt.getTime();
          return (
            <Link
              key={e.eventId}
              href={`/guard/event/${e.eventId}`}
              className={`card block active:scale-[0.99] ${live ? "border-go" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-lg font-bold">{e.title}</div>
                {live && <span className="pill text-go">live</span>}
              </div>
              <div className="mt-1 text-sm text-fog">
                {fmt.format(e.startAt)} · {e.venue}
                {e.gate ? ` · gate ${e.gate}` : ""}
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-pill bg-graphite">
                <div
                  className="h-full bg-ember"
                  style={{ width: `${e.capacity ? Math.min(100, (e.admitted / e.capacity) * 100) : 0}%` }}
                />
              </div>
              <div className="mt-1 font-mono text-xs text-fog">
                {e.admitted} / {e.capacity} admitted
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
