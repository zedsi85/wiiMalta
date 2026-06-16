"use client";

import { useEffect, useRef } from "react";
import "./cinema.css";
import { HeroSection } from "@/components/sections/HeroSection";
import { UpcomingEventsSection } from "@/components/sections/UpcomingEventsSection";
import { BrandStatementSection } from "@/components/sections/BrandStatementSection";
import { TicketingExperienceSection } from "@/components/sections/TicketingExperienceSection";
import { CommunityAccessSection } from "@/components/sections/CommunityAccessSection";
import { PreviousMomentsSection } from "@/components/sections/PreviousMomentsSection";
import { EventFormatsSection } from "@/components/sections/EventFormatsSection";
import { FinalCTASection } from "@/components/sections/FinalCTASection";
import { buildHomeTimeline, createRevealScanner } from "@/lib/animations";
import { getLenis } from "@/lib/lenis";
import { hasFinePointer, prefersReducedMotion } from "@/lib/utils";
import type { Mood } from "@/styles/tokens";

/**
 * Wii Event Malta — cinematic homepage. Nine "chapters" scroll like a film:
 * Enter the Night → Next Drop → Not Just Events → Event Formats → Ticketing →
 * Community Access → Previous Moments → Partners → Final CTA.
 *
 * This client component owns the scroll choreography: Lenis (from the provider)
 * drives GSAP ScrollTrigger via buildHomeTimeline; a reveal scanner fires the
 * [data-rise] entrances; per-section moods cross-fade the WebGL background.
 */
export default function HomePage() {
  const scope = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") window.__wiiMood = "hero";
  }, []);

  useEffect(() => {
    const el = scope.current;
    if (!el) return;

    const reveal = createRevealScanner(el);
    const lenis = getLenis();
    if (lenis) lenis.on("scroll", reveal.scan);

    const ctx = buildHomeTimeline(el, (mood: string) => {
      window.__wiiMood = mood as Mood;
      window.__wiiSetMood?.(mood as Mood);
    });

    // Community pass — pointer-driven 3D tilt + idle drift (fine pointers only).
    let cleanupTilt: (() => void) | undefined;
    if (hasFinePointer() && !prefersReducedMotion()) {
      const stage = el.querySelector<HTMLElement>(".community-stage");
      const card = el.querySelector<HTMLElement>(".pass-card");
      if (stage && card) {
        const onMove = (e: PointerEvent) => {
          const r = stage.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform = `rotateY(${px * 26}deg) rotateX(${-py * 20}deg)`;
        };
        const onLeave = () => {
          card.style.transform = "";
        };
        stage.addEventListener("pointermove", onMove);
        stage.addEventListener("pointerleave", onLeave);
        cleanupTilt = () => {
          stage.removeEventListener("pointermove", onMove);
          stage.removeEventListener("pointerleave", onLeave);
        };
      }
    }

    return () => {
      reveal.destroy();
      ctx.revert();
      cleanupTilt?.();
    };
  }, []);

  return (
    <main ref={scope}>
      <HeroSection />
      <UpcomingEventsSection />
      <BrandStatementSection />
      <TicketingExperienceSection />
      <CommunityAccessSection />
      <PreviousMomentsSection />
      <EventFormatsSection />
      <FinalCTASection />
    </main>
  );
}
