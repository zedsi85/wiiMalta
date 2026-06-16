import { VideoCard } from "@/components/ui/VideoCard";
import { credibilityPoints } from "@/lib/events";

/**
 * Brand story — "Built in Tunisia. Expanding across the Mediterranean."
 * Establishes credibility: the team is not starting from zero. Real footage
 * (right) backs up the operational track record (left). Anchor: #story.
 */
export function TunisiaStorySection() {
  return (
    <section id="story" className="chapter" data-mood="events">
      <div className="story-wrap">
        <div className="story-copy">
          <div className="eyebrow" data-rise>
            Chapter 01 · The track record
          </div>
          <h2 className="big" data-rise style={{ fontSize: "clamp(2.25rem, 5.5vw, 4.5rem)" }}>
            Built in Tunisia.
            <br />
            Expanding the
            <br />
            Mediterranean.
          </h2>
          <p data-rise style={{ marginTop: 26, maxWidth: "48ch", color: "var(--sand)", fontSize: "1.0625rem", lineHeight: 1.6 }}>
            Wii Event Malta is not starting from zero. Our team has already built and operated
            successful event experiences in Tunisia — managing the details that make nightlife work:
            venues, artists, suppliers, logistics, crowd energy and media.
          </p>
          <p data-rise style={{ marginTop: 16, maxWidth: "48ch", color: "var(--fog)", fontSize: "1rem", lineHeight: 1.6 }}>
            Malta is the next chapter — an island built for destination events, international crowds,
            Mediterranean nights and community-driven experiences.
          </p>
          <ul
            data-rise
            data-stagger
            style={{ listStyle: "none", margin: "30px 0 0", padding: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" }}
          >
            {credibilityPoints.map((p) => (
              <li key={p} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: "0.9rem", color: "var(--sand)" }}>
                <span style={{ color: "var(--ember-500)", flex: "0 0 auto", marginTop: 1 }} aria-hidden>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="story-media" data-rise>
          <VideoCard
            src="/videos/tunisia-event-2.mp4"
            label="Tunisia event operations"
            badge="Real footage · Tunisia"
            aspect="4 / 5"
            play
          />
        </div>
      </div>
    </section>
  );
}
