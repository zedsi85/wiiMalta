/**
 * Wii Event Malta — illustration variant system.
 *
 * Backed by the official "Event Artwork System": eight poster directions
 * (club · sunset · beach · boat · rooftop · invite · vip · festival). Cards pick
 * the best-fit poster. Assignment is deterministic so it never changes between
 * SSR and the client (no hydration mismatch).
 */
import type { WiiEvent } from "./events";

/** The eight canonical poster artworks. */
export type Artwork = "club" | "sunset" | "beach" | "boat" | "rooftop" | "invite" | "vip" | "festival";

/**
 * Public variant prop — accepts a poster artwork directly, or a semantic alias
 * kept for the card call-sites (mapped to a poster via {@link toArtwork}).
 */
export type CardIllustrationVariant =
  | Artwork
  | "sound"
  | "sea"
  | "sun"
  | "ticket"
  | "community"
  | "island"
  | "stage"
  | "access"
  | "gallery"
  | "partner";

const ALIAS: Record<Exclude<CardIllustrationVariant, Artwork>, Artwork> = {
  sound: "club",
  sea: "beach",
  sun: "sunset",
  ticket: "vip",
  community: "festival",
  island: "boat",
  stage: "festival",
  access: "invite",
  gallery: "rooftop",
  partner: "rooftop",
};

const ARTWORKS: Artwork[] = ["club", "sunset", "beach", "boat", "rooftop", "invite", "vip", "festival"];

/** Normalise any variant (artwork or alias) to a concrete poster artwork. */
export function toArtwork(variant: CardIllustrationVariant): Artwork {
  return (ARTWORKS as readonly string[]).includes(variant)
    ? (variant as Artwork)
    : ALIAS[variant as Exclude<CardIllustrationVariant, Artwork>];
}

/** Stable pseudo-random poster from a title (deterministic). */
export function getIllustrationVariantFromTitle(title: string): Artwork {
  const hash = title.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return ARTWORKS[hash % ARTWORKS.length];
}

/** Best-fit poster for an event from its type / genres / title / status. */
export function eventVariant(event: WiiEvent): Artwork {
  const hay = `${event.type} ${event.genres.join(" ")} ${event.title}`.toLowerCase();
  if (/sunset/.test(hay)) return "sunset";
  if (/boat/.test(hay)) return "boat";
  if (/rooftop|terrace/.test(hay)) return "rooftop";
  if (/beach|lagoon|grotto|coast|comino/.test(hay)) return "beach";
  if (/fort|festival|main stage/.test(hay)) return "festival";
  if (/villa|private|table|vip/.test(hay)) return "vip";
  if (event.status === "invite") return "invite";
  if (/techno|house|club|melodic|disco|afro|downtempo|organic/.test(hay)) return "club";
  return getIllustrationVariantFromTitle(event.title);
}

/** Explicit mapping for the homepage event-format cards. */
const FORMAT_VARIANTS: Record<string, Artwork> = {
  "Club Nights": "club",
  "Rooftop Sessions": "rooftop",
  "Beach Events": "beach",
  "Sunset Rituals": "sunset",
  "Boat Parties": "boat",
  "Private & Villa": "vip",
  "Festival Stages": "festival",
  "Brand Activations": "festival",
  "Invite-Only": "invite",
};

export function formatVariant(title: string): Artwork {
  return FORMAT_VARIANTS[title] ?? getIllustrationVariantFromTitle(title);
}
