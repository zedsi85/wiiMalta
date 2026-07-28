import SmoothScrollProvider from "@/components/layout/SmoothScrollProvider";
import CustomCursor from "@/components/layout/CustomCursor";
import FluidBackground from "@/components/webgl/FluidBackground";
import { Navbar } from "@/components/layout/Navbar";
import { ConditionalFooter } from "@/components/layout/ConditionalFooter";

/**
 * The full cinematic experience stack: Lenis smooth scroll, the Three.js fluid
 * background + grain/vignette layers, the custom glow cursor, and site chrome.
 *
 * Mounted by the (marketing) route-group layout — and, for now, by (platform)
 * too so the split is a zero-visual-change refactor. When the platform grows
 * real transactional flows (auth'd checkout, account, tickets), (platform)
 * swaps this for a lean shell: same tokens and chrome, no scroll hijack, no
 * WebGL, no custom cursor. That swap is a one-file change by design.
 */
export function CinematicShell({ children }: { children: React.ReactNode }) {
  return (
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
  );
}
