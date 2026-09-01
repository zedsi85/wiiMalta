"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps door QR codes valid. The page is force-dynamic, so each reload mints
 * fresh 5-minute tokens server-side — but a buyer who opens the link in the
 * entry queue would otherwise be showing an expired code by the time they reach
 * the scanner. This re-renders the page well before expiry, and immediately
 * when the tab regains focus (returning to it at the door → instant fresh code).
 */
const REFRESH_MS = 210_000; // 3.5 min — comfortably inside the 5-min token life

export function QrRefresher() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_MS / 1000);

  useEffect(() => {
    let next = Date.now() + REFRESH_MS;
    const refresh = () => {
      next = Date.now() + REFRESH_MS;
      router.refresh();
    };
    const tick = setInterval(() => {
      const left = Math.max(0, Math.round((next - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) refresh();
    }, 1000);
    // Returning to the page (app switch at the door) → fresh code right away.
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, "0");
  return (
    <p style={{ marginTop: 24, fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--text-faint)" }}>
      ● Live — codes refresh automatically (next in {mm}:{ss}). Screenshots won&apos;t scan. Keep this page open at the door.
    </p>
  );
}
