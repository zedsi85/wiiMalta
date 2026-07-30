import Link from "next/link";
import { notFound } from "next/navigation";
import { guardAssignedEvents } from "@wii/api";
import { requireGuard } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function GuardEventPage({ params }: { params: { id: string } }) {
  const guard = await requireGuard();
  const events = await guardAssignedEvents(guard.userId, { seesAll: guard.seesAllEvents });
  const event = events.find((e) => e.eventId === params.id);
  if (!event) notFound();

  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Malta",
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const pct = event.capacity ? Math.min(100, Math.round((event.admitted / event.capacity) * 100)) : 0;

  return (
    <main className="flex flex-1 flex-col gap-6 p-5">
      <header>
        <Link href="/guard/events" className="font-mono text-xs text-fog">
          ← All events
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{event.title}</h1>
        <p className="mt-1 text-sm text-fog">
          {fmt.format(event.startAt)} · {event.venue}
        </p>
        {event.gate && (
          <span className="pill mt-2 inline-block text-ember">Your gate: {event.gate}</span>
        )}
      </header>

      <section className="card text-center">
        <div className="text-5xl font-bold">{event.admitted}</div>
        <div className="label mt-1">admitted of {event.capacity}</div>
        <div className="mt-4 h-2 overflow-hidden rounded-pill bg-graphite">
          <div className="h-full bg-go" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 font-mono text-xs text-fog">{pct}%</div>
      </section>

      <Link
        href={`/guard/scanner?event=${event.eventId}`}
        className="btn-admin-primary justify-center py-4 text-lg active:scale-[0.99]"
      >
        ▣ Open scanner
      </Link>

      <p className="text-center font-mono text-[0.6875rem] text-fog">
        Ask attendees to open their ticket link — screenshots won&apos;t scan.
      </p>
    </main>
  );
}
