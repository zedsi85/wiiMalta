import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./cinema.css";
import { RefCapture } from "@/components/layout/RefCapture";

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

/**
 * Root layout is deliberately bare: fonts, global styles, metadata. The
 * experience shells live in the route groups — (marketing) keeps the full
 * cinematic stack; (platform) will lean out when transactional flows land.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <RefCapture />
        {children}
      </body>
    </html>
  );
}
