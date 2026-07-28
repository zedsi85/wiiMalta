"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import { type CardIllustrationVariant, toArtwork, type Artwork } from "@/lib/illustrations";

/**
 * Wii Event Malta — CardIllustration.
 *
 * Faithful ports of the official "Event Artwork System" — eight collectible
 * 4:5 poster directions (Club · Sunset · Beach · Boat · Rooftop · Invite · VIP ·
 * Festival). Each keeps the system's five layers: glow → pattern → central
 * symbol → foreground/crowd → text-safe bottom fade, on the shared near-black
 * spine with two–three event accents and the hidden night-sun motif.
 *
 * Pure SVG (no per-card film-grain filter — the site grain covers that). Gentle
 * looping motion only, gated by `animated` and disabled under reduced motion via
 * CSS. Gradient ids are namespaced with useId so many cards never collide.
 *
 * `intensity` low → screen blend (dark base drops out, motifs glow over a text
 * card); medium/high → the full poster for 4:5 poster cards.
 */
export type CardIllustrationProps = {
  variant: CardIllustrationVariant;
  intensity?: "low" | "medium" | "high";
  animated?: boolean;
  className?: string;
};

export function CardIllustration({ variant, intensity = "high", animated = false, className }: CardIllustrationProps) {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, "");
  const uid = "a" + raw;
  const art = toArtwork(variant);
  const A = animated;
  const anim = (v: string) => (A ? v : undefined);

  const renderer = ART[art];
  const { defs, body } = renderer(uid, anim);

  const op = intensity === "low" ? 0.85 : intensity === "medium" ? 0.95 : 1;
  const blend = intensity === "low" ? "screen" : "normal";

  return (
    <svg
      className={cn("ci-fill", className)}
      viewBox="0 0 800 1000"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ opacity: op, mixBlendMode: blend as React.CSSProperties["mixBlendMode"] }}
    >
      <defs>{defs}</defs>
      {body}
    </svg>
  );
}

type Render = (uid: string, anim: (v: string) => string | undefined) => {
  defs: React.ReactNode;
  body: React.ReactNode;
};

const ART: Record<Artwork, Render> = {
  /* 01 — Club Night · Void / Haze / Azure */
  club: (uid, anim) => ({
    defs: (
      <>
        <radialGradient id={`${uid}haze`} cx="50%" cy="6%" r="70%">
          <stop offset="0%" stopColor="#7B36E3" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#7B36E3" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}az`} cx="50%" cy="100%" r="80%">
          <stop offset="0%" stopColor="#2E6BFF" stopOpacity="0.45" />
          <stop offset="55%" stopColor="#2E6BFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#050506" stopOpacity="0" />
          <stop offset="100%" stopColor="#050506" stopOpacity="0.85" />
        </linearGradient>
      </>
    ),
    body: (
      <>
        <rect width="800" height="1000" fill="#0B0B0E" />
        <rect width="800" height="1000" fill={`url(#${uid}haze)`} />
        <rect width="800" height="1000" fill={`url(#${uid}az)`} />
        <g stroke="#FBF8F1" strokeWidth="2" opacity="0.05">
          <line x1="120" y1="120" x2="120" y2="700" />
          <line x1="200" y1="120" x2="200" y2="700" />
          <line x1="280" y1="120" x2="280" y2="700" />
          <line x1="520" y1="120" x2="520" y2="700" />
          <line x1="600" y1="120" x2="600" y2="700" />
          <line x1="680" y1="120" x2="680" y2="700" />
        </g>
        <g fill="none" stroke="#2E6BFF" strokeWidth="2.5">
          <circle cx="400" cy="420" r="170" opacity="0.5" style={{ animation: anim("wiiPulseLine 3s ease-in-out infinite") }} />
          <circle cx="400" cy="420" r="250" opacity="0.32" style={{ animation: anim("wiiPulseLine 3s ease-in-out infinite .5s") }} />
          <circle cx="400" cy="420" r="330" opacity="0.18" style={{ animation: anim("wiiPulseLine 3s ease-in-out infinite 1s") }} />
          <circle cx="400" cy="420" r="410" opacity="0.1" />
        </g>
        <g fill="#0B0B0E" stroke="#EFE7D6" strokeWidth="4">
          <rect x="305" y="190" width="190" height="440" rx="14" />
          <circle cx="400" cy="300" r="46" />
          <circle cx="400" cy="300" r="16" fill="#EFE7D6" />
          <circle cx="400" cy="500" r="86" />
          <circle cx="400" cy="500" r="30" fill="#7B36E3" />
          <rect x="340" y="206" width="120" height="10" rx="5" fill="#EFE7D6" stroke="none" />
        </g>
        <g fill="#9A6CF0" opacity="0.8">
          {[[250,690,40],[278,668,62],[306,700,30],[334,650,80],[362,684,46],[424,676,54],[452,700,30],[480,656,74],[508,690,40],[536,672,58]].map(([x,y,h],i)=>(
            <rect key={i} x={x} y={y} width="14" height={h} rx="3" />
          ))}
        </g>
        <rect x="0" y="900" width="800" height="100" fill="#050506" />
        <g fill="#050506">
          {[[70,900,34],[170,908,30],[280,898,36],[400,912,32],[520,898,36],[630,908,30],[730,900,34]].map(([cx,cy,r],i)=>(
            <circle key={i} cx={cx} cy={cy} r={r} />
          ))}
        </g>
        <g stroke="#EFE7D6" strokeWidth="5" strokeLinecap="round" opacity="0.85" fill="none">
          <path d="M70 900 L48 830 M70 900 L96 838" />
          <path d="M280 898 L256 824 M280 898 L306 832" />
          <path d="M520 898 L498 826 M520 898 L546 834" />
          <path d="M730 900 L710 836 M730 900 L754 842" />
        </g>
        <rect x="0" y="640" width="800" height="360" fill={`url(#${uid}fade)`} />
      </>
    ),
  }),

  /* 02 — Sunset Session · Ember / Gold / Sea */
  sunset: (uid, anim) => ({
    defs: (
      <>
        <linearGradient id={`${uid}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#100A1E" />
          <stop offset="48%" stopColor="#3A1530" />
          <stop offset="74%" stopColor="#7A2A12" />
          <stop offset="100%" stopColor="#C4400C" />
        </linearGradient>
        <radialGradient id={`${uid}sun`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE4D8" />
          <stop offset="40%" stopColor="#F0D9A0" />
          <stop offset="78%" stopColor="#FF7A3C" />
          <stop offset="100%" stopColor="#FF4D1F" />
        </radialGradient>
        <linearGradient id={`${uid}fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#050506" stopOpacity="0" />
          <stop offset="100%" stopColor="#06030A" stopOpacity="0.8" />
        </linearGradient>
      </>
    ),
    body: (
      <>
        <rect width="800" height="660" fill={`url(#${uid}sky)`} />
        <rect y="640" width="800" height="360" fill="#0A1B3A" />
        <g fill="none" stroke="#F0D9A0" strokeWidth="3" opacity="0.5">
          <path d="M70 120 a26 26 0 0 1 52 0" />
          <path d="M210 120 a26 26 0 0 1 52 0" />
          <path d="M350 120 a26 26 0 0 1 52 0" />
          <path d="M490 120 a26 26 0 0 1 52 0" />
          <path d="M630 120 a26 26 0 0 1 52 0" />
        </g>
        <g style={{ animation: anim("wiiSunPulse 5s ease-in-out infinite"), transformOrigin: "400px 540px" }}>
          <circle cx="400" cy="540" r="210" fill={`url(#${uid}sun)`} />
          <g stroke="#3A1530" strokeWidth="8">
            <line x1="220" y1="560" x2="580" y2="560" />
            <line x1="232" y1="588" x2="568" y2="588" />
            <line x1="252" y1="616" x2="548" y2="616" />
          </g>
        </g>
        <g fill="none" stroke="#FFE4D8" strokeWidth="2.5" opacity="0.4">
          <path d="M0 300 q100 -28 200 0 t200 0 t200 0 t200 0" />
          <path d="M0 360 q100 28 200 0 t200 0 t200 0 t200 0" opacity="0.6" />
        </g>
        <g fill="#0A1B3A">
          <g transform="translate(214 600)"><circle cx="0" cy="-46" r="12" /><path d="M-12 6 L0 -34 L12 6 M0 -28 L-18 -10 M0 -28 L20 -16" stroke="#0A1B3A" strokeWidth="9" strokeLinecap="round" fill="none" /></g>
          <g transform="translate(300 606)"><circle cx="0" cy="-52" r="13" /><path d="M-14 4 L0 -40 L14 4 M0 -32 L-22 -20 M0 -32 L22 -8" stroke="#0A1B3A" strokeWidth="10" strokeLinecap="round" fill="none" /></g>
          <g transform="translate(500 606)"><circle cx="0" cy="-52" r="13" /><path d="M-14 4 L0 -40 L14 4 M0 -32 L-22 -8 M0 -32 L22 -20" stroke="#0A1B3A" strokeWidth="10" strokeLinecap="round" fill="none" /></g>
          <g transform="translate(586 600)"><circle cx="0" cy="-46" r="12" /><path d="M-12 6 L0 -34 L12 6 M0 -28 L-20 -16 M0 -28 L18 -10" stroke="#0A1B3A" strokeWidth="9" strokeLinecap="round" fill="none" /></g>
        </g>
        <g fill="none" strokeLinecap="round">
          <path d="M0 720 q80 -18 160 0 t160 0 t160 0 t160 0 t160 0" stroke="#8FB4FF" strokeWidth="3" opacity="0.7" />
          <path d="M0 780 q80 18 160 0 t160 0 t160 0 t160 0 t160 0" stroke="#F0D9A0" strokeWidth="3" opacity="0.45" />
          <path d="M0 840 q80 -18 160 0 t160 0 t160 0 t160 0 t160 0" stroke="#8FB4FF" strokeWidth="3" opacity="0.3" />
        </g>
        <rect x="0" y="660" width="800" height="340" fill={`url(#${uid}fade)`} />
      </>
    ),
  }),

  /* 03 — Beach Event · Aqua / Sand / Ember */
  beach: (uid) => ({
    defs: (
      <>
        <linearGradient id={`${uid}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#07294A" />
          <stop offset="60%" stopColor="#0E3E63" />
          <stop offset="100%" stopColor="#155A7A" />
        </linearGradient>
        <linearGradient id={`${uid}fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#05131F" stopOpacity="0" />
          <stop offset="100%" stopColor="#05131F" stopOpacity="0.82" />
        </linearGradient>
      </>
    ),
    body: (
      <>
        <rect width="800" height="1000" fill={`url(#${uid}sky)`} />
        <circle cx="600" cy="200" r="86" fill="#FF4D1F" opacity="0.92" />
        <circle cx="600" cy="200" r="120" fill="none" stroke="#FF9E7A" strokeWidth="2" opacity="0.4" />
        <g fill="none" stroke="#FFE4D8" strokeWidth="2.4" opacity="0.5">
          <path d="M470 130 a150 150 0 0 1 0 140" />
          <path d="M440 110 a190 190 0 0 1 0 180" opacity="0.6" />
        </g>
        <g fill="none" stroke="#3FD27E" strokeWidth="4" strokeLinecap="round" opacity="0.7">
          <path d="M120 1000 L120 560" />
          <path d="M120 580 q-50 -40 -96 -34 M120 580 q-46 -54 -40 -100 M120 590 q40 -46 92 -42 M120 600 q48 -40 98 -22 M120 575 q4 -54 -28 -94" />
        </g>
        <g fill="none" strokeLinecap="round">
          <path d="M-20 720 q160 -150 340 -60 q120 60 60 150 q-40 60 -120 24 q-66 -30 -34 -90 q24 -44 78 -20" stroke="#8FB4FF" strokeWidth="6" opacity="0.95" />
          <path d="M-20 760 q170 -140 350 -56 q130 64 64 150" stroke="#FBF8F1" strokeWidth="4" opacity="0.7" />
          <circle cx="356" cy="700" r="6" fill="#FBF8F1" />
          <circle cx="332" cy="676" r="4" fill="#FBF8F1" />
          <circle cx="384" cy="688" r="4" fill="#FBF8F1" />
        </g>
        <g fill="none" strokeLinecap="round">
          <path d="M0 860 q90 -22 180 0 t180 0 t180 0 t180 0" stroke="#8FB4FF" strokeWidth="3" opacity="0.55" />
          <path d="M0 910 q90 22 180 0 t180 0 t180 0 t180 0" stroke="#EFE7D6" strokeWidth="3" opacity="0.4" />
        </g>
        <g fill="#05131F">
          <g transform="translate(500 880)"><circle cx="0" cy="-44" r="12" /><path d="M-12 4 L0 -34 L12 4 M0 -28 L-20 -14 M0 -28 L22 -18" stroke="#05131F" strokeWidth="9" strokeLinecap="round" fill="none" /></g>
          <g transform="translate(600 886)"><circle cx="0" cy="-40" r="11" /><path d="M-11 4 L0 -30 L11 4 M0 -24 L-18 -18 M0 -24 L18 -8" stroke="#05131F" strokeWidth="8" strokeLinecap="round" fill="none" /></g>
        </g>
        <rect x="0" y="640" width="800" height="360" fill={`url(#${uid}fade)`} />
      </>
    ),
  }),

  /* 04 — Boat Party · Navy / Aqua / Yellow */
  boat: (uid) => ({
    defs: (
      <>
        <linearGradient id={`${uid}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#061634" />
          <stop offset="60%" stopColor="#0A2348" />
          <stop offset="100%" stopColor="#0E2E55" />
        </linearGradient>
        <linearGradient id={`${uid}fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#04102A" stopOpacity="0" />
          <stop offset="100%" stopColor="#04102A" stopOpacity="0.82" />
        </linearGradient>
      </>
    ),
    body: (
      <>
        <rect width="800" height="1000" fill={`url(#${uid}sky)`} />
        <circle cx="630" cy="150" r="72" fill="#F0D9A0" />
        <circle cx="630" cy="150" r="100" fill="none" stroke="#F0D9A0" strokeWidth="2" opacity="0.35" />
        <path d="M120 110 C 320 200 180 340 400 420 C 600 500 540 660 360 720 C 200 772 240 900 520 940" fill="none" stroke="#8FB4FF" strokeWidth="3.5" strokeDasharray="3 16" strokeLinecap="round" opacity="0.85" />
        <g fill="#FBF8F1"><circle cx="120" cy="110" r="6" /><circle cx="400" cy="420" r="6" /><circle cx="360" cy="720" r="6" /><circle cx="520" cy="940" r="6" /></g>
        <g fill="none" stroke="#8FB4FF" strokeWidth="3" opacity="0.6">
          <g transform="translate(180 300) rotate(-12)"><rect x="-22" y="-30" width="44" height="60" rx="6" /><circle cx="0" cy="10" r="13" /><circle cx="0" cy="-14" r="6" /></g>
          <g transform="translate(630 560) rotate(10)"><rect x="-20" y="-28" width="40" height="56" rx="6" /><circle cx="0" cy="8" r="12" /><circle cx="0" cy="-12" r="5" /></g>
        </g>
        <g transform="translate(400 470)">
          <path d="M-110 0 L110 0 L78 54 L-78 54 Z" fill="#04102A" stroke="#8FB4FF" strokeWidth="4" />
          <line x1="0" y1="0" x2="0" y2="-120" stroke="#F0D9A0" strokeWidth="5" />
          <path d="M6 -116 L70 -40 L6 -40 Z" fill="#FF4D1F" opacity="0.9" />
          <path d="M-6 -100 L-58 -44 L-6 -44 Z" fill="#F0D9A0" opacity="0.85" />
          <g fill="#8FB4FF"><circle cx="-44" cy="26" r="6" /><circle cx="0" cy="26" r="6" /><circle cx="44" cy="26" r="6" /></g>
        </g>
        <g fill="none" stroke="#FBF8F1" strokeWidth="2" opacity="0.3"><ellipse cx="400" cy="540" rx="150" ry="22" /><ellipse cx="400" cy="540" rx="230" ry="34" /></g>
        <g fill="none" strokeLinecap="round">
          <path d="M0 660 q70 -16 140 0 t140 0 t140 0 t140 0 t140 0" stroke="#8FB4FF" strokeWidth="3" opacity="0.5" />
          <path d="M0 720 q70 16 140 0 t140 0 t140 0 t140 0 t140 0" stroke="#0E5A7A" strokeWidth="3" opacity="0.7" />
          <path d="M0 800 q70 -16 140 0 t140 0 t140 0 t140 0 t140 0" stroke="#8FB4FF" strokeWidth="3" opacity="0.3" />
        </g>
        <rect x="0" y="640" width="800" height="360" fill={`url(#${uid}fade)`} />
      </>
    ),
  }),

  /* 05 — Rooftop Night · Ink / Champagne / Ivory */
  rooftop: (uid) => ({
    defs: (
      <>
        <linearGradient id={`${uid}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0A0A12" />
          <stop offset="62%" stopColor="#16101A" />
          <stop offset="100%" stopColor="#241318" />
        </linearGradient>
        <linearGradient id={`${uid}beam`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#F0D9A0" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#F0D9A0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#050506" stopOpacity="0" />
          <stop offset="100%" stopColor="#050506" stopOpacity="0.82" />
        </linearGradient>
      </>
    ),
    body: (
      <>
        <rect width="800" height="1000" fill={`url(#${uid}sky)`} />
        <g><circle cx="250" cy="220" r="92" fill="#F0D9A0" /><circle cx="290" cy="200" r="86" fill="#0A0A12" /></g>
        <g fill="#FBF8F1"><circle cx="540" cy="120" r="2.5" /><circle cx="640" cy="190" r="2" /><circle cx="700" cy="120" r="2.8" /><circle cx="480" cy="240" r="1.8" /><circle cx="600" cy="300" r="2.2" /><circle cx="150" cy="120" r="2" /><circle cx="720" cy="320" r="2.4" /><circle cx="560" cy="420" r="1.8" /></g>
        <g><polygon points="300,760 270,300 340,300" fill={`url(#${uid}beam)`} /><polygon points="520,760 500,320 580,320" fill={`url(#${uid}beam)`} /></g>
        <g fill="none" stroke="#D8B05A" strokeWidth="2.5" opacity="0.45"><path d="M260 620 a140 140 0 0 1 280 0" /><path d="M300 640 a100 100 0 0 1 200 0" opacity="0.7" /></g>
        <g fill="#050506">
          {[[0,720,120,280],[120,660,90,340],[210,760,70,240],[280,700,110,300],[390,640,80,360],[470,740,100,260],[570,690,90,310],[660,750,80,250],[740,700,60,300]].map(([x,y,w,h],i)=>(
            <rect key={i} x={x} y={y} width={w} height={h} />
          ))}
        </g>
        <g fill="#F0D9A0" opacity="0.7">
          {[[142,690],[170,690],[142,720],[410,668],[438,668],[410,700],[592,720],[620,720],[40,752],[70,752]].map(([x,y],i)=>(
            <rect key={i} x={x} y={y} width="8" height="12" />
          ))}
        </g>
        <g fill="#241318">
          {[[120,704],[150,700],[180,706],[320,744],[350,740],[500,784],[530,780]].map(([cx,cy],i)=>(
            <circle key={i} cx={cx} cy={cy} r="9" />
          ))}
        </g>
        <rect x="0" y="640" width="800" height="360" fill={`url(#${uid}fade)`} />
      </>
    ),
  }),

  /* 06 — Invite-Only · Black / Dark Red / Silver */
  invite: (uid) => ({
    defs: (
      <>
        <radialGradient id={`${uid}glow`} cx="50%" cy="46%" r="60%">
          <stop offset="0%" stopColor="#7A1414" stopOpacity="0.7" />
          <stop offset="60%" stopColor="#3A0A0A" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#050506" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#050506" stopOpacity="0" />
          <stop offset="100%" stopColor="#050506" stopOpacity="0.85" />
        </linearGradient>
      </>
    ),
    body: (
      <>
        <rect width="800" height="1000" fill="#070506" />
        <rect width="800" height="1000" fill={`url(#${uid}glow)`} />
        <g fill="none" stroke="#C7C7D0" strokeWidth="2" opacity="0.12">
          <path d="M80 160 q24 -22 48 0 q-24 22 -48 0" />
          <path d="M680 200 q24 -22 48 0 q-24 22 -48 0" />
          <path d="M120 760 q24 -22 48 0 q-24 22 -48 0" />
          <path d="M640 780 q24 -22 48 0 q-24 22 -48 0" />
          <path d="M380 150 q24 -22 48 0 q-24 22 -48 0" />
        </g>
        <path d="M250 410 q150 -54 300 0" fill="none" stroke="#C7C7D0" strokeWidth="3" opacity="0.5" />
        <g stroke="#C7C7D0" strokeWidth="3" strokeLinecap="round" opacity="0.6"><line x1="300" y1="392" x2="296" y2="368" /><line x1="400" y1="378" x2="400" y2="352" /><line x1="500" y1="392" x2="504" y2="368" /></g>
        <path d="M240 500 Q400 372 560 500 Q400 628 240 500 Z" fill="#1A0608" stroke="#EFE7D6" strokeWidth="4" />
        <circle cx="400" cy="500" r="66" fill="none" stroke="#C7C7D0" strokeWidth="3" />
        <circle cx="400" cy="500" r="40" fill="#7A1414" />
        <circle cx="400" cy="488" r="16" fill="#050506" />
        <path d="M392 498 L408 498 L414 530 L386 530 Z" fill="#050506" />
        <circle cx="386" cy="480" r="6" fill="#EFE7D6" opacity="0.8" />
        <g transform="translate(400 690)" stroke="#D8B05A" strokeWidth="4" fill="none" opacity="0.85">
          <g transform="rotate(-32)"><circle cx="0" cy="-44" r="16" /><line x1="0" y1="-28" x2="0" y2="56" /><line x1="0" y1="40" x2="14" y2="40" /><line x1="0" y1="56" x2="14" y2="56" /></g>
          <g transform="rotate(32)"><circle cx="0" cy="-44" r="16" /><line x1="0" y1="-28" x2="0" y2="56" /><line x1="0" y1="40" x2="-14" y2="40" /><line x1="0" y1="56" x2="-14" y2="56" /></g>
        </g>
        <g fill="none" stroke="#C7C7D0" strokeWidth="2.5" opacity="0.4">
          <g transform="translate(150 560) rotate(-18)"><path d="M-30 -16 h60 v12 a7 7 0 0 0 0 8 v12 h-60 v-12 a7 7 0 0 0 0 -8 z" /></g>
          <g transform="translate(650 560) rotate(16)"><path d="M-30 -16 h60 v12 a7 7 0 0 0 0 8 v12 h-60 v-12 a7 7 0 0 0 0 -8 z" /></g>
        </g>
        <rect x="0" y="640" width="800" height="360" fill={`url(#${uid}fade)`} />
      </>
    ),
  }),

  /* 07 — VIP · Private · Black / Gold / Ivory */
  vip: (uid) => ({
    defs: (
      <>
        <radialGradient id={`${uid}glow`} cx="50%" cy="42%" r="58%">
          <stop offset="0%" stopColor="#D8B05A" stopOpacity="0.4" />
          <stop offset="55%" stopColor="#6E5418" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#050506" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}gold`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F0D9A0" />
          <stop offset="100%" stopColor="#B98F3C" />
        </linearGradient>
        <linearGradient id={`${uid}fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#050506" stopOpacity="0" />
          <stop offset="100%" stopColor="#050506" stopOpacity="0.85" />
        </linearGradient>
      </>
    ),
    body: (
      <>
        <rect width="800" height="1000" fill="#08070A" />
        <rect width="800" height="1000" fill={`url(#${uid}glow)`} />
        <g fill="none" stroke="#D8B05A" strokeWidth="2" opacity="0.28">
          <path d="M-20 250 q120 -34 240 0 t240 0 t240 0 t240 0" />
          <path d="M-20 300 q120 -34 240 0 t240 0 t240 0 t240 0" opacity="0.7" />
          <path d="M-20 720 q120 -34 240 0 t240 0 t240 0 t240 0" />
          <path d="M-20 770 q120 -34 240 0 t240 0 t240 0 t240 0" opacity="0.7" />
        </g>
        <g fill="none" stroke={`url(#${uid}gold)`} strokeWidth="3.5" opacity="0.7">
          <g transform="translate(200 560)"><circle cx="0" cy="-150" r="22" /><path d="M-22 -126 Q0 -110 22 -126 L34 120 Q0 140 -34 120 Z" /><path d="M18 -120 L70 -200" /><circle cx="74" cy="-208" r="10" /></g>
          <g transform="translate(600 560) scale(-1 1)"><circle cx="0" cy="-150" r="22" /><path d="M-22 -126 Q0 -110 22 -126 L34 120 Q0 140 -34 120 Z" /><path d="M18 -120 L70 -200" /><circle cx="74" cy="-208" r="10" /></g>
        </g>
        <g transform="translate(400 470)">
          <circle r="118" fill="#0E0C10" stroke={`url(#${uid}gold)`} strokeWidth="4" />
          <circle r="100" fill="none" stroke="#D8B05A" strokeWidth="1.5" opacity="0.6" />
          <g fill="none" stroke="#F0D9A0" strokeWidth="4.5"><circle cy="6" r="46" /><path d="M-16 6 A16 16 0 0 1 16 6 Z" fill="#F0D9A0" /><path d="M-40 6 q8 -6 16 0 t16 0 t16 0 t16 0" strokeLinecap="round" /></g>
          <text x="0" y="84" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="20" letterSpacing="8" fill="#F0D9A0">VIP</text>
          <g fill="#D8B05A"><circle cx="-118" cy="0" r="4" /><circle cx="118" cy="0" r="4" /><circle cx="0" cy="-118" r="4" /></g>
        </g>
        <g transform="translate(400 740) rotate(-4)">
          <rect x="-300" y="-22" width="600" height="44" rx="22" fill="#0E0C10" stroke={`url(#${uid}gold)`} strokeWidth="3" />
          <rect x="-300" y="-22" width="120" height="44" rx="22" fill="#D8B05A" opacity="0.85" />
          <text x="40" y="6" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="16" letterSpacing="5" fill="#F0D9A0">ACCESS · ALL AREAS</text>
        </g>
        <rect x="0" y="660" width="800" height="340" fill={`url(#${uid}fade)`} />
      </>
    ),
  }),

  /* 08 — Festival · Acid / Orange / Haze */
  festival: (uid) => ({
    defs: (
      <>
        <radialGradient id={`${uid}sun`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#EAFF6B" />
          <stop offset="55%" stopColor="#3FD27E" />
          <stop offset="100%" stopColor="#3FD27E" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#050506" stopOpacity="0" />
          <stop offset="100%" stopColor="#050506" stopOpacity="0.85" />
        </linearGradient>
      </>
    ),
    body: (
      <>
        <rect width="800" height="1000" fill="#060608" />
        <g style={{ mixBlendMode: "screen" }} opacity="0.55">
          <polygon points="400,150 200,740 300,740" fill="#7B36E3" />
          <polygon points="400,150 300,740 380,740" fill="#2E6BFF" />
          <polygon points="400,150 420,740 500,740" fill="#3FD27E" />
          <polygon points="400,150 500,740 600,740" fill="#FF4D1F" />
        </g>
        <circle cx="400" cy="440" r="170" fill={`url(#${uid}sun)`} opacity="0.85" />
        <g stroke="#FF4D1F" strokeWidth="4" strokeLinecap="round" opacity="0.8">
          <line x1="400" y1="230" x2="400" y2="270" /><line x1="610" y1="440" x2="570" y2="440" /><line x1="190" y1="440" x2="230" y2="440" /><line x1="548" y1="288" x2="520" y2="316" /><line x1="252" y1="288" x2="280" y2="316" /><line x1="548" y1="592" x2="520" y2="564" /><line x1="252" y1="592" x2="280" y2="564" />
        </g>
        <circle cx="400" cy="440" r="60" fill="none" stroke="#060608" strokeWidth="6" />
        <path d="M384 446 A16 16 0 0 1 416 446 Z" fill="#060608" />
        <path d="M364 446 q8 -6 16 0 t16 0 t16 0 t16 0" fill="none" stroke="#060608" strokeWidth="6" strokeLinecap="round" />
        <g fill="none" stroke="#9A9AA6" strokeWidth="3">
          <g transform="translate(150 0)"><rect x="0" y="300" width="56" height="430" /><path d="M0 300 L56 360 M56 300 L0 360 M0 360 L56 420 M56 360 L0 420 M0 420 L56 480 M56 420 L0 480 M0 480 L56 540 M56 480 L0 540 M0 540 L56 600 M56 540 L0 600 M0 600 L56 660 M56 600 L0 660 M0 660 L56 720 M56 660 L0 720" /></g>
          <g transform="translate(594 0)"><rect x="0" y="300" width="56" height="430" /><path d="M0 300 L56 360 M56 300 L0 360 M0 360 L56 420 M56 360 L0 420 M0 420 L56 480 M56 420 L0 480 M0 480 L56 540 M56 480 L0 540 M0 540 L56 600 M56 540 L0 600 M0 600 L56 660 M56 600 L0 660 M0 660 L56 720 M56 660 L0 720" /></g>
          <g transform="translate(0 0)"><rect x="150" y="290" width="500" height="46" /><path d="M150 290 L210 336 M210 290 L150 336 M210 290 L270 336 M270 290 L210 336 M270 290 L330 336 M330 290 L270 336 M330 290 L390 336 M390 290 L330 336 M410 290 L470 336 M470 290 L410 336 M470 290 L530 336 M530 290 L470 336 M530 290 L590 336 M590 290 L530 336 M590 290 L650 336 M650 290 L590 336" /></g>
        </g>
        <g><path d="M178 290 L178 250 L210 264 L178 278" fill="#FF4D1F" /><path d="M622 290 L622 250 L654 264 L622 278" fill="#3FD27E" /></g>
        <g fill="#0B0B0E" stroke="#9A9AA6" strokeWidth="3">
          <g transform="translate(150 0)"><rect x="-6" y="640" width="68" height="90" rx="6" /><circle cx="28" cy="676" r="10" /><circle cx="28" cy="706" r="14" /></g>
          <g transform="translate(594 0)"><rect x="-6" y="640" width="68" height="90" rx="6" /><circle cx="28" cy="676" r="10" /><circle cx="28" cy="706" r="14" /></g>
        </g>
        <rect x="0" y="800" width="800" height="200" fill="#050506" />
        <g fill="#1A1A22">
          {[[40,800,16],[96,808,15],[150,798,17],[208,808,15],[262,800,16],[320,810,15],[376,800,17],[432,808,15],[488,800,16],[544,810,15],[600,800,17],[656,808,15],[712,800,16],[766,808,15]].map(([cx,cy,r],i)=>(
            <circle key={i} cx={cx} cy={cy} r={r} />
          ))}
        </g>
        <g stroke="#3FD27E" strokeWidth="4" strokeLinecap="round" opacity="0.7" fill="none"><path d="M150 798 L138 752 M150 798 L164 754" /><path d="M376 800 L362 750 M376 800 L392 756" /><path d="M600 800 L586 752 M600 800 L616 756" /></g>
        <rect x="0" y="700" width="800" height="300" fill={`url(#${uid}fade)`} />
      </>
    ),
  }),
};
