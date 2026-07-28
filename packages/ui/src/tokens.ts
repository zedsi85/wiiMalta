/**
 * Wii Event Malta — Design tokens (TypeScript mirror).
 *
 * The *canonical* source of truth is the set of CSS custom properties declared
 * in `app/globals.css` (ported verbatim from the brand design system). This file
 * re-exports the same values as typed constants so they can be consumed in JS/TS
 * contexts — e.g. the Three.js shader palettes, animation timings, or anywhere a
 * `var(--token)` string is not usable.
 *
 * Direction: "Mediterranean Night" — deep void black, warm sand off-white, a
 * signature EMBER (sunset flare) primary, ELECTRIC AZURE secondary, PURPLE HAZE
 * for depth, and GOLD for VIP / membership.
 */

export const colors = {
  // Base neutrals — the dark spine of the brand
  void: "#050506",
  ink: "#0B0B0E",
  charcoal: "#131318",
  graphite: "#1B1B21",
  slate: "#26262E",
  steel: "#3A3A45",
  ash: "#6A6A77",
  fog: "#9A9AA6",
  smoke: "#C7C7D0",

  // Warm off-whites — the "sand / light" pole
  sand: "#EFE7D6",
  bone: "#FBF8F1",
  linen: "#F2ECE0",

  // Ember — primary signature (sunset flare)
  ember100: "#FFE4D8",
  ember300: "#FF9E7A",
  ember500: "#FF4D1F",
  ember600: "#ED3A0E",
  ember700: "#C42C06",

  // Azure — electric secondary / cool club light
  azure300: "#8FB4FF",
  azure500: "#2E6BFF",
  azure600: "#1A52E8",

  // Haze — purple glow / tertiary depth
  haze400: "#9A6CF0",
  haze500: "#7B36E3",
  haze600: "#6322C4",

  // Gold — VIP / membership
  gold300: "#F0D9A0",
  gold500: "#D8B05A",
  gold600: "#B98F3C",

  // Functional / status
  go500: "#3FD27E",
  go600: "#25B566",
  stop500: "#5A5A66",
} as const;

export const gradients = {
  glowEmber:
    "radial-gradient(60% 60% at 50% 0%, rgba(255,77,31,0.45), transparent 70%)",
  glowAzure:
    "radial-gradient(60% 60% at 50% 100%, rgba(46,107,255,0.40), transparent 70%)",
  glowHaze:
    "radial-gradient(50% 50% at 100% 0%, rgba(123,54,227,0.35), transparent 70%)",
  nightWash:
    "linear-gradient(180deg, #0B0B0E 0%, #131318 55%, #050506 100%)",
  emberSweep:
    "linear-gradient(100deg, #ED3A0E 0%, #FF4D1F 45%, #7B36E3 110%)",
} as const;

export const typography = {
  fontDisplay: '"Archivo Expanded", "Archivo", system-ui, sans-serif',
  fontUi: '"Archivo", system-ui, -apple-system, sans-serif',
  fontMono: '"Space Mono", "SFMono-Regular", ui-monospace, monospace',
  weights: { regular: 400, medium: 500, semi: 600, bold: 700, x: 800, black: 900 },
} as const;

export const spacing = {
  container: "1280px",
  containerWide: "1520px",
  containerNarrow: "760px",
  sectionY: "clamp(64px, 10vw, 160px)",
  sectionGap: "clamp(32px, 5vw, 72px)",
} as const;

export const radii = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "18px",
  xl: "28px",
  pill: "999px",
} as const;

export const shadows = {
  sm: "0 1px 2px rgba(0,0,0,0.6)",
  md: "0 8px 24px rgba(0,0,0,0.55)",
  lg: "0 24px 60px rgba(0,0,0,0.65)",
  pop: "0 32px 90px rgba(0,0,0,0.7)",
  glowCta: "0 8px 30px rgba(255,77,31,0.35)",
  glowCtaHi: "0 10px 44px rgba(255,77,31,0.55)",
} as const;

export const zIndex = {
  base: 0,
  fx: 1,
  content: 2,
  nav: 80,
  menu: 85,
  cursor: 90,
} as const;

export const motion = {
  durFast: 0.14,
  durBase: 0.24,
  durSlow: 0.48,
  durCinema: 0.9,
  easeOut: [0.22, 1, 0.36, 1] as const,
  easeInOut: [0.65, 0, 0.35, 1] as const,
  easeSnap: [0.34, 1.4, 0.64, 1] as const,
} as const;

export type Mood =
  | "hero"
  | "events"
  | "statement"
  | "formats"
  | "ticketing"
  | "community"
  | "gallery"
  | "partners"
  | "finale";
