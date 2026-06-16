/** Wii Event Malta — small shared helpers. */

/** Join class names, dropping falsy values. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Zero-pad a number to two digits. */
export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Escape the few HTML-significant characters (used for dangerouslySet-free render). */
export function esc(s: unknown): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

/** Detect a fine pointer (mouse) — used to gate the custom cursor + magnetic FX. */
export function hasFinePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: fine)").matches;
}

/** Respect the user's reduced-motion preference. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
