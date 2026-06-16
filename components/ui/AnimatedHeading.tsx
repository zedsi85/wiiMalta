import React from "react";

/**
 * Wii Event Malta — AnimatedHeading.
 * Splits a heading into masked lines that rise into view on scroll (the hero /
 * finale treatment). Each line's inner span carries `data-rise` so the global
 * reveal scanner animates only the y-mask, never opacity.
 *
 * Pass `lines` as an array of strings (one per visual line).
 */
export function AnimatedHeading({
  lines,
  className,
  as: Tag = "h2",
  style,
}: {
  lines: string[];
  className?: string;
  as?: "h1" | "h2";
  style?: React.CSSProperties;
}) {
  return (
    <Tag className={className} style={style}>
      {lines.map((line, i) => (
        <span className="line" key={i}>
          <span data-rise style={{ "--i": i } as React.CSSProperties}>
            {line}
          </span>
        </span>
      ))}
    </Tag>
  );
}
