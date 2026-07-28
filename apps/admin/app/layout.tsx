import type { Metadata } from "next";
import "@wii/ui/tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Wii Admin",
    template: "%s · Wii Admin",
  },
  description: "Wii Event OS — operations console.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
