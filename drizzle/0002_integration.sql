ALTER TABLE "beast_observations" ADD COLUMN "motif" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "struck_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "struck_by" text;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "struck_motif" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "announced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "announced_by" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "recit_combat_id" text;--> statement-breakpoint
ALTER TABLE "themes" ADD COLUMN "tokens" jsonb;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_struck_by_accounts_id_fk" FOREIGN KEY ("struck_by") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_announced_by_accounts_id_fk" FOREIGN KEY ("announced_by") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_recit_combat_id_combats_id_fk" FOREIGN KEY ("recit_combat_id") REFERENCES "public"."combats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "characters_struck_at_idx" ON "characters" USING btree ("struck_at");--> statement-breakpoint
CREATE INDEX "events_announced_at_idx" ON "events" USING btree ("announced_at");