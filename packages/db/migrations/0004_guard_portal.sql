CREATE TABLE "scan_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guard_user_id" uuid NOT NULL,
	"event_id" uuid,
	"ticket_id" uuid,
	"result" text NOT NULL,
	"device" text,
	"client_scan_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "redemptions" ADD COLUMN "device" text;--> statement-breakpoint
ALTER TABLE "redemptions" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "scan_attempts" ADD CONSTRAINT "scan_attempts_guard_user_id_users_id_fk" FOREIGN KEY ("guard_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_attempts" ADD CONSTRAINT "scan_attempts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scan_attempts_guard_idx" ON "scan_attempts" USING btree ("guard_user_id","created_at");--> statement-breakpoint
CREATE INDEX "scan_attempts_event_idx" ON "scan_attempts" USING btree ("event_id","created_at");--> statement-breakpoint
ALTER TABLE "scan_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON "scan_attempts" FROM anon, authenticated;
