import { gallery, galleryTints } from "@/lib/events";

/**
 * Chapter 08 — Previous Moments From Tunisia. A horizontal, pinned gallery (GSAP)
 * proving the track record: real footage + crowd / stage / media placeholders.
 * The lead tile plays real Tunisia event footage; the rest are marked zones for
 * crowd stills, artist moments, social content and the aftermovie.
 */
export function PreviousMomentsSection() {
  return (
    <section id="gallery" className="chapter" data-mood="gallery">
      <div className="chapter-head">
        <div className="eyebrow" data-rise>
          Chapter 04 · The archive
        </div>
        <h2 className="big" data-rise>
          Previous Moments
        </h2>
        <p data-rise style={{ marginTop: 20, maxWidth: "46ch", color: "var(--fog)", fontSize: "1.0625rem", lineHeight: 1.6 }}>
          Real moments from our Mediterranean event experience.
        </p>
      </div>
      <div className="gallery-track-wrap">
        <div className="gallery-track" id="galleryTrack">
          {gallery.map(([label, isVideo], i) => {
            const featured = i === 0;
            return (
              <div
                className={`gal${isVideo ? " video" : ""}`}
                key={label}
                data-card={isVideo ? "Watch Moment" : "View"}
              >
                {featured ? (
                  // @asset real Tunisia event footage (cached from the hero clip)
                  <video
                    className="gal-video"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="none"
                    poster="/videos/hero-fallback.svg"
                  >
                    <source src="/videos/tunisia-event-footage.mp4" type="video/mp4" />
                  </video>
                ) : (
                  // @asset replace gradient with real event photo/film
                  <div className="pp" style={{ background: `linear-gradient(160deg,${galleryTints[i]},#0a0a0c)` }} />
                )}
                {isVideo ? <span className="gal-play">▶</span> : null}
                <span className="gal-cap">▦ {label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
