"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { setLenis } from "@/lib/lenis";
import { registerGsap, ScrollTrigger } from "@/lib/animations";
import { prefersReducedMotion } from "@/lib/utils";

/**
 * Initialises Lenis smooth scroll globally and wires it into GSAP ScrollTrigger.
 * - drives Lenis through a single requestAnimationFrame loop
 * - keeps ScrollTrigger in sync on every scroll tick
 * - respects prefers-reduced-motion (skips smoothing entirely)
 * - cleans up the instance + rAF on unmount
 */
export default function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (prefersReducedMotion()) {
      document.documentElement.classList.add("reduced");
      return;
    }

    registerGsap();

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    setLenis(lenis);

    lenis.on("scroll", ScrollTrigger.update);

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // Lenis + ScrollTrigger play nicest when ST drives off the rAF clock.
    const onRefresh = () => lenis.resize();
    ScrollTrigger.addEventListener("refresh", onRefresh);
    ScrollTrigger.refresh();

    return () => {
      cancelAnimationFrame(raf);
      ScrollTrigger.removeEventListener("refresh", onRefresh);
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  return <>{children}</>;
}
