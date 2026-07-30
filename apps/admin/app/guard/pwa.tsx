"use client";

import { useEffect } from "react";

/** Registers the guard service worker (PWA installability + shell caching). */
export function GuardPwa() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/guard/sw.js", { scope: "/guard/" }).catch(() => {});
    }
  }, []);
  return null;
}
