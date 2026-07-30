"use client";

import { useState } from "react";
import { savePaymentMethodAction } from "../actions";

const KINDS = [
  ["iban", "IBAN / SEPA"],
  ["bank_transfer", "Bank transfer"],
  ["revolut", "Revolut"],
  ["paypal", "PayPal"],
  ["wise", "Wise"],
  ["crypto", "Crypto (soon)"],
] as const;

export function PaymentForm() {
  const [kind, setKind] = useState<string>("iban");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(formData: FormData) {
    setError(null);
    setSaved(false);
    try {
      await savePaymentMethodAction(formData);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not save");
    }
  }

  return (
    <form action={submit} className="card grid gap-3">
      <div className="flex flex-wrap gap-1.5">
        {KINDS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            disabled={k === "crypto"}
            onClick={() => setKind(k)}
            className={`rounded-pill px-3 py-1.5 text-xs ${kind === k ? "bg-ember font-semibold text-void" : "text-fog hover:bg-graphite"} disabled:opacity-40`}
          >
            {label}
          </button>
        ))}
      </div>
      <input type="hidden" name="kind" value={kind} />

      {kind === "iban" && (
        <>
          <input name="holder" required placeholder="Account holder name" className="input-admin" />
          <input name="iban" required placeholder="MT84 MALT 0110 0001 2345 MTLC AST0 01S" className="input-admin font-mono" />
        </>
      )}
      {kind === "bank_transfer" && (
        <>
          <input name="holder" required placeholder="Account holder name" className="input-admin" />
          <input name="bankName" required placeholder="Bank name" className="input-admin" />
          <input name="accountNumber" required placeholder="Account number" className="input-admin font-mono" />
          <input name="swift" placeholder="SWIFT / BIC (optional)" className="input-admin font-mono" />
        </>
      )}
      {kind === "revolut" && <input name="username" required placeholder="@yourtag" className="input-admin font-mono" />}
      {(kind === "paypal" || kind === "wise") && (
        <input name="email" type="email" required placeholder={`${kind === "paypal" ? "PayPal" : "Wise"} email`} className="input-admin" />
      )}

      <button className="btn-admin-primary justify-self-start">Save payment method</button>
      {error && <p className="text-sm text-ember-300">{error}</p>}
      {saved && <p className="text-sm text-go">✓ Saved — details encrypted.</p>}
    </form>
  );
}
