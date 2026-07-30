CREATE TYPE "public"."payment_method_kind" AS ENUM('iban', 'bank_transfer', 'revolut', 'paypal', 'wise', 'crypto');--> statement-breakpoint
ALTER TYPE "public"."ambassador_status" ADD VALUE 'verified';--> statement-breakpoint
ALTER TYPE "public"."commission_status" ADD VALUE 'approved';--> statement-breakpoint
ALTER TYPE "public"."commission_status" ADD VALUE 'processing';--> statement-breakpoint
ALTER TYPE "public"."commission_status" ADD VALUE 'rejected';--> statement-breakpoint
CREATE TABLE "ambassador_payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ambassador_id" uuid NOT NULL,
	"kind" "payment_method_kind" NOT NULL,
	"details_encrypted" text NOT NULL,
	"display_hint" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_visits" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "referral_visits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"code_id" uuid NOT NULL,
	"ambassador_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ambassador_profiles" ADD COLUMN "fixed_bonus_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ambassador_payment_methods" ADD CONSTRAINT "ambassador_payment_methods_ambassador_id_ambassador_profiles_id_fk" FOREIGN KEY ("ambassador_id") REFERENCES "public"."ambassador_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_visits" ADD CONSTRAINT "referral_visits_code_id_referral_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."referral_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_visits" ADD CONSTRAINT "referral_visits_ambassador_id_ambassador_profiles_id_fk" FOREIGN KEY ("ambassador_id") REFERENCES "public"."ambassador_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_active_uq" ON "ambassador_payment_methods" USING btree ("ambassador_id") WHERE "ambassador_payment_methods"."is_active" = true;--> statement-breakpoint
CREATE INDEX "payment_methods_ambassador_idx" ON "ambassador_payment_methods" USING btree ("ambassador_id");--> statement-breakpoint
CREATE INDEX "referral_visits_amb_idx" ON "referral_visits" USING btree ("ambassador_id","created_at");--> statement-breakpoint
ALTER TABLE "ambassador_payment_methods" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON "ambassador_payment_methods" FROM anon, authenticated;--> statement-breakpoint
ALTER TABLE "referral_visits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON "referral_visits" FROM anon, authenticated;
