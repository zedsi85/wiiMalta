"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refreshes the order page every 2.5s while the webhook confirms payment. */
export function PendingRefresher() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(t);
  }, [router]);
  return (
    <p style={{ marginTop: 16, fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-muted)" }}>
      ◌ Waiting for payment confirmation…
    </p>
  );
}
