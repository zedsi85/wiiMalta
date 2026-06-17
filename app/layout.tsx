import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./cinema.css";
import SmoothScrollProvider from "@/components/layout/SmoothScrollProvider";
import CustomCursor from "@/components/layout/CustomCursor";
import FluidBackground from "@/components/webgl/FluidBackground";
import { Navbar } from "@/components/layout/Navbar";
import { ConditionalFooter } from "@/components/layout/ConditionalFooter";

// Resolve the public origin for canonical/OG URLs. On Vercel, VERCEL_URL is set
// automatically per deployment; set NEXT_PUBLIC_SITE_URL to pin a custom domain.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  title: {
    default: "Wii Event Malta — Malta After Dark",
    template: "%s · Wii Event Malta",
  },
  description:
    "Curated nights across Malta. Sound, location, people and culture — connected after dark. Destination events and ticketing for the new nightlife community.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "Wii Event Malta — Malta After Dark",
    description: "Curated nights across Malta. Connected after dark.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#050506",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SmoothScrollProvider>
          {/* Fixed cinematic visual layers (z 0–1) */}
          <FluidBackground mood="hero" />
          <div id="grain" aria-hidden="true" />
          <div id="vignette" aria-hidden="true" />

          {/* Custom glow cursor (fine pointers only) */}
          <CustomCursor />

          {/* Chrome + content */}
          <Navbar />
          <div className="page-shell">{children}</div>
          <ConditionalFooter />
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
