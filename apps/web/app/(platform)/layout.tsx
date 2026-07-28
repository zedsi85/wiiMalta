import { CinematicShell } from "@/components/layout/CinematicShell";

/**
 * Platform world: /events, /checkout — later /account, /tickets, /ambassador.
 *
 * Currently renders the same cinematic shell as (marketing) so Phase 0 ships
 * with zero visual change. When real transactional flows land (Phase 2), this
 * layout swaps to a lean shell — same design tokens and chrome, but no Lenis
 * scroll hijack, no WebGL canvas, no custom cursor — because checkout needs
 * fast TTI, native scrolling, form accessibility, and low-end mobile headroom.
 * The route-group split exists precisely so that swap is a one-file change.
 */
export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CinematicShell>{children}</CinematicShell>;
}
