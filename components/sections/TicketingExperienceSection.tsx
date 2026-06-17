import AccessParticles from "@/components/webgl/AccessParticles";
import { CardIllustration } from "@/components/visual/CardIllustration";
import { qrCells } from "@/lib/qr";

/** Chapter 05 — Ticketing Experience. Five-step journey + parallax phone demo. */
const STEPS: [string, string, string][] = [
  ["01", "Discover the event", "Find the next drop across the islands."],
  ["02", "Choose your tier", "GA, early bird or VIP terrace + table."],
  ["03", "Book online", "Fast, secure, transferable up to 48h."],
  ["04", "Receive your QR", "Straight to your wallet. No paper, no queue."],
  ["05", "Enter the experience", "Scan at the door. You're in."],
];

export function TicketingExperienceSection() {
  const cells = qrCells("VIP-0427");
  return (
    <section id="ticketing" className="chapter" data-mood="ticketing">
      <AccessParticles className="fx-layer" mode="tickets" density={48} opacity={0.2} interactive />
      <div className="ticketing-wrap">
        <div className="ticketing-copy">
          <div className="eyebrow" data-rise>
            Chapter 02 · The platform
          </div>
          <h2 className="big" data-rise>
            Tickets in
            <br />
            five moves
          </h2>
          <ol className="steps" id="steps" data-stagger>
            {STEPS.map(([n, h, p]) => (
              <li key={n} data-rise>
                <b>{n}</b>
                <div>
                  <h4>{h}</h4>
                  <p>{p}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="ticketing-phone" id="phone">
          <div className="phone-shell">
            <div className="phone-notch" />
            <div className="phone-screen">
              {/* @asset replace with real event film */}
              <div className="media-slot ph-hero">
                <CardIllustration variant="ticket" intensity="high" animated />
                <span>▦ Event film</span>
              </div>
              <div className="ph-body">
                <div className="ph-title">Sunset Sessions IV</div>
                <div className="ph-meta">SAT · 12 JUL · 22:00 — Cave 12, Gozo</div>
                <div className="ph-ticket" id="phTicket">
                  <div className="ph-ticket-top">
                    <span>VIP Terrace</span>
                    <b>€95</b>
                  </div>
                  <div className="ph-ticket-perks">
                    <span>Fast-track</span>
                    <span>Sea-view</span>
                    <span>Table</span>
                  </div>
                </div>
                <div className="qr-card" id="qrCard">
                  <div className="qr-grid" id="qrGrid">
                    {cells.map((v, i) => (
                      <span key={i} style={{ background: v ? "#0B0B0E" : "transparent" }} />
                    ))}
                  </div>
                  <div className="qr-id">
                    <i>Ticket</i>
                    <b>VIP-0427</b>
                  </div>
                </div>
                <div className="ph-buy">Pay €95.00</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
