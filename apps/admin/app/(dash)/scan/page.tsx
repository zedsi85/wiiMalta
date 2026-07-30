"use client";

import { useFormState, useFormStatus } from "react-dom";
import { redeemAction } from "../actions";
import type { RedeemResult } from "@wii/api";

/**
 * Door check-in console (v1: paste the QR payload or type the serial;
 * camera scanning arrives with the Phase-3 scanner PWA).
 */
function RedeemButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-admin-primary" disabled={pending}>
      {pending ? "Checking…" : "Redeem"}
    </button>
  );
}

export default function ScanPage() {
  const [result, formAction] = useFormState<RedeemResult | null, FormData>(redeemAction, null);

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">Scan / check-in</h1>
      <p className="mb-6 text-sm text-fog">
        Paste a scanned QR payload (<code className="font-mono">wt1.…</code>) or type a serial
        (<code className="font-mono">WII-XXXX-XXXX</code>).
      </p>

      <form action={formAction} className="card flex max-w-xl gap-2">
        <input
          name="code"
          autoFocus
          placeholder="wt1.…  or  WII-7K2M-9QF3"
          className="input-admin font-mono"
        />
        <RedeemButton />
      </form>

      {result && (
        <div
          className={`card mt-6 max-w-xl border-2 ${
            result.ok && !result.alreadyRedeemed
              ? "border-go"
              : result.ok
                ? "border-gold"
                : "border-ember"
          }`}
        >
          {result.ok && !result.alreadyRedeemed && (
            <>
              <div className="text-2xl font-bold text-go">✓ Admit</div>
              <div className="mt-2 font-mono text-sm">
                {result.serial} · {result.tierName}
              </div>
              <div className="text-sm text-fog">{result.eventTitle}</div>
            </>
          )}
          {result.ok && result.alreadyRedeemed && (
            <>
              <div className="text-2xl font-bold text-gold">⚠ Already redeemed</div>
              <div className="mt-2 font-mono text-sm">
                {result.serial} · {result.tierName}
              </div>
              <div className="text-sm text-fog">
                at{" "}
                {new Intl.DateTimeFormat("en-GB", {
                  timeZone: "Europe/Malta",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                }).format(new Date(result.redeemedAt))}
                {result.gate ? ` · gate ${result.gate}` : ""}
              </div>
            </>
          )}
          {!result.ok && (
            <>
              <div className="text-2xl font-bold text-ember">✕ Do not admit</div>
              <div className="mt-2 text-sm text-fog">
                {
                  {
                    invalid: "Invalid code — not one of ours.",
                    expired_qr: "QR expired — ask the guest to refresh their ticket page.",
                    revoked: "Ticket was revoked (refund or fraud).",
                    not_active: "Ticket is not in an admittable state.",
                    wrong_version: "Outdated QR (screenshot?) — ask for the live ticket page.",
                    wrong_event: "Ticket belongs to a different event.",
                  }[result.reason]
                }
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
