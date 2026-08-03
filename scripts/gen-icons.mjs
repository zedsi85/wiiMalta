#!/usr/bin/env node
/** Rasterize the brand mark (apps/web/app/icon.svg) into guard PWA icons:
 *  mark centered at ~62% on the void ground (maskable-safe padding). */
import sharp from "sharp";
import fs from "node:fs";

const svg = fs.readFileSync("apps/web/app/icon.svg");
for (const size of [180, 192, 512]) {
  const mark = Math.round(size * 0.62);
  const markPng = await sharp(svg, { density: 300 }).resize(mark, mark, { fit: "contain" }).png().toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: "#0b0b0e" },
  })
    .composite([{ input: markPng, gravity: "centre" }])
    .png()
    .toFile(`apps/admin/public/guard/icon-${size}.png`);
  console.log(`icon-${size}.png ✓`);
}
