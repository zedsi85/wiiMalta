"use client";

import Link from "next/link";
import { useRef } from "react";
import { pad, hasFinePointer, prefersReducedMotion } from "@/lib/utils";
import { statusLabel, type WiiEvent } from "@/lib/events";
import { CardIllustration } from "@/components/visual/CardIllustration";
import { eventVariant } from "@/lib/illustrations";

/**
 * Wii Event Malta — EventCard.
 * A premium event poster / digital ticket. On desktop hover it tilts toward the
 * cursor (capped), a glossy club-light reflection tracks the pointer, the poster
 * zooms and the border/CTA glow lifts. Tilt is disabled on touch + reduced
 * motion. Fully keyboard accessible (it's a link; Enter works) with an aria-label.
 *
 * Replace the gradient `.pp` poster with real artwork when available.
 */
export function EventCard({ event, index }: { event: WiiEvent; index?: number }) {
  const sold = event.status === "soldout";
  const cardRef = useRef<HTMLAnchorElement>(null);
  const glossRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const s = useRef({ rx: 0, ry: 0, trx: 0, tryy: 0, gx: 50, gy: 30, tgx: 50, tgy: 30, hover: false });

  const tick = () => {
    raf.current = 0;
    const el = cardRef.current;
    if (!el) return;
    const st = s.current;
    st.rx += (st.tryy - st.rx) * 0.14;
    st.ry += (st.trx - st.ry) * 0.14;
    st.gx += (st.tgx - st.gx) * 0.14;
    st.gy += (st.tgy - st.gy) * 0.14;
    el.style.transform = `perspective(900px) rotateX(${st.rx.toFixed(2)}deg) rotateY(${st.ry.toFixed(2)}deg) translateY(${st.hover ? -6 : 0}px)`;
    if (glossRef.current) {
      glossRef.current.style.background = `radial-gradient(circle at ${st.gx.toFixed(1)}% ${st.gy.toFixed(1)}%, rgba(255,255,255,0.20), rgba(46,107,255,0.12) 28%, rgba(255,77,31,0.10) 52%, transparent 72%)`;
    }
    if (
      Math.abs(st.rx - st.tryy) > 0.04 ||
      Math.abs(st.ry - st.trx) > 0.04 ||
      Math.abs(st.gx - st.tgx) > 0.2 ||
      Math.abs(st.gy - st.tgy) > 0.2
    ) {
      raf.current = requestAnimationFrame(tick);
    }
  };
  const schedule = () => {
    if (!raf.current) raf.current = requestAnimationFrame(tick);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!hasFinePointer() || prefersReducedMotion()) return;
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const st = s.current;
    st.tryy = (0.5 - py) * 5; // rotateX, max ±5deg
    st.trx = (px - 0.5) * 7; // rotateY, max ±7deg
    st.tgx = px * 100;
    st.tgy = py * 100;
    st.hover = true;
    schedule();
  };
  const onLeave = () => {
    const st = s.current;
    st.tryy = 0;
    st.trx = 0;
    st.hover = false;
    schedule();
  };

  return (
    <Link
      ref={cardRef}
      className="ev-card"
      href={`/events/${event.slug}`}
      data-card={sold ? "Join Waitlist" : "View Event"}
      aria-label={`${event.title} — ${event.date}, ${event.venue}. ${
        sold ? "Sold out — join the waitlist." : `From ${event.priceFrom}. View event and buy tickets.`
      }`}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div className="ev-poster wii-grain">
        {event.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.posterUrl}
            alt={`${event.title} poster`}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
          />
        ) : (
          <>
            <div className="pp" style={{ background: event.tint }} />
            <CardIllustration variant={eventVariant(event)} intensity="high" animated />
          </>
        )}
        {index != null ? <span className="ev-idx">{pad(index)}</span> : null}
        <span className="ev-status">
          <span className={`badge ${event.status}`}>
            <i />
            {statusLabel[event.status]}
          </span>
        </span>
        {/* poster artwork already carries the event name */}
        {!event.posterUrl && <span className="ev-name">{event.title}</span>}
      </div>

      {/* moving club-light gloss */}
      <div className="ev-gloss" ref={glossRef} aria-hidden="true" />

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
