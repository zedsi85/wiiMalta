import Link from "next/link";
import { WiiMark } from "@/components/ui/WiiMark";
import { CinematicShell } from "@/components/layout/CinematicShell";

export default function NotFound() {
  return (
    <CinematicShell>
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          textAlign: "center",
          padding: "var(--gutter)",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div>
          <div style={{ display: "flex", justifyContent: "center", color: "var(--ember-500)", marginBottom: 24 }}>
            <WiiMark size={56} />
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ember-500)" }}>
            Lost after dark
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: "clamp(3rem, 12vw, 9rem)",
              textTransform: "uppercase",
              letterSpacing: "-0.03em",
              lineHeight: 0.86,
              color: "var(--bone)",
              marginTop: 14,
            }}
          >
            404
          </h1>
          <p style={{ marginTop: 18, color: "var(--sand)" }}>This page slipped into the night.</p>
          <Link
            href="/"
            className="btn btn-primary"
            data-cursor
            style={{ marginTop: 28, display: "inline-flex" }}
          >
            Back to the night
          </Link>
        </div>
      </main>
    </CinematicShell>
  );
}
