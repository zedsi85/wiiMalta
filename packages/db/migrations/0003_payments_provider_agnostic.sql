-- Provider-agnostic payments (Revolut is the launch rail) + referral candidate.
-- Renames preserve data; constraint names re-aligned with drizzle conventions.

ALTER TABLE "payments" RENAME COLUMN "stripe_payment_intent_id" TO "provider_order_id";
ALTER TABLE "payments" RENAME COLUMN "stripe_charge_id" TO "provider_payment_id";
ALTER TABLE "payments" ADD COLUMN "provider" text NOT NULL DEFAULT 'revolut';
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_stripe_payment_intent_id_unique";
ALTER TABLE "payments" ADD CONSTRAINT "payments_provider_order_id_unique" UNIQUE ("provider_order_id");

ALTER TABLE "refunds" RENAME COLUMN "stripe_refund_id" TO "provider_refund_id";
ALTER TABLE "refunds" DROP CONSTRAINT IF EXISTS "refunds_stripe_refund_id_unique";
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_provider_refund_id_unique" UNIQUE ("provider_refund_id");

ALTER TABLE "orders" ADD COLUMN "candidate_referral_code_id" uuid;

-- New tables since 0001 stay RLS-locked like everything else (0002 pattern)
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
