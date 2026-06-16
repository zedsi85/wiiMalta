import { gallery, galleryTints } from "@/lib/events";

/**
 * Chapter 07 — Previous Moments. A horizontal, pinned gallery (GSAP) of masked
 * placeholder zones. "Watch Moment" on video tiles via the custom cursor.
 */
export function PreviousMomentsSection() {
  return (
    <section id="gallery" className="chapter" data-mood="gallery">
      <div className="chapter-head">
        <div className="eyebrow" data-rise>
          Chapter 07 · The archive
        </div>
        <h2 className="big" data-rise>
          Previous Moments
        </h2>
      </div>
      <div className="gallery-track-wrap">
        <div className="gallery-track" id="galleryTrack">
          {gallery.map(([label, isVideo], i) => (
            <div
              className={`gal${isVideo ? " video" : ""}`}
              key={label}
              data-card={isVideo ? "Watch Moment" : "View"}
            >
              {/* @asset replace gradient with real event photo/film */}
              <div className="pp" style={{ background: `linear-gradient(160deg,${galleryTints[i]},#0a0a0c)` }} />
              {isVideo ? <span className="gal-play">▶</span> : null}
              <span className="gal-cap">▦ {label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
