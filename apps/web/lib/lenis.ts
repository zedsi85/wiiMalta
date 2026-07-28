/**
 * Wii Event Malta — Lenis smooth-scroll singleton.
 *
 * A single Lenis instance is shared across the app so GSAP ScrollTrigger and the
 * reveal scanner can subscribe to one source of truth. `SmoothScrollProvider`
 * owns the lifecycle; helpers here keep imports tidy.
 */
import Lenis from "lenis";

let instance: Lenis | null = null;

export function getLenis(): Lenis | null {
  return instance;
}

export function setLenis(l: Lenis | null) {
  instance = l;
}

/** Smoothly scroll to an element or selector via the active Lenis instance. */
export function scrollTo(
  target: string | HTMLElement,
  opts: { offset?: number; duration?: number } = {}
) {
  if (instance) {
    instance.scrollTo(target, { offset: opts.offset ?? 0, duration: opts.duration ?? 1.3 });
    return;
  }
  // Fallback for reduced-motion / no-Lenis environments.
  const el =
    typeof target === "string" ? document.querySelector(target) : target;
  if (el) {
    window.scrollTo({
      top: (el as HTMLElement).getBoundingClientRect().top + window.scrollY + (opts.offset ?? 0),
      behavior: "smooth",
    });
  }
}
