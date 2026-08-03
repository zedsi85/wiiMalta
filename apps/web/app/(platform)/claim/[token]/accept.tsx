"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function AcceptButton({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={{ display: "grid", gap: 10, justifyItems: "center", marginTop: 32 }}>
      <Button
        variant="primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const res = await fetch(`/api/claim/${token}`, { method: "POST" });
          const j = await res.json().catch(() => ({}));
          if (!res.ok || !j.ticketUrl) {
            setBusy(false);
            setError("Couldn't accept the transfer — it may have just expired.");
            return;
          }
          router.push(j.ticketUrl);
        }}
      >
        {busy ? "Accepting…" : "Accept ticket →"}
      </Button>
      {error && <p style={{ color: "var(--ember-300)", fontSize: "0.8125rem" }}>{error}</p>}
    </div>
  );
}
