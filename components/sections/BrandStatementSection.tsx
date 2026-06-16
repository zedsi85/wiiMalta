/** Chapter 03 — Not Just Events. Editorial typography + horizontal parallax words. */
const WORDS: { text: string; alt?: boolean; speed: number }[] = [
  { text: "SOUND", speed: -12 },
  { text: "PEOPLE", alt: true, speed: 16 },
  { text: "ISLAND", speed: -20 },
  { text: "COMMUNITY", alt: true, speed: 10 },
  { text: "NIGHT", speed: -14 },
];

export function BrandStatementSection() {
  return (
    <section id="statement" className="chapter chapter-statement" data-mood="statement">
      <div className="statement-words" id="statementWords">
        {WORDS.map((w) => (
          <div key={w.text} className={`sw${w.alt ? " alt" : ""}`} data-speed={w.speed}>
            {w.text}
          </div>
        ))}
      </div>
      <div className="statement-copy">
        <p className="statement-lead">
          <span data-rise>Not just parties.</span>
          <span data-rise>Curated nights, built around</span>
          <span data-rise>
            sound, people, places <em>&</em> community.
          </span>
        </p>
        <p className="statement-sub" data-rise>
          Mediterranean event specialists. An event brand, a ticketing platform, a music label and a
          community — proven in Tunisia, now building Malta&apos;s nights. And soon, a digital
          membership.
        </p>
      </div>
    </section>
  );
}
