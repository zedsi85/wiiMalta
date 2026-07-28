# Video assets — Wii Event Malta

Real event footage from the team's **Tunisia** event operations, used as proof of
experience across the site.

| File | Used in |
|---|---|
| `tunisia-event-footage.mp4` | Hero full-screen background video |
| `tunisia-event-2.mp4` | Brand-story card + "Previous Moments" gallery |
| `hero-fallback.svg` | Poster shown before/instead of the hero video (branded gradient) |

## Optimisation backlog (do before heavy traffic)

These MP4s are shipped as-supplied. For production, transcode for the web:

```bash
# Compressed, web-faststart MP4 (poster also extractable)
ffmpeg -i tunisia-event-footage.mp4 -vf "scale=-2:1080" -c:v libx264 -crf 24 \
  -preset slow -movflags +faststart -an tunisia-event-footage.mp4

# WebM (smaller; add a <source type="video/webm"> ahead of the mp4)
ffmpeg -i tunisia-event-footage.mp4 -c:v libvpx-vp9 -crf 34 -b:v 0 -an tunisia-event-footage.webm

# Raster poster frame (swap hero-fallback.svg -> .jpg in HeroSection)
ffmpeg -i tunisia-event-footage.mp4 -ss 00:00:01 -frames:v 1 hero-fallback.jpg
```

The hero `<video>` already declares a `<source type="video/webm">` first — drop a
`tunisia-event-footage.webm` next to the mp4 and it will be preferred automatically.
