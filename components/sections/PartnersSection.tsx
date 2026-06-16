import { MagneticButton } from "@/components/ui/MagneticButton";
import { partners } from "@/lib/events";

/** Chapter 08 — Partner With Us. Structured category grid + dual CTA. */
export function PartnersSection() {
  return (
    <section id="partners" className="chapter" data-mood="partners">
      <div className="chapter-head">
        <div className="eyebrow" data-rise>
          Chapter 09 · Work with us
        </div>
        <h2 className="big" data-rise>
          Partner With Us
        </h2>
      </div>
      <div className="partners-grid" id="partnersGrid" data-stagger>
        {partners.map(([num, title, desc]) => (
          <div className="pcard" key={num} data-card="Partner">
            <b>{num}</b>
            <h4>{title}</h4>
            <p>{desc}</p>
          </div>
        ))}
      </div>
      <div className="partners-cta" data-rise>
        <MagneticButton href="/partners" className="btn btn-primary">
          Partner With Us
        </MagneticButton>
        <MagneticButton href="/partners" className="btn btn-ghost-line">
          Contact the Team
        </MagneticButton>
      </div>
    </section>
  );
}
