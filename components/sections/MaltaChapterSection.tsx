import { MagneticButton } from "@/components/ui/MagneticButton";
import { getFeatured } from "@/lib/events";

/**
 * "The Malta Chapter Starts Here." — connects the Tunisia track record to the
 * flagship Malta launch event. Details pull from the featured event so the real
 * ticketing data drives the copy.
 */
export function MaltaChapterSection() {
  const flagship = getFeatured();
  const facts: [string, string][] = [
    ["First event", flagship.title],
    ["Venue", flagship.venue],
    ["Date", flagship.dateLong],
    ["Capacity", "Capped · 600"],
    ["Lineup", flagship.lineup.join(" · ")],
    ["Tickets from", flagship.priceFrom],
  ];

  return (
    <section id="malta-chapter" className="chapter" data-mood="community">
      <div className="chapter-head">
        <div className="eyebrow" data-rise>
          Chapter 08 · The launch
        </div>
        <h2 className="big" data-rise>
          The Malta chapter
          <br />
          starts here.
        </h2>
        <p data-rise style={{ marginTop: 22, maxWidth: "54ch", color: "var(--sand)", fontSize: "1.0625rem", lineHeight: 1.6 }}>
          After building real event experience in Tunisia, Wii Event Malta launches with a flagship
          Mediterranean event — designed to connect locals, expats, tourists, artists and premium
          nightlife communities.
        </p>
      </div>

      <div className="malta-facts" data-stagger>
        {facts.map(([k, v]) => (
          <div className="malta-fact" key={k} data-rise>
            <div className="malta-fact-k">{k}</div>
            <div className="malta-fact-v">{v}</div>
          </div>
        ))}
      </div>

      <div className="partners-cta" data-rise style={{ marginTop: "var(--space-7)" }}>
        <MagneticButton href={`/events/${flagship.slug}`} className="btn btn-primary btn-lg">
          Get Tickets
        </MagneticButton>
        <MagneticButton href="/partners" className="btn btn-vip-line btn-lg">
          Sponsor This Event
        </MagneticButton>
        <MagneticButton href="/partners" className="btn btn-ghost-line btn-lg">
          Partner With Us
        </MagneticButton>
      </div>
    </section>
  );
}
