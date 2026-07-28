"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * Wii Event Malta — Reveal.
 * Rise-and-fade-in wrapper for the inner pages, driven by IntersectionObserver
 * (the cinematic homepage uses its own scroll scanner). Respects reduced motion.
 */
export function Reveal({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: seen ? 1 : 0,
        transform: seen ? "none" : "translateY(28px)",
        transition: `opacity var(--dur-cinema) var(--ease-out) ${delay}ms, transform var(--dur-cinema) var(--ease-out) ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
