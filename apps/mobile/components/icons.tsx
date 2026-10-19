import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

/** Tab + header glyphs, drawn in the brand's line weight (no icon font). */
type P = { color: string; size?: number; filled?: boolean };

export const HomeIcon = ({ color, size = 22, filled }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 3l9 9-9 9-9-9 9-9z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" fill={filled ? color : "none"} fillOpacity={filled ? 0.25 : 0} />
  </Svg>
);
export const DiscoverIcon = ({ color, size = 22, filled }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.8} />
    <Path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" fill={filled ? color : "none"} />
  </Svg>
);
export const TicketIcon = ({ color, size = 22, filled }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 1 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 1 0 0-4V8z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" fill={filled ? color : "none"} fillOpacity={filled ? 0.25 : 0} />
    <Path d="M14 7v10" stroke={color} strokeWidth={1.6} strokeDasharray="2 2" />
  </Svg>
);
export const ProfileIcon = ({ color, size = 22, filled }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="9" r="3.6" stroke={color} strokeWidth={1.8} fill={filled ? color : "none"} fillOpacity={filled ? 0.25 : 0} />
    <Path d="M5 20c1.2-3.6 3.6-5.4 7-5.4s5.8 1.8 7 5.4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);
export const SearchIcon = ({ color, size = 20 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="6.5" stroke={color} strokeWidth={1.8} />
    <Path d="M16 16l4.5 4.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);
export const PinIcon = ({ color, size = 14 }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 21s-6-5.6-6-11a6 6 0 1 1 12 0c0 5.4-6 11-6 11z" stroke={color} strokeWidth={1.8} />
    <Circle cx="12" cy="10" r="2.2" stroke={color} strokeWidth={1.6} />
  </Svg>
);
export const HeartIcon = ({ color, size = 20, filled }: P) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 20.5s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" fill={filled ? color : "none"} />
  </Svg>
);
/** Brand mark (sun over sea-line) for the header. */
export const WiiMark = ({ size = 28, stroke = "#FBF8F1", sun = "#FF4D1F" }: { size?: number; stroke?: string; sun?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Circle cx="50" cy="50" r="46" fill="none" stroke={stroke} strokeWidth="4" />
    <Path d="M34 53 A16 16 0 0 1 66 53 Z" fill={sun} />
    <Path d="M13 53 q9.25 -7 18.5 0 t18.5 0 t18.5 0 t18.5 0" fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
    <Path d="M24 64 q13 -5 26 0 t26 0" fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" opacity={0.55} />
  </Svg>
);
void Rect;
