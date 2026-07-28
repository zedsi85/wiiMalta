"use client";

import React, { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { LogoFormation } from "@/components/brand/LogoFormation";
import { HeroLogoIntro } from "@/components/brand/HeroLogoIntro";
import type { WiiEvent } from "@/lib/events";
import { pad, prefersReducedMotion } from "@/lib/utils";

// The hero's subtle Three.js overlay is the only second WebGL context, so load
// it client-side and only when the device can comfortably handle it.
const FluidBackground = dynamic(() => import("@/components/webgl/FluidBackground"), { ssr: false });

// Atmospheric event footage. Presented as energy/proof — the credibility story
// lives on /about. (See public/videos/README.md)
const heroVideoSrc = "/videos/tunisia-event-footage.mp4";

// Dev flag — set true to replay the opening intro on every load while testing.
// Leave false in production: it then plays once per session (sessionStorage).
const FORCE_PLAY_INTRO = false;

type IntroState = "idle" | "play" | "done";

/** Chapter 01 — Malta After Dark. One-time logo intro → clean Malta-first hero. */
export function HeroSection({ featured }: { featured: WiiEvent }) {
  const target = new Date(featured.iso).getTime();
  const [parts, setParts] = useState<[string, string][] | null>(null);
  const [overlay, setOverlay] = useState(false);
  const [intro, setIntro] = useState<IntroState>("idle");

  // Stable so it never re-triggers the intro's run-once effect.
  const handleIntroComplete = useCallback(() => {
    try {
      sessionStorage.setItem("wiiHeroIntroPlayed", "true");
    } catch {
      /* private mode — fine */
    }
    setIntro("done");
  }, []);

  useEffect(() => {
    setOverlay(!prefersReducedMotion() && window.innerWidth >= 768);

    // Decide whether to play the opening intro.
    let played = false;
    try {
      played = sessionStorage.getItem("wiiHeroIntroPlayed") === "true";
    } catch {
      played = false;
    }
    if (!FORCE_PLAY_INTRO && (played || prefersReducedMotion())) {
      setIntro("done");
    } else {
      setIntro("play");
    }
  }, []);

  // Hard failsafe: the intro can never block the site, even if GSAP fails.
  useEffect(() => {
    if (intro !== "play") return;
    const t = window.setTimeout(() => {
      handleIntroComplete();
    }, 4500);
    return () => window.clearTimeout(t);
  }, [intro, handleIntroComplete]);

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

  const playingIntro = intro === "play";

  return (
    <section id="hero" className="chapter" data-mood="hero">
      {/* ---- Layered hero backdrop ---- */}
      <div className="hero-media" aria-hidden="true">
        {/* Layer 1 — event footage */}
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

      {/* ---- Layer 4 — content (sits below the navbar via padding-top) ---- */}
      <div className="hero-inner">
        {/* Brand-formation moment: Sun + Sea + Sound → WII.
            When the full-screen intro plays it owns the animation, so the in-hero
            logo renders static and is revealed as the intro settles onto it. */}
        <div className="hero-logo-inline">
          <LogoFormation variant="hero" autoplay={!playingIntro} showTagline />
        </div>

        <div className="hero-main-content">
          <div className="eyebrow" data-rise>
            Curated nights · Island venues · Malta
          </div>
          <h1 className="hero-title">
            <span className="line">
              <span data-rise style={{ "--i": 0 } as React.CSSProperties}>
                Malta
              </span>
            </span>
            <span className="line">
              <span data-rise style={{ "--i": 1 } as React.CSSProperties}>
                After Dark.
              </span>
            </span>
          </h1>
          <p className="hero-sub" data-rise>
            Curated music experiences, island venues, digital ticketing, and community-driven nights
            across Malta.
          </p>
          <div className="hero-cta" data-rise>
            <MagneticButton href="/events" className="btn btn-primary btn-lg">
              View Upcoming Events
            </MagneticButton>
            <MagneticButton href="/events" className="btn btn-ghost-line btn-lg">
              Buy Tickets
            </MagneticButton>
            <MagneticButton href="/community" className="btn btn-ghost-line btn-lg">
              Join the Community
            </MagneticButton>
          </div>
          <Link href="/#gallery" className="hero-watch" data-cursor>
            ▶ Watch Moments
          </Link>
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
      </div>
      <div className="scroll-hint" data-rise>
        <span>Scroll</span>
        <i />
      </div>

      {/* One-time cinematic opening */}
      {playingIntro ? <HeroLogoIntro onComplete={handleIntroComplete} /> : null}
    </section>
  );
}
