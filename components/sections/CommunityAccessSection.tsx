import { MagneticButton } from "@/components/ui/MagneticButton";
import { WiiMark } from "@/components/ui/WiiMark";

/**
 * Chapter 06 — Community Access. The future digital pass, framed strictly as
 * access & utility (never investment). 3D-tilt pass + floating perk orbits.
 */
const ORBITS = ["Early access", "VIP upgrades", "Ticket credits", "Partner perks", "Private drops"];

export function CommunityAccessSection() {
  return (
    <section id="community" className="chapter" data-mood="community">
      <div className="chapter-head center">
        <div className="eyebrow gold" data-rise>
          Chapter 03 · Coming soon · Digital pass
        </div>
        <h2 className="big" data-rise>
          Belong to the night
        </h2>
      </div>
      <div className="community-stage">
        {ORBITS.map((label, i) => (
          <div className={`orbit orbit-${i + 1}`} key={label} data-rise>
            <b>{label}</b>
          </div>
        ))}
        <div className="pass-3d" id="pass3d">
          <div className="pass-card">
            <div className="pass-glow" />
            <div className="pass-top">
              <span>WII · DIGITAL PASS</span>
              <WiiMark size={34} color="var(--bone)" />
            </div>
            <div className="pass-tier">FOUNDING</div>
            <div className="pass-foot">
              <div>
                <i>Holder</i>
                <b>Your name</b>
              </div>
              <div className="r">
                <i>Member ID</i>
                <b>WII-001</b>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="community-copy center">
        <p data-rise>
          Soon, members will unlock early drops, VIP perks, ticket credits, consumption benefits and
          private community experiences — held in a single digital pass. Access &amp; utility, never
          speculation.
        </p>
        <div className="community-cta" data-rise>
          <MagneticButton href="/community" className="btn btn-vip-line btn-lg">
            Join the Waitlist
          </MagneticButton>
          <MagneticButton href="/events" className="btn btn-ghost-line btn-lg">
            Get Early Access
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}
