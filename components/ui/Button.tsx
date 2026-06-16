"use client";

import React from "react";
import Link from "next/link";

/**
 * Wii Event Malta — Button.
 * Confident, poster-grade CTA. Ember primary by default. Mono, uppercase, pill.
 * Renders a Next <Link> when `href` is internal, an <a> for external, else <button>.
 */
type Variant = "primary" | "secondary" | "ghost" | "vip" | "light";
type Size = "sm" | "md" | "lg";

export interface ButtonProps {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  disabled?: boolean;
  href?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  type?: "button" | "submit" | "reset";
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  style?: React.CSSProperties;
  "data-cursor"?: boolean;
}

const sizes: Record<Size, { height: string; padding: string; font: string }> = {
  sm: { height: "var(--control-sm)", padding: "0 16px", font: "0.8125rem" },
  md: { height: "var(--control-md)", padding: "0 22px", font: "0.875rem" },
  lg: { height: "var(--control-lg)", padding: "0 30px", font: "0.95rem" },
};

const variants: Record<Variant, React.CSSProperties> = {
  primary: { background: "var(--accent)", color: "var(--on-accent)", boxShadow: "var(--glow-cta)" },
  secondary: { background: "transparent", color: "var(--text-strong)", borderColor: "var(--border-strong)" },
  ghost: { background: "transparent", color: "var(--text-muted)" },
  vip: { background: "transparent", color: "var(--accent-vip)", borderColor: "var(--accent-vip)" },
  light: { background: "var(--bone)", color: "var(--ink)" },
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  href,
  icon,
  iconRight,
  type = "button",
  onClick,
  className,
  style,
  ...rest
}: ButtonProps) {
  const s = sizes[size];

  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    height: s.height,
    padding: s.padding,
    width: fullWidth ? "100%" : "auto",
    fontFamily: "var(--font-mono)",
    fontSize: s.font,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    borderRadius: "var(--radius-pill)",
    border: "1px solid transparent",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    transition: "var(--t-hover)",
    whiteSpace: "nowrap",
    userSelect: "none",
    ...variants[variant],
    ...style,
  };

  const onEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (disabled) return;
    const el = e.currentTarget;
    if (variant === "primary") {
      el.style.background = "var(--accent-hover)";
      el.style.boxShadow = "var(--glow-cta-hi)";
      el.style.transform = "translateY(-1px)";
    } else if (variant === "secondary") {
      el.style.borderColor = "var(--accent)";
      el.style.color = "var(--accent)";
    } else if (variant === "ghost") {
      el.style.color = "var(--text-strong)";
    } else if (variant === "vip") {
      el.style.background = "var(--accent-vip)";
      el.style.color = "var(--void)";
    } else if (variant === "light") {
      el.style.transform = "translateY(-1px)";
    }
  };
  const onLeave = (e: React.MouseEvent<HTMLElement>) => {
    Object.assign(e.currentTarget.style, variants[variant]);
    e.currentTarget.style.transform = "translateY(0)";
  };

  const inner = (
    <>
      {icon ? <span style={{ display: "inline-flex" }}>{icon}</span> : null}
      {children}
      {iconRight ? <span style={{ display: "inline-flex" }}>{iconRight}</span> : null}
    </>
  );

  if (href && !disabled) {
    const external = /^https?:\/\//.test(href) || href.startsWith("#");
    const shared = {
      onClick,
      onMouseEnter: onEnter,
      onMouseLeave: onLeave,
      style: base,
      className,
      "data-cursor": true,
    } as const;
    return external ? (
      <a href={href} {...shared}>
        {inner}
      </a>
    ) : (
      <Link href={href} {...shared}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={base}
      className={className}
      data-cursor
      {...rest}
    >
      {inner}
    </button>
  );
}
