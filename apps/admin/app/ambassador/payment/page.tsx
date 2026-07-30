import { activePaymentMethod } from "@wii/api";
import { requireAmbassador } from "@/lib/auth";
import { AmbassadorNav } from "../nav";
import { PaymentForm } from "./form";

export const dynamic = "force-dynamic";

export default async function PaymentDetailsPage() {
  const ctx = await requireAmbassador();
  const active = await activePaymentMethod(ctx.profileId);

  return (
    <>
      <AmbassadorNav name={ctx.displayName ?? ctx.email.split("@")[0]} />
      <h1 className="mb-1 text-xl font-bold">Payment details</h1>
      <p className="mb-4 text-xs text-fog">
        Encrypted at rest (AES-256-GCM). One active method at a time — saving a new one replaces it.
        Only the masked label below is ever displayed.
      </p>

      {active && (
        <div className="card mb-4 flex items-center justify-between">
          <div>
            <div className="label !text-[0.5625rem]">Active method</div>
            <div className="mt-1 font-mono text-sm text-go">{active.hint}</div>
          </div>
          <span className="pill">{active.kind.replace("_", " ")}</span>
        </div>
      )}

      <PaymentForm />
    </>
  );
}
