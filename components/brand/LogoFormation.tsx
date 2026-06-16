"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { prefersReducedMotion } from "@/lib/utils";

/**
 * Wii Event Malta — LogoFormation.
 *
 * A cinematic brand moment: three Mediterranean / event symbols animate in and
 * converge into the Wii mark.
 *
 *   Sun   → Mediterranean warmth, sunset sessions, island energy
 *   Sea   → Tunisia, Malta, the Mediterranean, movement & destination culture
 *   Sound → music, nightlife, rhythm, community
 *
 *   Sun + Sea + Sound = Wii Event Malta
 *
 * Built with SVG + a GSAP timeline (more performant than doing it in Three.js).
 * Honours prefers-reduced-motion by snapping straight to the resolved lockup.
 */
export type LogoFormationProps = {
  variant?: "hero" | "compact" | "watermark";
  autoplay?: boolean;
  showTagline?: boolean;
  className?: string;
};

export function LogoFormation({
  variant = "hero",
  autoplay = true,
  showTagline = true,
  className,
}: LogoFormationProps) {
  const root = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const q = gsap.utils.selector(el);
    const reduced = prefersReducedMotion();

    // Resolved-state targets
    const sun = q("#lf-sun");
    const sunGlow = q("#lf-sun-glow");
    const sea = q("#lf-sea");
    const sound = q("#lf-sound");
    const ingredients = q(".lf-ingredient");
    const mark = q("#lf-mark");
    const word = q("#lf-word");
    const tagline = q("#lf-tagline");

    if (reduced || !autoplay) {
      gsap.set([sun, sunGlow, sea, sound], { opacity: 0 });
      gsap.set([mark, word], { opacity: 1, scale: 1 });
      gsap.set(tagline, { opacity: showTagline ? 1 : 0, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      // Initial states
      gsap.set(sun, { scale: 0, opacity: 0, transformOrigin: "center" });
      gsap.set(sunGlow, { scale: 0.4, opacity: 0, transformOrigin: "center" });
      gsap.set([sea, sound], { opacity: 1 });
      // Stroke-draw setup (pathLength normalised to 1 in the SVG markup)
      gsap.set([sea, sound], { strokeDasharray: 1, strokeDashoffset: 1 });
      gsap.set(mark, { opacity: 0, scale: 0.78, transformOrigin: "center" });
      gsap.set(word, { opacity: 0, y: 10 });
      gsap.set(tagline, { opacity: 0, y: 12 });

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      // Step 1 — Sun rises
      tl.to(sunGlow, { opacity: 0.9, scale: 1, duration: 0.9, ease: "power2.out" }, 0.1)
        .to(sun, { opacity: 1, scale: 1, duration: 0.8, ease: "back.out(1.7)" }, 0.2)
        // gentle sun pulse
        .to(sunGlow, { scale: 1.12, opacity: 0.6, duration: 1.4, ease: "sine.inOut", yoyo: true, repeat: 1 }, 0.9);

      // Step 2 — Sea wave flows in (left → right)
      tl.to(sea, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut" }, 0.5);

      // Step 3 — Sound wave draws + a rhythmic flicker
      tl.to(sound, { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut" }, 0.95)
        .to(sound, { opacity: 0.55, duration: 0.18, yoyo: true, repeat: 3, ease: "none" }, 1.6);

      // Step 4 — Elements converge + dissolve into the mark
      tl.to(
        ingredients,
        { scale: 0.82, opacity: 0, duration: 0.7, transformOrigin: "center", ease: "power2.in" },
        2.05
      );

      // Step 5 — Logo resolves
      tl.to(mark, { opacity: 1, scale: 1, duration: 0.7, ease: "back.out(1.4)" }, 2.3)
        .to(word, { opacity: 1, y: 0, duration: 0.6 }, 2.55);

      if (showTagline) tl.to(tagline, { opacity: 1, y: 0, duration: 0.6 }, 2.8);

      // Optional: nudge the WebGL background brighter as the logo resolves
      // (Tunisia-warm → Malta-night handoff lives in the page mood system).
      tl.add(() => {
        window.dispatchEvent(new CustomEvent("wii:logo-formed"));
      }, 2.7);
    }, el);

    return () => ctx.revert();
  }, [autoplay, showTagline, variant]);

  const tagText =
    variant === "watermark" ? "" : "Sun. Sea. Sound.";

  return (
    <svg
      ref={root}
      className={className}
      viewBox="0 0 420 230"
      fill="none"
      role="img"
      aria-label="Wii Event Malta — Sun, Sea, Sound"
      style={{ width: "100%", height: "auto", overflow: "visible" }}
    >
      <defs>
        <radialGradient id="lf-sun-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD9A0" />
          <stop offset="45%" stopColor="#FF6A2B" />
          <stop offset="100%" stopColor="#C42C06" />
        </radialGradient>
        <radialGradient id="lf-glow-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,106,43,0.55)" />
          <stop offset="70%" stopColor="rgba(255,77,31,0.12)" />
          <stop offset="100%" stopColor="rgba(255,77,31,0)" />
        </radialGradient>
        <linearGradient id="lf-sea-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2E6BFF" />
          <stop offset="100%" stopColor="#3FD2C7" />
        </linearGradient>
        <linearGradient id="lf-sound-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#9A6CF0" />
          <stop offset="100%" stopColor="#FBF8F1" />
        </linearGradient>
      </defs>

      {/* ---- INGREDIENTS (animate, then dissolve) ---- */}
      <g className="lf-ingredient">
        <circle id="lf-sun-glow" cx="210" cy="96" r="64" fill="url(#lf-glow-grad)" />
      </g>
      <g className="lf-ingredient">
        <circle id="lf-sun" cx="210" cy="96" r="30" fill="url(#lf-sun-grad)" />
      </g>
      <path
        id="lf-sea"
        className="lf-ingredient"
        d="M120 128 q22.5 -16 45 0 t45 0 t45 0 t45 0"
        stroke="url(#lf-sea-grad)"
        strokeWidth="3.4"
        strokeLinecap="round"
        pathLength={1}
      />
      <path
        id="lf-sound"
        className="lf-ingredient"
        d="M120 150 l14 0 l6 -20 l8 38 l8 -52 l8 64 l8 -40 l6 10 l66 0"
        stroke="url(#lf-sound-grad)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
      />

      {/* ---- RESOLVED LOCKUP ---- */}
      <g id="lf-mark" transform="translate(180,56)">
        <g transform="scale(0.6)">
          <circle cx="50" cy="50" r="46" stroke="var(--bone)" strokeWidth="3.2" />
          <path d="M34 53 A16 16 0 0 1 66 53 Z" fill="var(--bone)" />
          <path d="M13 53 q9.25 -7 18.5 0 t18.5 0 t18.5 0 t18.5 0" stroke="var(--bone)" strokeWidth="3.2" strokeLinecap="round" />
          <path d="M24 64 q13 -5 26 0 t26 0" stroke="var(--bone)" strokeWidth="3.2" strokeLinecap="round" opacity="0.55" />
        </g>
      </g>

      <text
        id="lf-word"
        x="210"
        y="158"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontWeight="900"
        fontSize="40"
        letterSpacing="-1"
        fill="var(--bone)"
      >
        WII
      </text>

      {showTagline ? (
        <text
          id="lf-tagline"
          x="210"
          y="186"
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontWeight="700"
          fontSize="11"
          letterSpacing="5"
          fill="var(--ember-300)"
        >
          {tagText.toUpperCase()}
        </text>
      ) : null}
    </svg>
  );
}
