import React from "react";
import Link from "next/link";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { WiiMark } from "@/components/ui/WiiMark";

/** Chapter 09 — Final CTA. Cinematic outro + the homepage's own footer band. */
export function FinalCTASection() {
  return (
    <section id="finale" className="chapter chapter-finale" data-mood="finale">
      <div className="finale-inner">
        <h2 className="finale-title">
          <span className="line">
            <span data-rise style={{ "--i": 0 } as React.CSSProperties}>
              The next night
            </span>
          </span>
          <span className="line">
            <span data-rise style={{ "--i": 1 } as React.CSSProperties}>
              starts here.
            </span>
          </span>
        </h2>
        <div className="finale-cta" data-rise>
          <MagneticButton href="/events" className="btn btn-primary btn-lg">
            View Events
          </MagneticButton>
          <MagneticButton href="/community" className="btn btn-ghost-line btn-lg">
            Join Community
          </MagneticButton>
          <MagneticButton href="/events" className="btn btn-ghost-line btn-lg">
            Buy Tickets
          </MagneticButton>
        </div>
        <p className="finale-partner" data-rise>
          Looking to partner with Wii Event Malta?{" "}
          <Link href="/partners" data-cursor>
            Partner With Us →
          </Link>
        </p>
      </div>
      <footer className="finale-foot">
        <div className="ff-mark">
          <WiiMark size={30} />
          <b>WII EVENT MALTA</b>
        </div>
        <span>© {new Date().getFullYear()} · Curated nights across Malta</span>
        <span>Instagram · Telegram · WhatsApp</span>
      </footer>
    </section>
  );
}
