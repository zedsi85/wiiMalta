"use client";

import { useEffect } from "react";

/**
 * Watches for ?ref=CODE on any landing URL and hands it to /api/ref, which
 * validates the code and sets the referral cookie (last click wins).
 * Fire-and-forget; invalid codes are silently ignored.
 */
export function RefCapture() {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (!code) return;
    fetch("/api/ref", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    }).catch(() => {});
  }, []);
  return null;
}
