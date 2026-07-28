"use client";

import { useEffect } from "react";
import type { Mood } from "@/styles/tokens";

/**
 * Sets the WebGL background palette for a static (non-cinematic) page and keeps
 * it pinned there. Drop one near the top of each inner page.
 */
export function MoodSetter({ mood }: { mood: Mood }) {
  useEffect(() => {
    window.__wiiMood = mood;
    window.__wiiSetMood?.(mood);
  }, [mood]);
  return null;
}
