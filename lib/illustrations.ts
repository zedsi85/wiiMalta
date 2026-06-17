/**
 * Wii Event Malta — illustration variant system.
 *
 * Maps cards to a consistent abstract-artwork variant. Assignment is
 * deterministic (hash of the title) so it never changes between SSR and the
 * client — no hydration mismatch.
 */
import type { WiiEvent } from "./events";

export type CardIllustrationVariant =
  | "sound"
  | "sea"
  | "sun"
  | "ticket"
  | "community"
  | "island"
  | "stage"
  | "vip"
  | "access"
  | "gallery"
  | "partner";

const VARIANTS: CardIllustrationVariant[] = [
  "sound", "sea", "sun", "ticket", "community", "island", "stage", "vip", "access", "gallery", "partner",
];

/** Stable pseudo-random variant from a title (deterministic). */
export function getIllustrationVariantFromTitle(title: string): CardIllustrationVariant {
  const hash = title.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return VARIANTS[hash % VARIANTS.length];
}

/** Best-fit variant for an event based on its type / genres / status. */
export function eventVariant(event: WiiEvent): CardIllustrationVariant {
  const hay = `${event.type} ${event.genres.join(" ")} ${event.title}`.toLowerCase();
  if (event.status === "invite") return "access";
  if (event.status === "earlybird") return "sun";
  if (/(boat|beach|lagoon|grotto|coast|sea)/.test(hay)) return "sea";
  if (/(sunset|rooftop|terrace)/.test(hay)) return "sun";
  if (/(fort|festival|stage)/.test(hay)) return "stage";
  if (/(techno|house|melodic|disco|sound|club)/.test(hay)) return "sound";
  return getIllustrationVariantFromTitle(event.title);
}

/** Explicit mapping for the homepage event-format cards. */
const FORMAT_VARIANTS: Record<string, CardIllustrationVariant> = {
  "Club Nights": "sound",
  "Rooftop Sessions": "stage",
  "Beach Events": "sea",
  "Sunset Rituals": "sun",
  "Boat Parties": "sea",
  "Private & Villa": "vip",
  "Festival Stages": "stage",
  "Brand Activations": "partner",
  "Invite-Only": "access",
};

export function formatVariant(title: string): CardIllustrationVariant {
  return FORMAT_VARIANTS[title] ?? getIllustrationVariantFromTitle(title);
}
