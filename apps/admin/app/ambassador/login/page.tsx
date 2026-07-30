"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function Form() {
  const params = useSearchParams();
  const denied = params.get("error") === "denied";
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/ambassador` },
    });
    if (error) {
      setState("error");
      const msg = typeof error.message === "string" && error.message.trim() ? error.message : "";
      setMessage(
        msg.includes("Error sending") || error.status === 500
          ? "Our email service is misconfigured right now — tell the Wii team (SMTP settings)."
          : msg || "Could not send the magic link. Try again in a minute."
      );
    } else setState("sent");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center p-6">
      <div className="mb-1 font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ember">
        Wii Event OS
      </div>
      <h1 className="mb-1 text-3xl font-bold">Ambassadors</h1>
      <p className="mb-8 text-sm text-fog">Your referral dashboard, earnings and payouts.</p>
      {denied && (
        <p className="mb-4 rounded-md border border-ember/40 bg-ember/10 p-3 text-sm text-ember-300">
          This account isn&apos;t part of the ambassador programme. Apply through the Wii team.
        </p>
      )}
      {state === "sent" ? (
        <p className="text-sand">
          Magic link sent to <strong>{email}</strong> — open it to sign in.
        </p>
      ) : (
        <form onSubmit={submit} className="grid gap-3">
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoFocus
            className="input-admin py-3 text-base"
            placeholder="you@nightlife.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="btn-admin-primary justify-center py-3 text-base" disabled={state === "sending"}>
            {state === "sending" ? "Sending…" : "Send magic link"}
          </button>
          {state === "error" && <p className="text-sm text-ember-300">{message}</p>}
        </form>
      )}
    </main>
  );
}

export default function AmbassadorLogin() {
  return (
    <Suspense>
      <Form />
    </Suspense>
  );
}
