/**
 * Wii Event Malta — brand mark.
 * Abstract night-sun setting over a two-line waveform (sea + sound), inside a
 * roundel. Inherits color via currentColor. Survives down to a 16px avatar.
 */
export function WiiMark({
  size = 36,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{ color }} aria-hidden="true">
      <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="3.2" />
      <path d="M34 53 A16 16 0 0 1 66 53 Z" fill="currentColor" />
      <path
        d="M13 53 q9.25 -7 18.5 0 t18.5 0 t18.5 0 t18.5 0"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M24 64 q13 -5 26 0 t26 0"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}
