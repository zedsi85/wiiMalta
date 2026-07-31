"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Guard login is CODE-FIRST: installed PWAs on iOS keep cookies separate
 * from Safari, so an emailed magic LINK signs in the wrong browser. A
 * 6-digit code typed here verifies inside the PWA itself (verifyOtp), so
 * the session lands exactly where the guard is standing.
 */
function GuardLoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const denied = params.get("error") === "denied";
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "code" | "verifying" | "error">("idle");
  const [message, setMessage] = useState("");

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setMessage("");
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, portal: "guard" }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState("code");
    } catch {
      setState("error");
      setMessage("Couldn't reach the server — check your connection.");
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setState("verifying");
    setMessage("");
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: "email",
    });
    if (error) {
      setState("code");
      setMessage(
        error.message?.toLowerCase().includes("expired") || error.message?.toLowerCase().includes("invalid")
          ? "That code didn't match — check the digits or request a new one."
          : error.message || "Verification failed. Try again."
      );
      return;
    }
    router.push("/guard/events");
    router.refresh();
  }

  return (
    <main className="flex flex-1 flex-col justify-center p-6">
      <div className="mb-1 font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ember">
        Wii Event OS
      </div>
      <h1 className="mb-1 text-3xl font-bold">Door crew</h1>
      <p className="mb-8 text-sm text-fog">Security check-in portal.</p>

      {denied && (
        <p className="mb-4 rounded-md border border-ember/40 bg-ember/10 p-3 text-sm text-ember-300">
          This account isn&apos;t on the door list. Ask your event manager to add you.
        </p>
      )}

      {state !== "code" && state !== "verifying" ? (
        <form onSubmit={requestCode} className="grid gap-3">
          <label className="label" htmlFor="email">
            Your email
          </label>
          <input
            id="email"
            type="email"
            required
            autoFocus
            inputMode="email"
            autoComplete="email"
            placeholder="you@crew.com"
            className="input-admin py-3 text-base"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="btn-admin-primary justify-center py-3 text-base" disabled={state === "sending"}>
            {state === "sending" ? "Sending…" : "Email me a sign-in code"}
          </button>
          {state === "error" && <p className="text-sm text-ember-300">{message}</p>}
        </form>
      ) : (
        <form onSubmit={verifyCode} className="grid gap-3">
          <p className="text-sm text-sand">
            We emailed a sign-in code to <strong>{email}</strong>. Type it here — don&apos;t tap the
            link in the email (it opens the wrong browser).
          </p>
          <label className="label" htmlFor="code">
            Sign-in code
          </label>
          <input
            id="code"
            required
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6,8}"
            maxLength={8}
            placeholder="••••••"
            className="input-admin py-3 text-center font-mono text-2xl tracking-[0.35em]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          <button
            className="btn-admin-primary justify-center py-3 text-base"
            disabled={state === "verifying" || code.length < 6}
          >
            {state === "verifying" ? "Checking…" : "Sign in"}
          </button>
          {message && <p className="text-sm text-ember-300">{message}</p>}
          <button
            type="button"
            className="text-left font-mono text-xs text-fog underline"
            onClick={() => {
              setState("idle");
              setCode("");
              setMessage("");
            }}
          >
            ← different email / resend
          </button>
        </form>
      )}
    </main>
  );
}

export default function GuardLoginPage() {
  return (
    <Suspense>
      <GuardLoginForm />
    </Suspense>
  );
}
