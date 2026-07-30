import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Wii Ambassadors", template: "%s · Wii Ambassadors" },
  description: "Wii Event OS — ambassador platform.",
  robots: { index: false, follow: false },
};

/** Ambassador portal shell — mobile-friendly, its own world (no admin chrome). */
export default function AmbassadorLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-3xl px-4 pb-16">{children}</div>;
}
