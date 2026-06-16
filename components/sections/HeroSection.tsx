"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { LogoFormation } from "@/components/brand/LogoFormation";
import { getFeatured } from "@/lib/events";
import { pad, prefersReducedMotion } from "@/lib/utils";

// The hero's subtle Three.js overlay is the only second WebGL context, so load
// it client-side and only when the device can comfortably handle it.
const FluidBackground = dynamic(() => import("@/components/webgl/FluidBackground"), { ssr: false });

// Replace this with real Tunisia event footage (see public/videos/README.md)
const heroVideoSrc = "/videos/tunisia-event-footage.mp4";

/** Chapter 01 — Enter the Night. Real Tunisia footage + atmospheric overlay. */
export function HeroSection() {
  const featured = getFeatured();
  const target = new Date(featured.iso).getTime();
  const [parts, setParts] = useState<[string, string][] | null>(null);
  const [overlay, setOverlay] = useState(false);

  useEffect(() => {
    // Only layer the Three.js overlay on capable, motion-friendly viewports.
    setOverlay(!prefersReducedMotion() && window.innerWidth >= 768);
  }, []);

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
      {/* ---- Layered hero backdrop ---- */}
      <div className="hero-media" aria-hidden="true">
        {/* Layer 1 — real Tunisia event footage */}
        <video
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/videos/hero-fallback.svg"
        >
          {/* Add a tunisia-event-footage.webm to prefer it automatically */}
          <source src="/videos/tunisia-event-footage.webm" type="video/webm" />
          <source src={heroVideoSrc} type="video/mp4" />
        </video>

        {/* Cinematic dark overlay for readability */}
        <div className="hero-video-tint" />

        {/* Layer 2 — subtle, cursor-reactive Three.js over the footage */}
        {overlay ? (
          <FluidBackground
            mood="hero"
            intensity={0.45}
            interactive
            blendMode="screen"
            opacity={0.28}
            variant="inline"
            registerMood={false}
          />
        ) : null}

        {/* Layer 3 — film grain + vignette */}
        <div className="hero-grain" />
        <div className="hero-vignette" />
      </div>

      {/* Brand-formation moment: Sun + Sea + Sound → WII */}
      <div className="hero-logo">
        <LogoFormation variant="hero" autoplay showTagline />
      </div>

      {/* ---- Layer 4 — content ---- */}
      <div className="hero-inner">
        <div className="hero-badges" data-rise>
          <span className="hero-badge">
            <i />
            Established event experience in Tunisia · Now launching in Malta
          </span>
          <span className="hero-badge ghost">Mediterranean event specialists</span>
        </div>

        <div className="eyebrow" data-rise>
          Mediterranean event collective · Tunisia → Malta
        </div>
        <h1 className="hero-title">
          <span className="line">
            <span data-rise style={{ "--i": 0 } as React.CSSProperties}>
              From Tunisia
            </span>
          </span>
          <span className="line">
            <span data-rise style={{ "--i": 1 } as React.CSSProperties}>
              to Malta.
            </span>
          </span>
        </h1>
        <p className="hero-sub" data-rise>
          A Mediterranean event collective bringing proven nightlife operations, real event energy,
          digital ticketing, and community-first experiences to Malta.
        </p>
        <div className="hero-cta" data-rise>
          <MagneticButton href="/events" className="btn btn-primary btn-lg">
            View Upcoming Events
          </MagneticButton>
          <MagneticButton href="#story" className="btn btn-ghost-line btn-lg">
            Watch Our Story
          </MagneticButton>
          <MagneticButton href="/partners" className="btn btn-ghost-line btn-lg">
            Partner With Us
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
