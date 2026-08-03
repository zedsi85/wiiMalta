"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/** Passwordless sign-in: email → 6-digit code (sent via our own mailer). */
export function AccountLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/request-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setStage("code");
    } catch {
      setError("Couldn't send the code — try again in a minute.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      if (!res.ok) {
        setError("That code didn't match — check the digits or request a new one.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return stage === "email" ? (
    <form onSubmit={requestCode} style={{ marginTop: 28, display: "grid", gap: 14, maxWidth: 380 }}>
      <Input
        label="Email"
        type="email"
        required
        placeholder="you@domain.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
      <Button variant="primary" disabled={busy}>
        {busy ? "Sending…" : "Email me a code"}
      </Button>
      {error && <p style={{ color: "var(--ember-300)", fontSize: "0.8125rem" }}>{error}</p>}
    </form>
  ) : (
    <form onSubmit={verify} style={{ marginTop: 28, display: "grid", gap: 14, maxWidth: 380 }}>
      <p style={{ color: "var(--sand)", fontSize: "0.9375rem" }}>
        Code sent to <strong>{email}</strong>.
      </p>
      <Input
        label="6-digit code"
        required
        placeholder="••••••"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        autoComplete="one-time-code"
      />
      <Button variant="primary" disabled={busy || code.length !== 6}>
        {busy ? "Checking…" : "Sign in"}
      </Button>
      {error && <p style={{ color: "var(--ember-300)", fontSize: "0.8125rem" }}>{error}</p>}
      <button
        type="button"
        onClick={() => {
          setStage("email");
          setCode("");
          setError(null);
        }}
        style={{ textAlign: "left", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-muted)", textDecoration: "underline" }}
      >
        ← different email / resend
      </button>
    </form>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="btn btn-ghost-line btn-sm"
      data-cursor
      onClick={async () => {
        await fetch("/api/account/logout", { method: "POST" });
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}

/** Transfer a ticket to a friend (or cancel a pending transfer). */
export function TransferControl({
  ticketId,
  pendingTo,
  eventStarted,
}: {
  ticketId: string;
  pendingTo: string | null;
  eventStarted: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [toEmail, setToEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (eventStarted) return null;

  if (pendingTo) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "var(--gold-500)" }}>
        → sending to {pendingTo}
        <button
          data-cursor
          style={{ textDecoration: "underline", color: "var(--text-muted)" }}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await fetch("/api/tickets/transfer", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ ticketId, action: "cancel" }),
            });
            router.refresh();
          }}
        >
          cancel
        </button>
      </span>
    );
  }

  return open ? (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await fetch("/api/tickets/transfer", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ticketId, toEmail }),
        });
        setBusy(false);
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setError(
            j.error === "already_pending"
              ? "A transfer is already pending for this ticket."
              : "Couldn't start the transfer — check the email."
          );
          return;
        }
        router.refresh();
      }}
      style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
    >
      <input
        type="email"
        required
        placeholder="friend@email.com"
        value={toEmail}
        onChange={(e) => setToEmail(e.target.value)}
        style={{ background: "var(--surface-1, var(--charcoal))", border: "1px solid var(--border-soft)", borderRadius: "var(--radius-sm)", padding: "8px 10px", fontSize: "0.8125rem", color: "var(--text)", width: 180 }}
      />
      <button className="btn btn-ghost-line btn-sm" data-cursor disabled={busy}>
        {busy ? "Sending…" : "Send"}
      </button>
      {error && <span style={{ color: "var(--ember-300)", fontSize: "0.75rem" }}>{error}</span>}
    </form>
  ) : (
    <button className="btn btn-ghost-line btn-sm" data-cursor onClick={() => setOpen(true)}>
      Transfer →
    </button>
  );
}
