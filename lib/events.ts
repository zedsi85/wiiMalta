/**
 * Wii Event Malta — mock event data (fictional).
 *
 * Structured so a real ticketing/CRM backend can replace this module later
 * without touching the UI. All imagery is intentionally left as gradient
 * "tints" + MediaSlot placeholders — drop real event photography/video in.
 */

export type EventStatus =
  | "available"
  | "limited"
  | "soldout"
  | "invite"
  | "earlybird";

export interface TicketTier {
  id: string;
  name: string;
  price: string;
  note?: string;
  status: EventStatus;
  vip?: boolean;
  perks: string[];
}

export interface LineupArtist {
  name: string;
  role: string;
  setTime?: string;
  country?: string;
  headliner?: boolean;
}

export interface WiiEvent {
  slug: string;
  title: string;
  date: string;
  dateLong: string;
  dateShort: string;
  iso: string;
  venue: string;
  city: string;
  genres: string[];
  lineup: string[];
  priceFrom: string;
  status: EventStatus;
  type: string;
  /** Placeholder poster tint — replace with real artwork. */
  tint: string;
  blurb: string;
  artists: LineupArtist[];
  tiers: TicketTier[];
  info: [string, string][];
  faq: [string, string][];
}

const baseTiers: TicketTier[] = [
  {
    id: "early",
    name: "Early Bird",
    price: "€35",
    note: "Phase 2 of 4",
    status: "limited",
    perks: ["Entry after 22:00", "Welcome drink"],
  },
  {
    id: "ga",
    name: "General Admission",
    price: "€45",
    note: "Standard entry",
    status: "available",
    perks: ["Entry after 22:00", "Access to all floors"],
  },
  {
    id: "vip",
    name: "VIP Terrace",
    price: "€95",
    vip: true,
    note: "Sea-view terrace",
    status: "available",
    perks: [
      "Fast-track entry",
      "Private sea-view terrace",
      "Table service",
      "Dedicated bar",
    ],
  },
];

const sunsetArtists: LineupArtist[] = [
  { name: "Adriatique", role: "DJ Set", setTime: "01:00 – 03:00", country: "🇨🇭", headliner: true },
  { name: "Massano", role: "Live", setTime: "23:30 – 01:00", country: "🇬🇧" },
  { name: "Cassian", role: "DJ Set", setTime: "03:00 – 05:00", country: "🇦🇺" },
  { name: "WII Residents", role: "Opening", setTime: "22:00 – 23:30", country: "🇲🇹" },
];

const sharedInfo: [string, string][] = [
  ["Doors", "22:00 — last entry 02:00"],
  ["Age", "21+ · ID required"],
  ["Dress", "No flip-flops. Come as the night."],
  ["Getting there", "Ferry + shuttle from Ċirkewwa"],
];

const sharedFaq: [string, string][] = [
  ["Is there re-entry?", "No re-entry once you leave the venue perimeter."],
  [
    "How do I get my ticket?",
    "Your QR ticket arrives by email and lives in your account — add it to Apple/Google Wallet.",
  ],
  [
    "What's the refund policy?",
    "Tickets are transferable up to 48h before. No refunds, but you can resell via the official waitlist.",
  ],
  ["Is there parking?", "Limited. We strongly recommend the official shuttle."],
];

export const events: WiiEvent[] = [
  {
    slug: "sunset-iv",
    title: "Sunset Sessions IV",
    date: "SAT · 12 JUL · 22:00",
    dateLong: "Saturday 12 July · 22:00 – 06:00",
    dateShort: "12.07",
    iso: "2026-07-12T22:00:00",
    venue: "Cave 12 — Gozo",
    city: "Gozo",
    genres: ["Melodic Techno", "Organic House"],
    lineup: ["Adriatique", "Massano", "WII Residents"],
    priceFrom: "€35",
    status: "limited",
    type: "Cave",
    tint: "linear-gradient(150deg,#3a1410,#120a18 72%)",
    blurb:
      "An all-night descent into a sea cave on the north coast of Gozo. Sound by Funktion-One, light by the Mediterranean.",
    artists: sunsetArtists,
    tiers: baseTiers,
    info: sharedInfo,
    faq: sharedFaq,
  },
  {
    slug: "salt-bass",
    title: "Salt & Bass",
    date: "FRI · 01 AUG · 23:00",
    dateLong: "Friday 1 August · 23:00 – 06:00",
    dateShort: "01.08",
    iso: "2026-08-01T23:00:00",
    venue: "Fort Ricasoli — Kalkara",
    city: "Kalkara",
    genres: ["House", "Afro House"],
    lineup: ["Cassian", "Âme", "Local Heroes"],
    priceFrom: "€45",
    status: "available",
    type: "Fort",
    tint: "linear-gradient(150deg,#101a2e,#0a0a14 72%)",
    blurb:
      "Bass against bastion walls. A historic fort opens its gates for one night of house and afro rhythms by the water.",
    artists: [
      { name: "Cassian", role: "DJ Set", setTime: "02:00 – 04:00", country: "🇦🇺", headliner: true },
      { name: "Âme", role: "DJ Set", setTime: "00:00 – 02:00", country: "🇩🇪" },
      { name: "Local Heroes", role: "Opening", setTime: "23:00 – 00:00", country: "🇲🇹" },
    ],
    tiers: baseTiers,
    info: sharedInfo,
    faq: sharedFaq,
  },
  {
    slug: "blue-grotto",
    title: "Blue Grotto",
    date: "SAT · 16 AUG · 21:00",
    dateLong: "Saturday 16 August · 21:00 – 04:00",
    dateShort: "16.08",
    iso: "2026-08-16T21:00:00",
    venue: "Blue Grotto — Żurrieq",
    city: "Żurrieq",
    genres: ["Downtempo", "Organic"],
    lineup: ["Bedouin", "Sainte Vie"],
    priceFrom: "€40",
    status: "soldout",
    type: "Coast",
    tint: "linear-gradient(150deg,#1a1030,#0a0a14 72%)",
    blurb:
      "Downtempo and organic textures above one of Malta's most cinematic coastlines. Sold out — join the waitlist.",
    artists: [
      { name: "Bedouin", role: "DJ Set", setTime: "01:00 – 03:00", country: "🇺🇸", headliner: true },
      { name: "Sainte Vie", role: "Live", setTime: "23:00 – 01:00", country: "🇲🇽" },
    ],
    tiers: baseTiers,
    info: sharedInfo,
    faq: sharedFaq,
  },
  {
    slug: "valletta-rooftop",
    title: "Valletta Rooftop",
    date: "SUN · 24 AUG · 18:00",
    dateLong: "Sunday 24 August · 18:00 – 01:00",
    dateShort: "24.08",
    iso: "2026-08-24T18:00:00",
    venue: "Strait Street — Valletta",
    city: "Valletta",
    genres: ["Disco", "House"],
    lineup: ["Folamour", "WII Residents"],
    priceFrom: "€30",
    status: "earlybird",
    type: "Rooftop",
    tint: "linear-gradient(150deg,#2a1810,#0a0a0c 72%)",
    blurb:
      "Golden hour into the night, high above the old city's most storied street. Disco, house and a sunset you'll keep.",
    artists: [
      { name: "Folamour", role: "Live", setTime: "21:00 – 23:00", country: "🇫🇷", headliner: true },
      { name: "WII Residents", role: "Sunset", setTime: "18:00 – 21:00", country: "🇲🇹" },
    ],
    tiers: baseTiers,
    info: sharedInfo,
    faq: sharedFaq,
  },
  {
    slug: "comino-day",
    title: "Comino Day Boat",
    date: "SAT · 06 SEP · 14:00",
    dateLong: "Saturday 6 September · 14:00 – 22:00",
    dateShort: "06.09",
    iso: "2026-09-06T14:00:00",
    venue: "Blue Lagoon — Comino",
    city: "Comino",
    genres: ["Beach", "Organic"],
    lineup: ["Invited Guests"],
    priceFrom: "€60",
    status: "invite",
    type: "Boat",
    tint: "linear-gradient(150deg,#10221f,#0a0a12 72%)",
    blurb:
      "Open water, open decks. An invite-only day on the Blue Lagoon for the community and friends of the house.",
    artists: [
      { name: "Invited Guests", role: "All day", setTime: "14:00 – 22:00", country: "🌍", headliner: true },
    ],
    tiers: baseTiers,
    info: sharedInfo,
    faq: sharedFaq,
  },
  {
    slug: "underground-vol9",
    title: "Underground Vol.9",
    date: "FRI · 19 SEP · 23:30",
    dateLong: "Friday 19 September · 23:30 – 07:00",
    dateShort: "19.09",
    iso: "2026-09-19T23:30:00",
    venue: "Secret Location — Malta",
    city: "Malta",
    genres: ["Techno"],
    lineup: ["TBA"],
    priceFrom: "€38",
    status: "available",
    type: "Secret",
    tint: "linear-gradient(150deg,#241318,#0a0a0c 72%)",
    blurb:
      "Location revealed 24 hours before doors. Pure techno, capped capacity, no phones on the floor.",
    artists: [
      { name: "TBA", role: "Headline", setTime: "02:00 – 05:00", country: "🌍", headliner: true },
      { name: "WII Residents", role: "Opening", setTime: "23:30 – 02:00", country: "🇲🇹" },
    ],
    tiers: baseTiers,
    info: sharedInfo,
    faq: sharedFaq,
  },
];

export const featuredSlug = "sunset-iv";

export function getEvent(slug: string): WiiEvent | undefined {
  return events.find((e) => e.slug === slug);
}

export function getFeatured(): WiiEvent {
  return getEvent(featuredSlug) ?? events[0];
}

export function similarEvents(slug: string, count = 3): WiiEvent[] {
  return events.filter((e) => e.slug !== slug).slice(0, count);
}

/** Human label + cinema-badge class per status. */
export const statusLabel: Record<EventStatus, string> = {
  available: "Available",
  limited: "Almost gone",
  soldout: "Sold out",
  invite: "Invite only",
  earlybird: "Early bird",
};

/* ---- Homepage chapter content ---- */
export const eventFormats: [string, string][] = [
  ["Club Nights", "Intimate rooms, serious sound systems."],
  ["Rooftop Sessions", "Sundown sets above the old city."],
  ["Beach Events", "Sand, salt and bass till late."],
  ["Sunset Rituals", "Golden hour into the night."],
  ["Boat Parties", "Open water, open decks."],
  ["Private & Villa", "Curated nights, capped capacity."],
  ["Festival Stages", "Bigger lineups, island scale."],
  ["Brand Activations", "Partners woven into the night."],
  ["Invite-Only", "Community nights you won't find listed."],
];

export const formatTints = [
  "#3a1410", "#101a2e", "#10221f", "#2a1810", "#1a1030",
  "#241318", "#13202e", "#2a1230", "#0f1a14",
];

/**
 * "Previous Moments" — real footage + stills from the team's Tunisia event
 * operations, used as proof of experience. `[label, isVideo]`.
 */
export const gallery: [string, boolean][] = [
  ["Real footage", true],
  ["Crowd Energy", false],
  ["Stage & Lighting", false],
  ["Behind the Scenes", true],
  ["Media Capture", false],
  ["Aftermovie '25", true],
  ["After Dark", false],
];

export const galleryTints = [
  "#3a1410", "#101a2e", "#1a1030", "#10221f", "#2a1810", "#241318", "#13202e",
];

/* ---- Tunisia → Malta credibility ---- */
export const credibilityPoints: string[] = [
  "Proven event operations",
  "Live crowd management",
  "Supplier & artist coordination",
  "Media & content execution",
  "Mediterranean audience understanding",
  "Now expanding to Malta",
];

export interface Founder {
  name: string;
  role: string;
  blurb: string;
  points: string[];
}

export const founders: Founder[] = [
  {
    name: "Ali",
    role: "Event Operations",
    blurb: "Brings proven event execution from Tunisia to Malta.",
    points: [
      "Event management experience in Tunisia",
      "Venue & supplier coordination",
      "Artist & lineup support",
      "Logistics & on-ground execution",
      "Malta operations",
    ],
  },
  {
    name: "Zied / Issatrix",
    role: "Digital Engine",
    blurb: "Builds the digital engine behind the brand.",
    points: [
      "Website & ticketing system",
      "CRM & audience database",
      "Media distribution & paid acquisition",
      "Community pass infrastructure",
      "Analytics & sponsor reporting",
    ],
  },
];

export const partners: [string, string, string][] = [
  ["01", "Venues", "Caves, forts, rooftops, lagoons — bring your space to the programme."],
  ["02", "Sponsors", "Activations woven into the night, never bolted on."],
  ["03", "Artists", "Residencies, debuts and one-off island collaborations."],
  ["04", "Brands", "Premium experiences for the right audience."],
  ["05", "Media", "Film, photo and press partners for the archive."],
  ["06", "Hospitality", "Hotels, transfers and VIP tables across Malta."],
];

export const communityPerks: [string, string][] = [
  ["Early access", "Tickets open to members 48 hours before public release."],
  ["Private drops", "Members-only events, secret locations, capped capacity."],
  ["Partner perks", "Discounts with venues, hotels, transfers and bars across Malta."],
  ["Community nights", "Invite-only gatherings, listening sessions and pre-parties."],
];
