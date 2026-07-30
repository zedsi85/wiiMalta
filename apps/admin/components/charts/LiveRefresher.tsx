"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Near-real-time: re-renders the server page every `seconds` while visible. */
export function LiveRefresher({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
        setTick((n) => n + 1);
      }
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill border border-slate px-2.5 py-1 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fog">
      <span className="relative flex h-2 w-2">
        <span
          key={tick}
          className="absolute inline-flex h-full w-full animate-ping rounded-full bg-go opacity-60"
        />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-go" />
      </span>
      live · {seconds}s
    </span>
  );
}
