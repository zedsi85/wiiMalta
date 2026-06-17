"use client";

import { useEffect, useRef } from "react";
import { hasFinePointer, prefersReducedMotion } from "@/lib/utils";

/**
 * Wii Event Malta — SoundWaveField.
 *
 * The "Sound" part of the brand: a few thin, slowly drifting frequency lines,
 * cursor-reactive (X shifts phase, Y shifts amplitude). Canvas 2D — deliberately
 * not a second WebGL context — so it's cheap, pauses when offscreen, and never
 * blocks the page. Palette is off-white / azure / haze with a small gold accent.
 */
export type SoundWaveFieldProps = {
  intensity?: number;
  opacity?: number;
  interactive?: boolean;
  active?: boolean;
  className?: string;
};

const COLORS = ["239,231,214", "46,107,255", "123,54,227", "239,231,214", "216,176,90"];

export default function SoundWaveField({
  intensity = 0.45,
  opacity = 0.28,
  interactive = true,
  active = false,
  className,
}: SoundWaveFieldProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = prefersReducedMotion();
    const fine = hasFinePointer();
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

    const N = 5;
    const lines = Array.from({ length: N }, (_, i) => ({
      yf: 0.5 + (i - (N - 1) / 2) * 0.13,
      amp: 12 + i * 6,
      k1: 0.006 + i * 0.0012,
      k2: 0.013 - i * 0.001,
      speed: 0.22 + i * 0.05,
      phase: Math.random() * Math.PI * 2,
      color: COLORS[i % COLORS.length],
      a: i === 0 ? 0.85 : 0.5,
    }));

    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    const onMove = (e: PointerEvent) => {
      const r = parent.getBoundingClientRect();
      mouse.tx = (e.clientX - r.left) / Math.max(1, r.width);
      mouse.ty = (e.clientY - r.top) / Math.max(1, r.height);
    };
    if (interactive && fine) window.addEventListener("pointermove", onMove, { passive: true });

    let pulse = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      pulse += ((activeRef.current ? 1 : 0) - pulse) * 0.04;
      const ampBoost = intensity * (1 + pulse * 0.6) * (1 + (mouse.y - 0.5) * 0.5);
      const phaseShift = (mouse.x - 0.5) * 2.2;
      ctx.globalAlpha = opacity;
      ctx.lineWidth = 1.2;
      for (const ln of lines) {
        ctx.beginPath();
        const baseY = ln.yf * h;
        const step = Math.max(6, w / 120);
        for (let x = 0; x <= w; x += step) {
          const y =
            baseY +
            Math.sin(x * ln.k1 + ln.phase + phaseShift) * ln.amp * ampBoost * 0.55 +
            Math.sin(x * ln.k2 - ln.phase * 1.3 + phaseShift * 0.6) * ln.amp * ampBoost * 0.3;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${ln.color},${ln.a})`;
        ctx.stroke();
      }
    };

    let raf = 0;
    let last = performance.now();
    let visible = true;
    const loop = (now: number) => {
      raf = 0;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      for (const ln of lines) ln.phase += ln.speed * dt * (activeRef.current ? 1.3 : 1);
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

    draw(); // first frame (also the static frame under reduced motion)
    if (!reduced) raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      if (interactive && fine) window.removeEventListener("pointermove", onMove);
    };
  }, [intensity, opacity, interactive]);

  return (
    <canvas
      ref={ref}
      className={className}
      aria-hidden="true"
      style={{ display: "block", width: "100%", height: "100%", pointerEvents: "none" }}
    />
  );
}
