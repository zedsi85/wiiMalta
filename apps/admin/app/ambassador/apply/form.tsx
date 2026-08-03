"use client";

import { useState } from "react";

export function ApplyForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/ambassador-apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        instagram: fd.get("instagram"),
        motivation: fd.get("motivation"),
      }),
    });
    if (res.ok) setState("done");
    else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Something went wrong — try again.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="card">
        <div className="text-xl font-bold text-go">✓ Application sent</div>
        <p className="mt-2 text-sm text-fog">
          Check your inbox for confirmation — we&apos;ll email you as soon as the team approves you.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <input name="name" required placeholder="Your name" className="input-admin py-3" />
      <input name="email" type="email" required placeholder="Email" className="input-admin py-3" />
      <input name="instagram" placeholder="Instagram / TikTok handle (optional)" className="input-admin py-3" />
      <textarea name="motivation" rows={3} placeholder="Why you? Where's your crowd? (optional)" className="input-admin py-3" />
      <button className="btn-admin-primary justify-center py-3 text-base" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Apply"}
      </button>
      {state === "error" && <p className="text-sm text-ember-300">{error}</p>}
    </form>
  );
}
