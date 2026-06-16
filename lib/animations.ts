/**
 * Wii Event Malta — GSAP / ScrollTrigger helpers.
 *
 * Centralises plugin registration and the reusable scroll choreography so the
 * section components stay declarative. Everything here is client-only and bails
 * out cleanly under `prefers-reduced-motion`. Each helper returns a teardown
 * function (or registers inside a provided gsap.context) so callers can clean up.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "./utils";

let registered = false;

/** Register ScrollTrigger once (client-side). */
export function registerGsap() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

export { gsap, ScrollTrigger };

/**
 * Lightweight, bulletproof reveal scanner. Rather than relying solely on
 * IntersectionObserver, we scan `[data-rise]` elements against the viewport and
 * add `.in`. Fires reliably in any environment (incl. Lenis-driven scroll).
 */
export function createRevealScanner(root: Document | HTMLElement = document) {
  if (prefersReducedMotion()) {
    root.querySelectorAll<HTMLElement>("[data-rise]").forEach((el) => el.classList.add("in"));
    return { scan: () => {}, destroy: () => {} };
  }

  const show = (el: HTMLElement) => {
    if (el.dataset.shown) return;
    el.dataset.shown = "1";
    el.classList.add("in");
  };

  const scan = () => {
    const vh = window.innerHeight || 800;
    root
      .querySelectorAll<HTMLElement>("[data-rise]:not([data-shown])")
      .forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.93 && r.bottom > -10) show(el);
      });
  };

  // Pump for the first ~1.8s to catch late layout, then rely on scroll/resize.
  const start = performance.now();
  const pump = (now: number) => {
    scan();
    if (now - start < 1800) requestAnimationFrame(pump);
  };
  requestAnimationFrame(pump);
  window.addEventListener("scroll", scan, { passive: true });
  window.addEventListener("resize", scan);

  return {
    scan,
    destroy: () => {
      window.removeEventListener("scroll", scan);
      window.removeEventListener("resize", scan);
    },
  };
}

/** Tag a set of elements for staggered reveal (sets --i and data-rise). */
export function tagStagger(selector: string, stride = 8, root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>(selector).forEach((el, i) => {
    el.setAttribute("data-rise", "");
    el.style.setProperty("--i", String(i % stride));
  });
}

/**
 * Build the homepage's cinematic ScrollTrigger choreography inside a gsap.context
 * scoped to `scope`. Returns the context for cleanup via `ctx.revert()`.
 *
 * @param onMood called with the active section's `data-mood` so the WebGL
 *               background can cross-fade its palette.
 */
export function buildHomeTimeline(
  scope: HTMLElement,
  onMood: (mood: string) => void
) {
  registerGsap();
  const reduced = prefersReducedMotion();

  const ctx = gsap.context(() => {
    if (!reduced) {
      // Statement words — horizontal parallax
      gsap.utils.toArray<HTMLElement>(".sw").forEach((w) => {
        const sp = parseFloat(w.dataset.speed || "0") || 0;
        gsap.fromTo(
          w,
          { xPercent: sp * -1.2 },
          {
            xPercent: sp * 1.2,
            ease: "none",
            scrollTrigger: {
              trigger: ".chapter-statement",
              start: "top bottom",
              end: "bottom top",
              scrub: 1,
            },
          }
        );
      });

      // Poster parallax (subtle, vertical)
      gsap.utils.toArray<HTMLElement>(".ev-poster .pp, .fmt .pp").forEach((pp) => {
        gsap.fromTo(
          pp,
          { yPercent: -6 },
          {
            yPercent: 6,
            ease: "none",
            scrollTrigger: { trigger: pp, start: "top bottom", end: "bottom top", scrub: true },
          }
        );
      });

      // Phone parallax + tilt
      gsap.fromTo(
        "#phone .phone-shell",
        { y: 55, rotateX: 10, rotateY: -8 },
        {
          y: -30,
          rotateX: 4,
          rotateY: 6,
          ease: "none",
          scrollTrigger: { trigger: "#ticketing", start: "top bottom", end: "bottom top", scrub: 1 },
        }
      );

      // Orbiting perk chips — gentle float loops (never hide content)
      gsap.utils.toArray<HTMLElement>(".orbit").forEach((o, i) => {
        gsap.to(o, {
          y: i % 2 ? 16 : -16,
          duration: 3 + i * 0.4,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      });

      // Gallery — pinned horizontal scroll
      const track = scope.querySelector<HTMLElement>("#galleryTrack");
      if (track) {
        const dist = () => Math.max(0, track.scrollWidth - window.innerWidth + 80);
        gsap.to(track, {
          x: () => -dist(),
          ease: "none",
          scrollTrigger: {
            trigger: "#gallery",
            start: "top top",
            end: () => "+=" + dist(),
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });
      }
    }

    // Per-section mood → drives the WebGL background palette
    scope.querySelectorAll<HTMLElement>(".chapter[data-mood]").forEach((sec) => {
      ScrollTrigger.create({
        trigger: sec,
        start: "top 55%",
        end: "bottom 45%",
        onToggle: (self) => {
          if (self.isActive) onMood(sec.dataset.mood || "hero");
        },
      });
    });

    ScrollTrigger.refresh();
  }, scope);

  // Keep scrub positions correct across font / image load
  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener("load", refresh);
  if (document.fonts?.ready) document.fonts.ready.then(refresh);

  return ctx;
}
