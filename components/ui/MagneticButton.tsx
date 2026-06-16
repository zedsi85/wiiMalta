"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { cn, hasFinePointer, prefersReducedMotion } from "@/lib/utils";

/**
 * Wii Event Malta — MagneticButton.
 * A CTA that drifts slightly toward the cursor on hover and eases back on leave.
 * Use for primary actions: View Events, Join the Community, Buy Tickets, Partner.
 *
 * Styling is class-driven (.btn / .btn-primary / .btn-ghost-line / .btn-vip-line)
 * so it matches the cinematic homepage CTAs. Renders <Link>, <a>, or <button>.
 */
export interface MagneticButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  strength?: number;
  type?: "button" | "submit" | "reset";
  "data-card"?: string;
}

export function MagneticButton({
  children,
  href,
  onClick,
  className,
  strength = 0.4,
  type = "button",
  ...rest
}: MagneticButtonProps) {
  const ref = useRef<HTMLElement>(null);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || !hasFinePointer() || prefersReducedMotion()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * strength;
    const y = (e.clientY - r.top - r.height / 2) * strength;
    el.style.transform = `translate(${x}px,${y}px)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "";
  };

  const classes = cn("magnetic", className);
  const handlers = {
    onPointerMove: onMove,
    onPointerLeave: onLeave,
    onClick,
    className: classes,
    "data-cursor": true,
    ...rest,
  };

  if (href) {
    const external = /^https?:\/\//.test(href) || href.startsWith("#");
    return external ? (
      <a ref={ref as React.Ref<HTMLAnchorElement>} href={href} {...handlers}>
        {children}
      </a>
    ) : (
      <Link ref={ref as React.Ref<HTMLAnchorElement>} href={href} {...handlers}>
        {children}
      </Link>
    );
  }

  return (
    <button ref={ref as React.Ref<HTMLButtonElement>} type={type} {...handlers}>
      {children}
    </button>
  );
}
