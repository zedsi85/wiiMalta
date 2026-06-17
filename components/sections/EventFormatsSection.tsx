import IslandContours from "@/components/visual/IslandContours";
import { eventFormats, formatTints } from "@/lib/events";
import { pad } from "@/lib/utils";

/** Chapter 04 — Event Formats. Interactive grid with hover-reveal descriptions. */
export function EventFormatsSection() {
  return (
    <section id="formats" className="chapter" data-mood="formats">
      <IslandContours className="fx-layer" variant="malta" opacity={0.14} animated />
      <div className="chapter-head">
        <div className="eyebrow" data-rise>
          Chapter 05 · What we build
        </div>
        <h2 className="big" data-rise>
          Event Formats
        </h2>
      </div>
      <div className="formats-grid" id="formatsGrid" data-stagger>
        {eventFormats.map(([title, desc], i) => (
          <div className="fmt" key={title} data-card="Explore">
            {/* @asset replace gradient with real format imagery */}
            <div className="pp" style={{ background: `linear-gradient(155deg,${formatTints[i]},#0a0a0c 75%)` }} />
            <span className="fmt-num">{pad(i + 1)}</span>
            <div className="fmt-label">
              <h4>{title}</h4>
              <p>{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
