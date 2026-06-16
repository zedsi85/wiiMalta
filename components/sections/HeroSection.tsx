"use client";

import React, { useEffect, useState } from "react";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { getFeatured } from "@/lib/events";
import { pad } from "@/lib/utils";

/** Chapter 01 — Enter the Night. Full-screen hero with cursor-reactive bg. */
export function HeroSection() {
  const featured = getFeatured();
  const target = new Date(featured.iso).getTime();
  const [parts, setParts] = useState<[string, string][] | null>(null);

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setParts([
        [pad(Math.floor(diff / 86400000)), "Days"],
        [pad(Math.floor((diff % 86400000) / 3600000)), "Hrs"],
        [pad(Math.floor((diff % 3600000) / 60000)), "Min"],
        [pad(Math.floor((diff % 60000) / 1000)), "Sec"],
      ]);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  const segs: [string, string][] =
    parts ?? [
      ["––", "Days"],
      ["––", "Hrs"],
      ["––", "Min"],
      ["––", "Sec"],
    ];

  return (
    <section id="hero" className="chapter" data-mood="hero">
      <div className="hero-inner">
        <div className="eyebrow" data-rise>
          Curated nights · Malta · Est. MMXXV
        </div>
        <h1 className="hero-title">
          <span className="line">
            <span data-rise style={{ "--i": 0 } as React.CSSProperties}>
              Malta
            </span>
          </span>
          <span className="line">
            <span data-rise style={{ "--i": 1 } as React.CSSProperties}>
              After Dark
            </span>
          </span>
        </h1>
        <p className="hero-sub" data-rise>
          Sound, location, people and culture — connected after dark. Destination events for the new
          nightlife community.
        </p>
        <div className="hero-cta" data-rise>
          <MagneticButton href="/events" className="btn btn-primary btn-lg">
            View Upcoming Events
          </MagneticButton>
          <MagneticButton href="/community" className="btn btn-ghost-line btn-lg">
            Join the Community
          </MagneticButton>
        </div>
        <div className="hero-count" data-rise>
          <span className="count-label">Next drop · {featured.title}</span>
          <div className="count">
            {segs.map(([v, l]) => (
              <div className="seg" key={l}>
                <b>{v}</b>
                <i>{l}</i>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="scroll-hint" data-rise>
        <span>Scroll</span>
        <i />
      </div>
    </section>
  );
}
