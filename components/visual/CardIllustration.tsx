"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import type { CardIllustrationVariant } from "@/lib/illustrations";

/**
 * Wii Event Malta — CardIllustration.
 *
 * Abstract, generative-feeling SVG artwork for otherwise-empty cards. One shared
 * visual language across variants (thin line art, soft glows, grain, Mediterranean
 * night colours) so every card stays on-brand: Sun · Sea · Sound · Tickets ·
 * Community · Malta nightlife.
 *
 * Pure SVG + CSS animation (no Three.js). Deterministic geometry (no per-render
 * randomness → hydration-safe). Subtle motion only, disabled under
 * prefers-reduced-motion via the .ci-* animation classes.
 */
export type CardIllustrationProps = {
  variant: CardIllustrationVariant;
  intensity?: "low" | "medium" | "high";
  animated?: boolean;
  className?: string;
};

const C = {
  bone: "#FBF8F1",
  sand: "#EFE7D6",
  azure: "#2E6BFF",
  azure300: "#8FB4FF",
  teal: "#3FD2C7",
  haze: "#7B36E3",
  haze400: "#9A6CF0",
  ember: "#FF4D1F",
  ember300: "#FF9E7A",
  gold: "#D8B05A",
  gold300: "#F0D9A0",
};

const INTENSITY: Record<NonNullable<CardIllustrationProps["intensity"]>, number> = {
  low: 0.42,
  medium: 0.7,
  high: 0.95,
};

/* ---- deterministic path helpers ---- */
function wave(y: number, amp: number, seed = 0, w = 420): string {
  const steps = 40;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const x = -50 + (i / steps) * w;
    const yy = y + Math.sin(i * 0.5 + seed) * amp + Math.sin(i * 0.17 - seed) * amp * 0.45;
    d += (i ? "L" : "M") + x.toFixed(1) + " " + yy.toFixed(1) + " ";
  }
  return d;
}
function ring(cx: number, cy: number, r: number, seed: number, squash = 0.8): string {
  const steps = 56;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const rr = r * (1 + 0.16 * Math.sin(a * 3 + seed) + 0.08 * Math.sin(a * 5 - seed));
    d += (i ? "L" : "M") + (cx + Math.cos(a) * rr).toFixed(1) + " " + (cy + Math.sin(a) * rr * squash).toFixed(1) + " ";
  }
  return d + "Z";
}
// small grid of dots
function dotGrid(x0: number, y0: number, cols: number, rows: number, gap: number) {
  const out: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({ x: x0 + c * gap, y: y0 + r * gap });
  return out;
}

export function CardIllustration({ variant, intensity = "medium", animated = false, className }: CardIllustrationProps) {
  const uid = useId().replace(/:/g, "");
  const a = animated; // animation classes only apply when true
  const op = INTENSITY[intensity];

  // shared faint grain + base glow per variant
  const glow = (color: string, cx = 50, cy = 36) => (
    <radialGradient id={`glow-${uid}`} cx={`${cx}%`} cy={`${cy}%`} r="60%">
      <stop offset="0%" stopColor={color} stopOpacity="0.5" />
      <stop offset="60%" stopColor={color} stopOpacity="0.08" />
      <stop offset="100%" stopColor={color} stopOpacity="0" />
    </radialGradient>
  );

  let defs: React.ReactNode = null;
  let body: React.ReactNode = null;

  switch (variant) {
    case "sound": {
      defs = glow(C.azure);
      body = (
        <>
          <rect width="320" height="400" fill={`url(#glow-${uid})`} />
          <g className={a ? "ci-wave" : undefined} stroke={C.azure300} fill="none" strokeWidth="1.4" strokeLinecap="round" opacity="0.9">
            <path d={wave(150, 26, 0.2)} />
            <path d={wave(200, 40, 1.1)} stroke={C.haze400} />
            <path d={wave(250, 30, 2.3)} stroke={C.bone} opacity="0.6" />
            <path d={wave(300, 20, 3.4)} stroke={C.azure} />
          </g>
        </>
      );
      break;
    }
    case "sea": {
      defs = (
        <>
          {glow(C.azure)}
          <linearGradient id={`sea-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.azure} stopOpacity="0" />
            <stop offset="100%" stopColor={C.azure} stopOpacity="0.22" />
          </linearGradient>
        </>
      );
      body = (
        <>
          <rect width="320" height="400" fill={`url(#sea-${uid})`} />
          <g className={a ? "ci-wave" : undefined} stroke={C.azure300} fill="none" strokeWidth="1.3" strokeLinecap="round">
            {[120, 170, 215, 258, 300, 340].map((y, i) => (
              <path key={y} d={wave(y, 14 + i * 2, i * 1.3)} stroke={i % 2 ? C.teal : C.azure300} opacity={0.85 - i * 0.08} />
            ))}
          </g>
        </>
      );
      break;
    }
    case "sun": {
      defs = (
        <>
          <radialGradient id={`sun-${uid}`} cx="50%" cy="42%" r="50%">
            <stop offset="0%" stopColor={C.gold300} />
            <stop offset="45%" stopColor={C.ember} />
            <stop offset="100%" stopColor={C.ember} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`halo-${uid}`} cx="50%" cy="42%" r="55%">
            <stop offset="0%" stopColor={C.ember300} stopOpacity="0.5" />
            <stop offset="70%" stopColor={C.ember} stopOpacity="0.05" />
            <stop offset="100%" stopColor={C.ember} stopOpacity="0" />
          </radialGradient>
        </>
      );
      body = (
        <>
          <rect width="320" height="400" fill={`url(#halo-${uid})`} className={a ? "ci-pulse" : undefined} />
          <circle cx="160" cy="168" r="64" fill={`url(#sun-${uid})`} />
          <g stroke={C.gold} strokeWidth="1" opacity="0.5" strokeLinecap="round">
            {[230, 250, 270, 290, 310].map((y) => (
              <line key={y} x1="40" y1={y} x2="280" y2={y} opacity={(330 - y) / 120} />
            ))}
          </g>
        </>
      );
      break;
    }
    case "ticket": {
      defs = glow(C.ember, 50, 30);
      body = (
        <>
          <rect width="320" height="400" fill={`url(#glow-${uid})`} />
          <g transform="translate(70,120)" stroke={C.bone} fill="none" opacity="0.7">
            <rect x="0" y="0" width="180" height="120" rx="12" strokeWidth="1.4" />
            <line x1="0" y1="60" x2="180" y2="60" strokeWidth="1.2" strokeDasharray="4 6" opacity="0.6" />
            <circle cx="0" cy="60" r="9" fill="#050506" stroke="none" />
            <circle cx="180" cy="60" r="9" fill="#050506" stroke="none" />
          </g>
          <g transform="translate(120,150)" fill={C.ember300} opacity="0.9">
            {dotGrid(0, 0, 5, 5, 12).map((d, i) => (
              <rect key={i} x={d.x} y={d.y} width="7" height="7" opacity={(i * 37) % 5 > 1 ? 0.9 : 0.2} />
            ))}
          </g>
        </>
      );
      break;
    }
    case "community": {
      defs = glow(C.haze);
      const dots = dotGrid(60, 120, 6, 6, 34);
      body = (
        <>
          <rect width="320" height="400" fill={`url(#glow-${uid})`} />
          <g className={a ? "ci-orbit" : undefined} stroke={C.haze400} fill="none" opacity="0.4" strokeWidth="1">
            <circle cx="160" cy="210" r="60" />
            <circle cx="160" cy="210" r="100" opacity="0.5" />
          </g>
          <g>
            {dots.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r={i % 7 === 0 ? 3 : 1.6} fill={i % 5 === 0 ? C.azure300 : C.sand} opacity={0.35 + ((i * 13) % 5) * 0.12} />
            ))}
          </g>
          <g stroke={C.haze400} strokeWidth="0.6" opacity="0.3">
            <line x1="60" y1="120" x2="196" y2="222" />
            <line x1="230" y1="154" x2="128" y2="290" />
            <line x1="94" y1="290" x2="230" y2="222" />
          </g>
        </>
      );
      break;
    }
    case "island": {
      defs = glow(C.azure, 38, 40);
      body = (
        <>
          <rect width="320" height="400" fill={`url(#glow-${uid})`} />
          <g fill="none" strokeWidth="1.1" opacity="0.7">
            <path d={ring(170, 200, 110, 0.7)} stroke={C.sand} />
            <path d={ring(170, 200, 80, 0.7)} stroke={C.azure300} />
            <path d={ring(170, 200, 52, 0.7)} stroke={C.gold} />
            <path d={ring(85, 300, 34, 1.9)} stroke={C.sand} opacity="0.6" />
          </g>
          <g stroke={C.azure300} strokeWidth="1" opacity="0.4" className={a ? "ci-wave" : undefined}>
            <path d={wave(110, 10, 1)} fill="none" />
            <path d={wave(350, 12, 2.4)} fill="none" />
          </g>
        </>
      );
      break;
    }
    case "stage": {
      defs = (
        <>
          <linearGradient id={`beam-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.haze400} stopOpacity="0.5" />
            <stop offset="100%" stopColor={C.haze400} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`beam2-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.azure300} stopOpacity="0.45" />
            <stop offset="100%" stopColor={C.azure300} stopOpacity="0" />
          </linearGradient>
        </>
      );
      body = (
        <>
          <g className={a ? "ci-beam" : undefined}>
            <polygon points="120,0 150,0 80,260 10,260" fill={`url(#beam-${uid})`} />
            <polygon points="200,0 230,0 310,260 250,260" fill={`url(#beam2-${uid})`} />
            <polygon points="155,0 185,0 200,260 140,260" fill={`url(#beam-${uid})`} opacity="0.7" />
          </g>
          <g fill={C.azure300} opacity="0.55">
            {dotGrid(70, 300, 9, 3, 22).map((d, i) => (
              <rect key={i} x={d.x} y={d.y} width="9" height="5" rx="1" opacity={0.3 + ((i * 7) % 4) * 0.18} />
            ))}
          </g>
        </>
      );
      break;
    }
    case "vip": {
      defs = (
        <>
          {glow(C.gold, 50, 34)}
          <linearGradient id={`card-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={C.gold} stopOpacity="0.25" />
            <stop offset="100%" stopColor={C.ember} stopOpacity="0.12" />
          </linearGradient>
        </>
      );
      body = (
        <>
          <rect width="320" height="400" fill={`url(#glow-${uid})`} />
          <g transform="translate(64,128)">
            <rect x="0" y="0" width="192" height="118" rx="14" fill={`url(#card-${uid})`} stroke={C.gold} strokeWidth="1.2" opacity="0.9" />
            <rect x="14" y="18" width="40" height="40" fill="none" stroke={C.gold300} strokeWidth="1" />
            {dotGrid(18, 22, 3, 3, 11).map((d, i) => (
              <rect key={i} x={d.x} y={d.y} width="6" height="6" fill={C.gold300} opacity={(i * 29) % 3 ? 0.85 : 0.2} />
            ))}
            <line x1="14" y1="92" x2="178" y2="92" stroke={C.gold300} strokeWidth="6" strokeLinecap="round" opacity="0.5" />
          </g>
        </>
      );
      break;
    }
    case "access": {
      defs = glow(C.ember, 44, 40);
      body = (
        <>
          <rect width="320" height="400" fill={`url(#glow-${uid})`} />
          <g transform="rotate(-18 160 200)">
            <rect x="-20" y="186" width="360" height="28" fill={C.ember} opacity="0.18" />
            <line x1="-20" y1="186" x2="340" y2="186" stroke={C.ember300} strokeWidth="1" opacity="0.6" />
            <line x1="-20" y1="214" x2="340" y2="214" stroke={C.ember300} strokeWidth="1" opacity="0.6" />
          </g>
          <g fill={C.sand} className={a ? "ci-float" : undefined}>
            {dotGrid(110, 110, 4, 4, 13).map((d, i) => (
              <rect key={i} x={d.x} y={d.y} width="8" height="8" opacity={(i * 19) % 3 ? 0.7 : 0.15} />
            ))}
          </g>
        </>
      );
      break;
    }
    case "gallery": {
      defs = glow(C.bone, 50, 40);
      body = (
        <>
          <rect width="320" height="400" fill={`url(#glow-${uid})`} />
          <g stroke={C.sand} fill="none" strokeWidth="1.3" opacity="0.6">
            {/* corner frame */}
            <path d="M60 120 h28 M60 120 v28" />
            <path d="M260 120 h-28 M260 120 v28" />
            <path d="M60 300 h28 M60 300 v-28" />
            <path d="M260 300 h-28 M260 300 v-28" />
          </g>
          <g className={a ? "ci-pulse" : undefined}>
            <circle cx="160" cy="210" r="34" fill="none" stroke={C.bone} strokeWidth="1.4" opacity="0.7" />
            <path d="M152 196 L176 210 L152 224 Z" fill={C.bone} opacity="0.85" />
          </g>
        </>
      );
      break;
    }
    case "partner": {
      defs = (
        <>
          {glow(C.azure, 50, 30)}
          <linearGradient id={`spot-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.azure300} stopOpacity="0.4" />
            <stop offset="100%" stopColor={C.azure300} stopOpacity="0" />
          </linearGradient>
        </>
      );
      body = (
        <>
          <polygon points="130,0 190,0 240,220 80,220" fill={`url(#spot-${uid})`} className={a ? "ci-beam" : undefined} />
          <g stroke={C.sand} fill="none" opacity="0.55" strokeWidth="1.1">
            {dotGrid(86, 150, 3, 3, 52).map((d, i) => (
              <rect key={i} x={d.x} y={d.y} width="34" height="34" rx="4" opacity={(i * 23) % 3 ? 0.7 : 0.3} />
            ))}
          </g>
          <g stroke={C.azure300} strokeWidth="0.7" opacity="0.4">
            <line x1="120" y1="167" x2="172" y2="167" />
            <line x1="184" y1="219" x2="184" y2="271" />
          </g>
        </>
      );
      break;
    }
  }

  return (
    <svg
      className={cn("ci-fill", className)}
      viewBox="0 0 320 400"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ opacity: op }}
    >
      <defs>{defs}</defs>
      {body}
    </svg>
  );
}
