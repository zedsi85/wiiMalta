"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, registerGsap } from "@/lib/animations";
import { prefersReducedMotion } from "@/lib/utils";

/**
 * Chapter — Brand Statement / Scroll Words.
 *
 * A cinematic, scroll-driven manifesto: oversized words reveal one by one (scrub
 * + stagger) while a few drift horizontally for an editorial feel. Malta-first,
 * event/ticketing focused — no Tunisia / team / partner content here.
 *
 * Self-contained: owns its GSAP context (cleaned up on unmount) and honours
 * prefers-reduced-motion by showing everything statically.
 */
const WORDS: { t: string; alt?: boolean; h: number }[] = [
  { t: "SOUND", h: -1 },
  { t: "PEOPLE", alt: true, h: 1 },
  { t: "ISLAND", h: -1 },
  { t: "TICKETS", alt: true, h: 1 },
  { t: "COMMUNITY", h: -1 },
  { t: "NIGHT", alt: true, h: 1 },
];

export function BrandStatementSection() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    registerGsap();

    const ctx = gsap.context(() => {
      const words = gsap.utils.toArray<HTMLElement>(".brand-word");
      const reveals = gsap.utils.toArray<HTMLElement>(".bs-reveal");

      if (prefersReducedMotion()) {
        gsap.set([...words, ...reveals], { opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)" });
        return;
      }

      // Lead / copy / close lines — fade + rise as each enters view.
      reveals.forEach((node) => {
        gsap.fromTo(
          node,
          { opacity: 0, y: 42 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: { trigger: node, start: "top 85%" },
          }
        );
      });

      // Words reveal one by one as the section scrolls (scrub + stagger).
      gsap.fromTo(
        words,
        { opacity: 0.06, y: 80, scale: 0.94, filter: "blur(12px)" },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          stagger: 0.18,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 72%",
            end: "bottom 55%",
            scrub: 1,
          },
        }
      );

      // Horizontal editorial drift (desktop only — kept calm on mobile).
      if (window.innerWidth >= 768) {
        words.forEach((w) => {
          const dir = Number(w.dataset.h) || 0;
          gsap.fromTo(
            w,
            { xPercent: dir * 9 },
            {
              xPercent: dir * -14,
              ease: "none",
              scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
            }
          );
        });
      }

      ScrollTrigger.refresh();
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section id="statement" ref={ref} className="chapter chapter-statement" data-mood="statement">
      <div className="bs-glow" aria-hidden="true" />

      <p className="bs-lead bs-reveal">
        Not just events.
      </p>

      <div className="statement-words">
        {WORDS.map((w) => (
          <div key={w.t} className={`sw brand-word${w.alt ? " alt" : ""}`} data-h={w.h}>
            {w.t}
          </div>
        ))}
      </div>

      <div className="bs-copy-wrap">
        <p className="bs-main bs-reveal">
          Curated nights built around sound, people, places <em>&</em> community.
        </p>
        <p className="bs-sub bs-reveal">
          From the first drop to the last track, Wii Event Malta connects music, ticketing, access and
          Mediterranean nightlife into one digital experience.
        </p>
        <p className="bs-close bs-reveal">
          The next night starts <em>before</em> the first ticket is sold.
        </p>
      </div>
    </section>
  );
}
