"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WiiMark } from "@/components/ui/WiiMark";
import { MagneticButton } from "@/components/ui/MagneticButton";

const LINKS: { label: string; href: string }[] = [
  { label: "Events", href: "/events" },
  { label: "Community", href: "/community" },
  { label: "Gallery", href: "/#gallery" },
  { label: "Partners", href: "/partners" },
  { label: "About", href: "/about" },
];

/**
 * Wii Event Malta — Navbar.
 * Transparent over the hero, solidifies (glass) on scroll. Active-section
 * indicator, magnetic Buy-Tickets CTA, and a full-screen poster-energy mobile
 * menu with an animated clip-path open/close.
 */
export function Navbar() {
  const pathname = usePathname();
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close the menu on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/events"
      ? pathname.startsWith("/events") || pathname.startsWith("/checkout")
      : href.startsWith("/#")
        ? false
        : pathname === href;

  return (
    <>
      <header id="nav" className={solid ? "solid" : ""}>
        <Link className="nav-logo" href="/" data-cursor>
          <WiiMark size={34} />
          <span className="nav-word">
            <b>WII</b>
            <i>EVENT MALTA</i>
          </span>
        </Link>

        <nav className="nav-links">
          {LINKS.map((l) => (
            <Link key={l.label} href={l.href} className={isActive(l.href) ? "active" : ""} data-cursor>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="nav-right">
          <MagneticButton href="/events" className="btn btn-primary btn-sm nav-cta-desktop">
            Buy Tickets
          </MagneticButton>
          <button
            id="burger"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className={open ? "open" : ""}
            onClick={() => setOpen((v) => !v)}
            data-cursor
          >
            <span />
            <span />
          </button>
        </div>
      </header>

      <div id="menu" className={open ? "open" : ""}>
        <div className="menu-inner">
          {LINKS.map((l) => (
            <Link key={l.label} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <Link href="/events" className="menu-cta" onClick={() => setOpen(false)}>
            Buy Tickets →
          </Link>
        </div>
        <div className="menu-foot">
          <span>VALLETTA · GOZO · COMINO</span>
          <span>AFTER DARK</span>
        </div>
      </div>
    </>
  );
}
