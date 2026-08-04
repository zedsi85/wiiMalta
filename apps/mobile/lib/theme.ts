import { colors as brand, radii, motion } from "@wii/ui/tokens";

/**
 * Mobile theme — a direct projection of the existing Wii design tokens
 * (@wii/ui). No new visual identity: same void/ink grounds, ember accent,
 * sand/bone type colors, same radii.
 */
export const c = {
  void: brand.void,
  ink: brand.ink,
  charcoal: brand.charcoal,
  graphite: brand.graphite,
  slate: brand.slate,
  steel: brand.steel,
  ash: brand.ash,
  fog: brand.fog,
  smoke: brand.smoke,
  sand: brand.sand,
  bone: brand.bone,
  ember: brand.ember500,
  ember300: brand.ember300,
  ember600: brand.ember600,
  azure: brand.azure500,
  gold: brand.gold500,
  go: brand.go500,
} as const;

export const r = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 28,
  pill: 999,
} as const;
void radii;
void motion;

export const font = {
  /** Loaded in app/_layout — Archivo Black-adjacent display face. */
  display: "Archivo_800ExtraBold",
  displayBlack: "Archivo_900Black",
  ui: "Archivo_500Medium",
  uiBold: "Archivo_700Bold",
  mono: "SpaceMono_400Regular",
  monoBold: "SpaceMono_700Bold",
} as const;

/** Parse the event artwork tint ("linear-gradient(150deg,#3a1410,#120a18 72%)") → color stops. */
export function tintColors(tint: string | undefined): [string, string] {
  const hexes = (tint ?? "").match(/#[0-9a-fA-F]{6}/g);
  if (hexes && hexes.length >= 2) return [hexes[0], hexes[1]];
  return ["#3a1410", "#120a18"];
}
