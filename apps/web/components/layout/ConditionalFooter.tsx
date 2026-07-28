"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./Footer";

/**
 * The cinematic homepage ends in its own finale footer, so the shared site
 * Footer is suppressed there and rendered on every other route.
 */
export function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <Footer />;
}
