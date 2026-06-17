"use client";

import { useEffect, useRef } from "react";
import { gsap, registerGsap } from "@/lib/animations";
import { getLenis } from "@/lib/lenis";

/**
 * Wii Event Malta — HeroLogoIntro.
 *
 * A one-time, full-screen opening: the Sun + Sea + Sound formation plays centred
 * over the live hero atmosphere, zooms, then scales/translates down into the
 * hero's logo slot while the hero content (Malta After Dark + CTAs + Next Drop)
 * staggers in. Total ~3s.
 *
 * - Measures the real `.hero-logo-inline` slot at runtime so the settle lands in
 *   the right place at any breakpoint (manual transform — no Flip dependency).
 * - Locks scroll (Lenis) and fades the navbar out for the duration.
 * - Owns a GSAP context (reverted on unmount). A safety timeout guarantees the
 *   hero is revealed even if the timeline is interrupted.
 *
 * The caller decides whether to play it (session flag + reduced-motion); this
 * component just runs and calls `onComplete`.
 */
export function HeroLogoIntro({ onComplete }: { onComplete: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);
  // Keep the latest onComplete without re-running the timeline effect. The hero
  // re-renders every second (countdown), so depending on `onComplete` here would
  // rebuild the timeline each tick and it would never finish.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) {
      onCompleteRef.current?.();
      return;
    }
    registerGsap();

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      try {
        sessionStorage.setItem("wiiHeroIntroPlayed", "true");
      } catch {
        /* private mode — fine, it just replays */
      }
      document.body.classList.remove("intro-playing");
      document.body.style.overflow = "";
      getLenis()?.start();
      onCompleteRef.current?.();
    };

    // Hold the user still + drop the nav while the intro plays.
    document.body.classList.add("intro-playing");
    document.body.style.overflow = "hidden";
    getLenis()?.stop();

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(overlay);
      const lockup = overlay.querySelector<HTMLElement>(".intro-lockup");
      if (!lockup) {
        finish();
        return;
      }
      const sunGlow = q(".intro-sun-glow");
      const sun = q(".intro-sun");
      const sea = q(".intro-sea");
      const sound = q(".intro-sound");
      const words = q(".intro-word");

      const heroLogo = document.querySelector<HTMLElement>(".hero-logo-inline");
      const heroContent = gsap.utils.toArray<HTMLElement>(".hero-main-content > *");

      // Initial states
      gsap.set(lockup, { scale: 1, x: 0, y: 0, transformOrigin: "50% 50%" });
      gsap.set(sunGlow, { scale: 0.4, opacity: 0, transformOrigin: "center" });
      gsap.set(sun, { scale: 0.4, opacity: 0, filter: "blur(16px)", transformOrigin: "center" });
      gsap.set([sea, sound], { strokeDasharray: 1, strokeDashoffset: 1, opacity: 0 });
      gsap.set(words, { y: 30, opacity: 0, filter: "blur(8px)" });
      if (heroLogo) gsap.set(heroLogo, { opacity: 0 });
      if (heroContent.length) gsap.set(heroContent, { opacity: 0, y: 24 });

      // Measure the settle target (lockup is at scale 1 right now).
      let tx = 0;
      let ty = -window.innerHeight * 0.26;
      let tScale = 0.42;
      if (heroLogo) {
        const lr = lockup.getBoundingClientRect();
        const sr = heroLogo.getBoundingClientRect();
        if (lr.width && sr.width) {
          tx = sr.left + sr.width / 2 - (lr.left + lr.width / 2);
          ty = sr.top + sr.height / 2 - (lr.top + lr.height / 2);
          tScale = Math.min(1, sr.width / lr.width);
        }
      }

      const tl = gsap.timeline({ defaults: { ease: "power3.out" }, onComplete: finish });
      // 1 — sun rises
      tl.to(sunGlow, { scale: 1, opacity: 0.9, duration: 0.55 }, 0.0);
      tl.to(sun, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.6, ease: "back.out(1.6)" }, 0.05);
      // 2 — sea draws
      tl.to(sea, { strokeDashoffset: 0, opacity: 1, duration: 0.65 }, 0.4);
      // 3 — sound draws
      tl.to(sound, { strokeDashoffset: 0, opacity: 1, duration: 0.65 }, 0.7);
      // 4 — words appear one by one
      tl.to(words, { y: 0, opacity: 1, filter: "blur(0px)", stagger: 0.12, duration: 0.45 }, 1.05);
      // 5 — immersive zoom
      tl.to(lockup, { scale: 1.16, duration: 0.35, ease: "power2.inOut" }, 1.7);
      // 6 — settle into the hero logo slot (words fade away first)
      tl.to(words, { opacity: 0, duration: 0.3, ease: "power2.in" }, 1.95);
      tl.to(lockup, { x: tx, y: ty, scale: tScale, duration: 0.72, ease: "power4.inOut" }, 2.05);
      // 7 — reveal the real hero logo + content
      if (heroLogo) tl.to(heroLogo, { opacity: 1, duration: 0.4 }, 2.45);
      if (heroContent.length)
        tl.to(heroContent, { opacity: 1, y: 0, stagger: 0.1, duration: 0.6, ease: "power3.out" }, 2.5);
      tl.add(() => document.body.classList.remove("intro-playing"), 2.45);
      // 8 — dissolve the overlay
      tl.to(overlay, { opacity: 0, duration: 0.4 }, 2.8);
    }, overlay);

    const safety = window.setTimeout(finish, 4200);

    return () => {
      window.clearTimeout(safety);
      ctx.revert();
      document.body.classList.remove("intro-playing");
      document.body.style.overflow = "";
      getLenis()?.start();
    };
    // Run exactly once on mount — never rebuild on parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="intro-overlay" ref={overlayRef} aria-hidden="true">
      <div className="intro-stage">
        <div className="intro-lockup">
          <svg className="intro-graphic" viewBox="0 0 460 180" fill="none">
            <defs>
              <radialGradient id="i-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255,106,43,0.6)" />
                <stop offset="70%" stopColor="rgba(255,77,31,0.12)" />
                <stop offset="100%" stopColor="rgba(255,77,31,0)" />
              </radialGradient>
              <radialGradient id="i-sun" cx="50%" cy="45%" r="55%">
                <stop offset="0%" stopColor="#FFD9A0" />
                <stop offset="45%" stopColor="#FF6A2B" />
                <stop offset="100%" stopColor="#C42C06" />
              </radialGradient>
              <linearGradient id="i-sea" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#2E6BFF" />
                <stop offset="100%" stopColor="#3FD2C7" />
              </linearGradient>
              <linearGradient id="i-sound" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#9A6CF0" />
                <stop offset="100%" stopColor="#FBF8F1" />
              </linearGradient>
            </defs>
            <circle className="intro-sun-glow" cx="230" cy="84" r="78" fill="url(#i-glow)" />
            <circle className="intro-sun" cx="230" cy="84" r="36" fill="url(#i-sun)" />
            <path
              className="intro-sea"
              d="M120 124 q27.5 -20 55 0 t55 0 t55 0 t55 0"
              stroke="url(#i-sea)"
              strokeWidth="4"
              strokeLinecap="round"
              pathLength={1}
            />
            <path
              className="intro-sound"
              d="M120 152 l18 0 l8 -26 l10 48 l10 -64 l10 80 l10 -50 l8 12 l78 0"
              stroke="url(#i-sound)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
            />
          </svg>
          <div className="intro-words">
            <span className="intro-word">Sun.</span>
            <span className="intro-word">Sea.</span>
            <span className="intro-word">Sound.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
