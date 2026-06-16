import Link from "next/link";
import { pad } from "@/lib/utils";
import { statusLabel, type WiiEvent } from "@/lib/events";

/**
 * Wii Event Malta — EventCard.
 * A premium event poster (not an e-commerce tile). Uses the cinematic `.ev-card`
 * structure so the homepage parallax + hover scale apply, and carries a
 * `data-card` label so the custom cursor reads "View Event" / "Waitlist".
 *
 * Replace the gradient `.pp` poster with real artwork when available.
 */
export function EventCard({ event, index }: { event: WiiEvent; index?: number }) {
  const sold = event.status === "soldout";
  return (
    <Link
      className="ev-card"
      href={`/events/${event.slug}`}
      data-card={sold ? "Waitlist" : "View Event"}
    >
      <div className="ev-poster wii-grain">
        {/* @asset replace this gradient with real event poster artwork */}
        <div className="pp" style={{ background: event.tint }} />
        {index != null ? <span className="ev-idx">{pad(index)}</span> : null}
        <span className="ev-status">
          <span className={`badge ${event.status}`}>
            <i />
            {statusLabel[event.status]}
          </span>
        </span>
        <span className="ev-name">{event.title}</span>
      </div>
      <div className="ev-meta">
        <div className="ev-row">
          <span className="v">{event.date}</span>
          <span>{event.venue}</span>
        </div>
        <div className="ev-line">{event.lineup.join("  ·  ")}</div>
        <div className="ev-foot">
          <span className="ev-price">
            <i>{sold ? "Status" : "From"}</i>
            <b>{sold ? "Sold out" : event.priceFrom}</b>
          </span>
          <span className={`btn ${sold ? "btn-ghost-line" : "btn-primary"} btn-sm`}>
            {sold ? "Waitlist" : "Buy Tickets"}
          </span>
        </div>
      </div>
    </Link>
  );
}
