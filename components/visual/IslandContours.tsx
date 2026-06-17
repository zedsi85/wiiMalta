"use client";

import { useEffect, useMemo, useRef } from "react";
import { prefersReducedMotion } from "@/lib/utils";

/**
 * Wii Event Malta — IslandContours.
 *
 * The Malta / Mediterranean identity: thin, abstract topographic + sea-current
 * lines (organic concentric contours, not a tourist map). SVG for crisp, cheap
 * rendering; slow stroke-dash drift via CSS; optional scroll parallax via a tiny
 * passive scroll listener (no GSAP dependency, keeps content pages light).
 * Off-white / deep blue / warm gold. pointer-events: none.
 */
export type IslandContoursProps = {
  variant?: "malta" | "mediterranean" | "abstract";
  opacity?: number;
  animated?: boolean;
  parallax?: boolean;
  className?: string;
};

type Line = { d: string; c: string; w: number };

const BONE = "rgba(239,231,214,0.85)";
const AZURE = "rgba(46,107,255,0.8)";
const GOLD = "rgba(216,176,90,0.85)";

/** Organic closed contour (island-like) — radius perturbed by a couple harmonics. */
function ring(cx: number, cy: number, r: number, seed: number, squash = 0.74): string {
  const steps = 72;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const rr = r * (1 + 0.17 * Math.sin(a * 3 + seed) + 0.09 * Math.sin(a * 5 - seed * 1.3));
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr * squash;
    d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1) + " ";
  }
  return d + "Z";
}

/** Long sea-current line across the field. */
function sea(y: number, amp: number, seed: number): string {
  const steps = 48;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const x = -60 + (i / steps) * 1320;
    const yy = y + Math.sin(i * 0.4 + seed) * amp + Math.sin(i * 0.13 - seed) * amp * 0.5;
    d += (i ? "L" : "M") + x.toFixed(1) + " " + yy.toFixed(1) + " ";
  }
  return d;
}

function build(variant: NonNullable<IslandContoursProps["variant"]>): Line[] {
  const cx = 760;
  const cy = 430;
  const out: Line[] = [];

  if (variant === "mediterranean") {
    out.push({ d: sea(180, 26, 0.4), c: AZURE, w: 1 });
    out.push({ d: sea(330, 34, 1.7), c: BONE, w: 1 });
    out.push({ d: sea(500, 30, 3.1), c: AZURE, w: 1 });
    out.push({ d: sea(640, 24, 4.4), c: GOLD, w: 1 });
    out.push({ d: ring(360, 300, 120, 0.8), c: BONE, w: 1 });
    out.push({ d: ring(360, 300, 80, 0.8), c: AZURE, w: 1 });
    return out;
  }

  // malta + abstract — nested island contours + a few currents
  const seed = variant === "abstract" ? 1.2 : 0.7;
  out.push({ d: ring(cx, cy, 300, seed), c: BONE, w: 1 });
  out.push({ d: ring(cx, cy, 240, seed), c: AZURE, w: 1 });
  out.push({ d: ring(cx, cy, 180, seed), c: BONE, w: 1 });
  out.push({ d: ring(cx, cy, 120, seed), c: GOLD, w: 1 });
  out.push({ d: sea(150, 22, 2.2), c: BONE, w: 1 });
  out.push({ d: sea(690, 26, 3.6), c: AZURE, w: 1 });
  // a small secondary island (Gozo / Comino energy)
  out.push({ d: ring(250, 250, 90, 1.9), c: BONE, w: 1 });
  out.push({ d: ring(250, 250, 50, 1.9), c: GOLD, w: 1 });
  return out;
}

export default function IslandContours({
  variant = "malta",
  opacity = 0.18,
  animated = true,
  parallax = false,
  className,
}: IslandContoursProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const lines = useMemo(() => build(variant), [variant]);

  useEffect(() => {
    if (!parallax || prefersReducedMotion()) return;
    const svg = svgRef.current;
    const host = svg?.parentElement;
    if (!svg || !host) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = host.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      // -1 (below) → 1 (above) as the host scrolls through the viewport
      const p = (r.top + r.height / 2 - vh / 2) / vh;
      svg.style.transform = `translate3d(0, ${(p * -16).toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [parallax]);

  return (
    <div className={className} aria-hidden="true" style={{ overflow: "hidden", pointerEvents: "none" }}>
      <svg
        ref={svgRef}
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        style={{
          position: "absolute",
          left: 0,
          top: "-8%",
          width: "100%",
          height: "116%",
          opacity,
          willChange: parallax ? "transform" : undefined,
        }}
      >
        <g className="ic-group">
          {lines.map((p, i) => (
            <path
              key={i}
              d={p.d}
              stroke={p.c}
              strokeWidth={p.w}
              fill="none"
              className={animated ? `ic-line ic-line-${i % 4}` : undefined}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
