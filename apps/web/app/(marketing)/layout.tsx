import { CinematicShell } from "@/components/layout/CinematicShell";

/**
 * Marketing world: /, /about, /community, /partners, /team.
 * Keeps the full cinematic experience (smooth scroll, WebGL background,
 * custom cursor) permanently.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CinematicShell>{children}</CinematicShell>;
}
