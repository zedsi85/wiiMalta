import type { Metadata, Viewport } from "next";
import { GuardPwa } from "./pwa";

export const metadata: Metadata = {
  title: {
    default: "Wii Door",
    template: "%s · Wii Door",
  },
  description: "Wii Event OS — security check-in.",
  robots: { index: false, follow: false },
  manifest: "/guard/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Wii Door",
  },
  icons: {
    apple: "/guard/icon-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

/**
 * Guard portal shell — mobile-first, no admin chrome. Guards live entirely
 * under /guard/*; the (dash) admin world is unreachable to them (requireStaff
 * denies the scanner role).
 */
export default function GuardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <GuardPwa />
      {children}
    </div>
  );
}
