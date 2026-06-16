import { MagneticButton } from "@/components/ui/MagneticButton";
import { EventCard } from "@/components/ui/EventCard";
import { events } from "@/lib/events";

/** Chapter 02 — The Next Drop. Poster-grade event cards, staggered reveal. */
export function UpcomingEventsSection() {
  return (
    <section id="events" className="chapter" data-mood="events">
      <div className="chapter-head">
        <div className="eyebrow" data-rise>
          Chapter 02 · Now on sale
        </div>
        <h2 className="big" data-rise>
          The Next Drop
        </h2>
      </div>
      <div className="events-grid" id="eventsGrid" data-stagger>
        {events.map((e, i) => (
          <EventCard key={e.slug} event={e} index={i + 1} />
        ))}
      </div>
      <div className="events-more" data-rise>
        <MagneticButton href="/events" className="btn btn-ghost-line">
          All events →
        </MagneticButton>
      </div>
    </section>
  );
}
