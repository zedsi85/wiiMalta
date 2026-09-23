import fs from "node:fs";
import path from "node:path";

/**
 * Event *editions* — special-edition presentation layered on top of the
 * standard event detail page. An edition adds a video-capable hero, editorial
 * sections and a theme; everything else (tiers, checkout, lineup, info, SEO)
 * stays the regular architecture. Events without an edition render exactly as
 * before.
 *
 * Media is read from `public/<dir>/` at render time: drop the files listed in
 * each slot into the folder and they appear — no code change. Everything here
 * is plain data (it crosses the server→client boundary).
 */

export interface EditionMedia {
  kind: "video" | "image";
  src: string;
  /** Poster frame for videos / fallback image. */
  poster?: string;
  alt: string;
}

export interface EditionChapter {
  id: string;
  index: string;
  title: string;
  line: string;
  media?: EditionMedia;
}

export interface Edition {
  key: string;
  theme: "prison";
  /** Secondary branding line shown under the status badge in the hero. */
  kicker: string;
  hero: { media?: EditionMedia; tagline: string; cta: string };
  story: { headline: string[]; body: string[] };
  venue: { label: string; headline: string; body: string[]; media?: EditionMedia };
  chapters: EditionChapter[];
  lineupHeadline: string;
  offer: { price: string; includes: string; cta: string };
  /** Slot files this edition looks for (documented for whoever drops media in). */
  mediaDir: string;
}

const PUBLIC = path.join(process.cwd(), "public");

/** First existing file among candidates (relative to /public), else undefined. */
function firstExisting(dir: string, names: string[]): string | undefined {
  for (const n of names) {
    if (fs.existsSync(path.join(PUBLIC, dir, n))) return `/${dir}/${n}`;
  }
  return undefined;
}

function media(dir: string, base: string, alt: string, imageFallback?: string): EditionMedia | undefined {
  const video = firstExisting(dir, [`${base}.mp4`, `${base}.webm`]);
  const image = firstExisting(dir, [`${base}.webp`, `${base}.jpg`, `${base}.png`]) ?? imageFallback;
  if (video) return { kind: "video", src: video, poster: image, alt };
  if (image) return { kind: "image", src: image, alt };
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Halloween Prison ROOM — Old Historical Prison, Kordin / Paola       */
/* ------------------------------------------------------------------ */

function prisonHalloween(): Edition {
  const dir = "venues/old-prison";
  const cellBlock = "/venues/old-prison/cell-block.webp";
  const yard = "/venues/old-prison/yard.webp";
  return {
    key: "prison-halloween",
    theme: "prison",
    mediaDir: dir,
    kicker: "Prison Room · Halloween edition · One night only",
    hero: {
      media: media(dir, "hero", "The cell block of the Old Historical Prison, Kordin", "/venues/old-prison/hero-poster.webp"),
      tagline: "One night. Inside a place built for another era.",
      cta: "Get tickets",
    },
    story: {
      headline: ["This Halloween,", "we're not going to a club.", "We're going to prison."],
      body: [
        "For one night, Wii takes over a historic prison complex on the Kordin heights above Paola and opens its doors for music. Techno in the wings. The exercise yard as the floor. Stone and iron where there would usually be velvet and mirrors.",
        "Nothing here is a set. The bars, the corridors, the barred windows in their long rows — all real, all built for another purpose, all lit for this one. On Halloween, the doors open again. This time for music.",
      ],
    },
    venue: {
      label: "The venue",
      headline: "Built in 1866. Opened for one night.",
      body: [
        "The Corradino prison complex on the Kordin heights dates to the 19th century. Constructed in 1866 as a naval prison for the British forces on the island, it was later transferred to military use — built to the pattern of its time: long prison wings, rows of barred cell windows, and enclosed exercise yards.",
        "We haven't dressed it up. We've lit it. What you walk through is the real architecture — the experience comes from the place itself.",
      ],
      media: media(dir, "venue", "Barred cell windows of the historic prison wing", cellBlock),
    },
    chapters: [
      { id: "gates", index: "01", title: "The Gates", line: "Through the perimeter. Leave the city outside.", media: media(dir, "gates", "The prison gates") },
      { id: "corridors", index: "02", title: "The Corridors", line: "Stone, iron, and the sound getting closer.", media: media(dir, "corridors", "Prison corridor") },
      { id: "cells", index: "03", title: "The Cells", line: "Rows of barred windows, built to keep people in. Tonight they let the light out.", media: media(dir, "cells", "Prison cell block facade", cellBlock) },
      { id: "yard", index: "04", title: "The Yard", line: "The exercise yard becomes the open-air floor under the Malta night.", media: media(dir, "yard", "The prison exercise yard", yard) },
      { id: "dancefloor", index: "05", title: "The Dancefloor", line: "Markelov. Marko Nastic. Mato. 22:00 to 04:00.", media: media(dir, "dancefloor", "The dancefloor") },
    ],
    lineupHeadline: "Three rooms of sound, one prison.",
    offer: { price: "€25", includes: "One free welcome drink included", cta: "Get your ticket" },
  };
}

const EDITIONS: Record<string, () => Edition> = {
  "halloween-prison-room": prisonHalloween,
};

export function editionForSlug(slug: string): Edition | undefined {
  return EDITIONS[slug]?.();
}
