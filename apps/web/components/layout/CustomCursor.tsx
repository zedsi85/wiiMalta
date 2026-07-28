"use client";

import { useEffect } from "react";
import { hasFinePointer, prefersReducedMotion } from "@/lib/utils";

/**
 * Custom glow cursor: a soft trailing ring + an ember dot.
 * - expands over links/buttons (`is-link`)
 * - shows a contextual label over `[data-card]` elements ("View Event" …)
 * - disabled entirely on touch / coarse-pointer devices
 *
 * Magnetic CTAs are handled by <MagneticButton/>; this only owns the cursor.
 */
export default function CustomCursor() {
  useEffect(() => {
    if (!hasFinePointer()) return;

    document.body.classList.add("has-custom-cursor");

    const ring = document.getElementById("cursor");
    const dot = document.getElementById("cursor-dot");
    const label = document.getElementById("cursor-label");
    if (!ring || !dot || !label) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let cx = mx;
    let cy = my;
    let dx = mx;
    let dy = my;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const reduced = prefersReducedMotion();
    const loop = () => {
      const ease = reduced ? 1 : 0.18;
      const easeDot = reduced ? 1 : 0.55;
      cx += (mx - cx) * ease;
      cy += (my - cy) * ease;
      dx += (mx - dx) * easeDot;
      dy += (my - dy) * easeDot;
      ring.style.transform = `translate(${cx}px,${cy}px)`;
      dot.style.transform = `translate(${dx}px,${dy}px)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // Hover state binding. We rebind on each mutation-free pass via event
    // delegation so dynamically rendered cards still light up.
    const onOver = (e: Event) => {
      const t = (e.target as HTMLElement)?.closest<HTMLElement>(
        "a, button, [data-cursor], [data-card]"
      );
      if (!t) return;
      if (t.hasAttribute("data-card")) {
        ring.classList.add("is-card");
        ring.classList.remove("is-link");
        label.textContent = t.getAttribute("data-card") || "";
      } else {
        ring.classList.add("is-link");
      }
    };
    const onOut = (e: Event) => {
      const t = (e.target as HTMLElement)?.closest<HTMLElement>(
        "a, button, [data-cursor], [data-card]"
      );
      if (!t) return;
      if (t.hasAttribute("data-card")) {
        ring.classList.remove("is-card");
        label.textContent = "";
      } else {
        ring.classList.remove("is-link");
      }
    };
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);

    const onLeave = (e: MouseEvent) => {
      if (!e.relatedTarget) {
        ring.style.opacity = "0";
        dot.style.opacity = "0";
      }
    };
    const onEnter = () => {
      ring.style.opacity = "1";
      dot.style.opacity = "1";
    };
    window.addEventListener("mouseout", onLeave);
    window.addEventListener("mouseover", onEnter);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      window.removeEventListener("mouseout", onLeave);
      window.removeEventListener("mouseover", onEnter);
      document.body.classList.remove("has-custom-cursor");
    };
  }, []);

  return (
    <>
      <div id="cursor" aria-hidden="true">
        <span id="cursor-label" />
      </div>
      <div id="cursor-dot" aria-hidden="true" />
    </>
  );
}
