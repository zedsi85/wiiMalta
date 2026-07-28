"use client";

import { useEffect, useRef } from "react";
import { hasFinePointer, prefersReducedMotion } from "@/lib/utils";

/**
 * Wii Event Malta — AccessParticles.
 *
 * The ticketing / access layer: tiny ticket strips, QR-like squares and minimal
 * glowing dots drifting through the night. Near the cursor they gather + brighten
 * (e.g. over a tier card or a "Buy Tickets" CTA). Canvas 2D, offscreen-paused,
 * pointer-events: none, reduced density on mobile, reduced-motion safe.
 */
export type AccessParticlesProps = {
  density?: number;
  opacity?: number;
  mode?: "tickets" | "community" | "checkout";
  interactive?: boolean;
  className?: string;
};

const PALETTES: Record<NonNullable<AccessParticlesProps["mode"]>, string[]> = {
  tickets: ["255,77,31", "216,176,90", "239,231,214"],
  community: ["123,54,227", "46,107,255", "239,231,214"],
  checkout: ["239,231,214", "46,107,255"],
};

export default function AccessParticles({
  density = 60,
  opacity = 0.22,
  mode = "tickets",
  interactive = true,
  className,
}: AccessParticlesProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = prefersReducedMotion();
    const fine = hasFinePointer();
    const mobile = window.innerWidth < 768;
    const count = Math.max(8, Math.round(density * (mobile ? 0.5 : 1)));
    const palette = PALETTES[mode];
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const parent = canvas.parentElement || canvas;
    let w = 0;
    let h = 0;

    const resize = () => {
      const r = parent.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    type P = {
      x: number; y: number; vx: number; vy: number;
      s: number; rot: number; vr: number; type: number; color: string; a: number;
    };
    const make = (): P => {
      const t = Math.random();
      const type = t < 0.5 ? 0 : t < 0.78 ? 1 : 2; // 0 ticket strip · 1 QR square · 2 dot
      return {
        x: rand(0, w || 300),
        y: rand(0, h || 300),
        vx: rand(-4, 4),
        vy: rand(-12, -3),
        s: type === 2 ? rand(1.4, 2.6) : rand(5, 11),
        rot: rand(0, Math.PI),
        vr: rand(-0.3, 0.3),
        type,
        color: palette[Math.floor(Math.random() * palette.length)],
        a: rand(0.4, 1),
      };
    };
    const ps: P[] = Array.from({ length: count }, make);

    const mouse = { x: -999, y: -999, on: false };
    const onMove = (e: PointerEvent) => {
      const r = parent.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.on = true;
    };
    const onLeave = () => {
      mouse.on = false;
    };
    if (interactive && fine) {
      window.addEventListener("pointermove", onMove, { passive: true });
      parent.addEventListener("pointerleave", onLeave);
    }

    const R = 150;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        let a = p.a;
        if (mouse.on) {
          const d = Math.hypot(mouse.x - p.x, mouse.y - p.y);
          if (d < R) a = Math.min(1, p.a + (1 - d / R) * 0.7);
        }
        ctx.save();
        ctx.globalAlpha = Math.min(1, opacity * a);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = `rgb(${p.color})`;
        if (p.type === 2) {
          ctx.beginPath();
          ctx.arc(0, 0, p.s, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 1) {
          // QR-like square with a small inner notch
          ctx.strokeStyle = `rgb(${p.color})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(-p.s / 2, -p.s / 2, p.s, p.s);
          ctx.fillRect(-p.s / 2, -p.s / 2, p.s * 0.34, p.s * 0.34);
          ctx.fillRect(p.s * 0.16, p.s * 0.16, p.s * 0.34, p.s * 0.34);
        } else {
          // ticket / wristband strip
          ctx.fillRect(-p.s / 2, -p.s / 6, p.s, p.s / 3);
        }
        ctx.restore();
      }
    };

    let raf = 0;
    let last = performance.now();
    let visible = true;
    const loop = (now: number) => {
      raf = 0;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      for (const p of ps) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (mouse.on) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const d = Math.hypot(dx, dy);
          if (d < R && d > 0.001) {
            p.vx += (dx / d) * 7 * dt;
            p.vy += (dy / d) * 7 * dt;
          }
        }
        p.vx *= 0.99;
        p.vy *= 0.99;
        if (p.y < -24) { p.y = h + 24; p.x = rand(0, w); }
        if (p.y > h + 24) p.y = -24;
        if (p.x < -24) p.x = w + 24;
        if (p.x > w + 24) p.x = -24;
      }
      draw();
      if (visible && !reduced) raf = requestAnimationFrame(loop);
    };

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible && !raf && !reduced) {
          last = performance.now();
          raf = requestAnimationFrame(loop);
        }
      },
      { threshold: 0 }
    );
    io.observe(parent);

    draw();
    if (!reduced) raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      if (interactive && fine) {
        window.removeEventListener("pointermove", onMove);
        parent.removeEventListener("pointerleave", onLeave);
      }
    };
  }, [density, opacity, mode, interactive]);

  return (
    <canvas
      ref={ref}
      className={className}
      aria-hidden="true"
      style={{ display: "block", width: "100%", height: "100%", pointerEvents: "none" }}
    />
  );
}
