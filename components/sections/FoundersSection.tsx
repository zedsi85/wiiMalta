import { founders } from "@/lib/events";

/**
 * Founder / team section — the two halves of the collective.
 * "One side builds the night. The other builds the engine."
 */
export function FoundersSection() {
  return (
    <section id="team" className="chapter" data-mood="partners">
      <div className="chapter-head">
        <div className="eyebrow" data-rise>
          Chapter 07 · The collective
        </div>
        <h2 className="big" data-rise>
          Who builds
          <br />
          the night
        </h2>
        <p data-rise style={{ marginTop: 22, maxWidth: "44ch", color: "var(--sand)", fontSize: "1.0625rem", lineHeight: 1.6 }}>
          One side builds the night. The other builds the engine.
        </p>
      </div>

      <div className="founders-grid" data-stagger>
        {founders.map((f, i) => (
          <div className="founder-card" key={f.name} data-rise>
            <div className="founder-top">
              <span className="founder-idx">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="founder-name">{f.name}</h3>
                <div className="founder-role">{f.role}</div>
              </div>
            </div>
            <p className="founder-blurb">{f.blurb}</p>
            <ul className="founder-points">
              {f.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
