CREATE TYPE "public"."account_role" AS ENUM('joueur', 'mj', 'designer', 'admin');--> statement-breakpoint
CREATE TYPE "public"."combat_status" AS ENUM('preparation', 'en_cours', 'termine');--> statement-breakpoint
CREATE TYPE "public"."declaration_resource" AS ENUM('pv', 'ep', 'em');--> statement-breakpoint
CREATE TYPE "public"."declaration_status" AS ENUM('proposee', 'annulee', 'reportee', 'rayee', 'non_reportee');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('combat', 'exploration', 'social', 'evenement', 'autre');--> statement-breakpoint
CREATE TYPE "public"."fact_kind" AS ENUM('dette', 'promesse', 'alliance', 'consequence', 'observation');--> statement-breakpoint
CREATE TYPE "public"."fact_status" AS ENUM('proposed', 'validated', 'settled', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."history_actor_role" AS ENUM('joueur', 'mj', 'designer', 'admin', 'regles');--> statement-breakpoint
CREATE TYPE "public"."history_field" AS ENUM('pv', 'ep', 'em', 'xp', 'level', 'item', 'status', 'oath', 'branch', 'equipment', 'note');--> statement-breakpoint
CREATE TYPE "public"."history_type" AS ENUM('xp', 'gemme', 'item', 'level', 'stat', 'serment', 'combat', 'add', 'event', 'scene');--> statement-breakpoint
CREATE TYPE "public"."oath_category" AS ENUM('melee', 'distance', 'magie', 'soutien');--> statement-breakpoint
CREATE TYPE "public"."oath_rank" AS ENUM('basic', 'seasoned', 'emeritus', 'singular', 'transcended', 'corrupted', 'other');--> statement-breakpoint
CREATE TYPE "public"."observation_status" AS ENUM('proposed', 'validated', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."scene_pin_kind" AS ENUM('capacite', 'regle', 'objet', 'creature');--> statement-breakpoint
CREATE TYPE "public"."scene_status" AS ENUM('ouverte', 'close');--> statement-breakpoint
CREATE TYPE "public"."session_scope" AS ENUM('full', 'reset');--> statement-breakpoint
CREATE TYPE "public"."theme_grant_kind" AS ENUM('unlocked', 'blocked');--> statement-breakpoint
CREATE TABLE "account_theme_grants" (
	"account_id" text NOT NULL,
	"theme_id" text NOT NULL,
	"kind" "theme_grant_kind" NOT NULL,
	"granted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_theme_grants_pk" PRIMARY KEY("account_id","theme_id","kind")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"pseudo" varchar(32) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "account_role" DEFAULT 'joueur' NOT NULL,
	"character_id" text,
	"session_version" integer DEFAULT 0 NOT NULL,
	"force_password_reset" boolean DEFAULT false NOT NULL,
	"reset_expires_at" timestamp with time zone,
	"reset_secret_hash" text,
	"selected_theme" text DEFAULT 'dark' NOT NULL,
	"discord_id" text,
	"discord_username" text,
	"last_seen_at" timestamp with time zone,
	"extra" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_character_id_unique" UNIQUE("character_id"),
	CONSTRAINT "accounts_discord_id_unique" UNIQUE("discord_id"),
	CONSTRAINT "accounts_session_version_check" CHECK ("accounts"."session_version" >= 0),
	CONSTRAINT "accounts_revision_check" CHECK ("accounts"."revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE "admin_recovery_consumptions" (
	"fingerprint" text PRIMARY KEY NOT NULL,
	"pseudo" text NOT NULL,
	"consumed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text NOT NULL,
	"action" text NOT NULL,
	"actor_account_id" text,
	"actor_pseudo" text DEFAULT '' NOT NULL,
	"actor_role" text DEFAULT '' NOT NULL,
	"ip" text DEFAULT '' NOT NULL,
	"origin" text DEFAULT '' NOT NULL,
	"user_agent" text DEFAULT '' NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_rate_limits" (
	"scope" text NOT NULL,
	"subject" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_rate_limits_pk" PRIMARY KEY("scope","subject"),
	CONSTRAINT "auth_rate_limits_count_check" CHECK ("auth_rate_limits"."count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "beast_observations" (
	"id" text PRIMARY KEY NOT NULL,
	"beast_id" text NOT NULL,
	"text" text NOT NULL,
	"author_account_id" text,
	"status" "observation_status" DEFAULT 'proposed' NOT NULL,
	"validated_by" text,
	"validated_at" timestamp with time zone,
	"combat_id" text,
	"publication_id" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beast_observations_revision_check" CHECK ("beast_observations"."revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE "beast_zones" (
	"beast_id" text NOT NULL,
	"zone_id" text NOT NULL,
	CONSTRAINT "beast_zones_pk" PRIMARY KEY("beast_id","zone_id")
);
--> statement-breakpoint
CREATE TABLE "beasts" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"behavior" text DEFAULT 'Neutre' NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"pv" integer DEFAULT 20 NOT NULL,
	"ep" integer DEFAULT 20 NOT NULL,
	"strike" text DEFAULT '' NOT NULL,
	"skill" text DEFAULT '' NOT NULL,
	"drops" text DEFAULT '' NOT NULL,
	"gem" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"style" text DEFAULT '' NOT NULL,
	"quote" text DEFAULT '' NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"qty_min" integer DEFAULT 1 NOT NULL,
	"qty_max" integer DEFAULT 3 NOT NULL,
	"spawn_weight" integer DEFAULT 1 NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"statuses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"admin_note" text DEFAULT '' NOT NULL,
	"extra" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beasts_level_check" CHECK ("beasts"."level" >= 1),
	CONSTRAINT "beasts_pv_ep_check" CHECK ("beasts"."pv" >= 1 AND "beasts"."ep" >= 0),
	CONSTRAINT "beasts_spawn_weight_check" CHECK ("beasts"."spawn_weight" >= 0),
	CONSTRAINT "beasts_qty_check" CHECK ("beasts"."qty_min" >= 1 AND "beasts"."qty_max" >= "beasts"."qty_min"),
	CONSTRAINT "beasts_revision_check" CHECK ("beasts"."revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE "character_history" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"type" "history_type" NOT NULL,
	"text" text NOT NULL,
	"actor_name" text DEFAULT '' NOT NULL,
	"actor_account_id" text,
	"actor_role" "history_actor_role",
	"combat_id" text,
	"dismissed" boolean DEFAULT false NOT NULL,
	"field" "history_field",
	"old_value" text,
	"new_value" text,
	"motif" text DEFAULT '' NOT NULL,
	"declaration_id" text,
	"replaces_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_items" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"legacy_id" text,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"extra" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "character_items_qty_check" CHECK ("character_items"."qty" >= 0)
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"oath_id" text NOT NULL,
	"branch" text DEFAULT 'Aucune' NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"pv_cur" integer DEFAULT 30 NOT NULL,
	"pv_max" integer DEFAULT 30 NOT NULL,
	"ep_cur" integer DEFAULT 50 NOT NULL,
	"ep_max" integer DEFAULT 50 NOT NULL,
	"em_cur" integer DEFAULT 20 NOT NULL,
	"em_max" integer DEFAULT 20 NOT NULL,
	"weapon" text DEFAULT '' NOT NULL,
	"avatar_url" text DEFAULT '' NOT NULL,
	"journal" text DEFAULT '' NOT NULL,
	"progression_version" integer DEFAULT 1 NOT NULL,
	"equipment" jsonb DEFAULT '{"helmet":null,"chest":null,"legs":null}'::jsonb NOT NULL,
	"statuses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"extra" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "characters_level_check" CHECK ("characters"."level" >= 1),
	CONSTRAINT "characters_xp_check" CHECK ("characters"."xp" >= 0),
	CONSTRAINT "characters_resources_cur_check" CHECK ("characters"."pv_cur" >= 0 AND "characters"."ep_cur" >= 0 AND "characters"."em_cur" >= 0),
	CONSTRAINT "characters_resources_max_check" CHECK ("characters"."pv_max" >= 1 AND "characters"."ep_max" >= 1 AND "characters"."em_max" >= 1),
	CONSTRAINT "characters_revision_check" CHECK ("characters"."revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE "combat_participants" (
	"combat_id" text NOT NULL,
	"character_id" text NOT NULL,
	"outcome" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "combat_participants_pk" PRIMARY KEY("combat_id","character_id")
);
--> statement-breakpoint
CREATE TABLE "combats" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_account_id" text,
	"owner_label" text DEFAULT '' NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"status" "combat_status" DEFAULT 'preparation' NOT NULL,
	"round" integer DEFAULT 1 NOT NULL,
	"phase" text DEFAULT 'idle' NOT NULL,
	"state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"saved_at" timestamp with time zone,
	"manual_saved" boolean DEFAULT false NOT NULL,
	"autosave_at" timestamp with time zone,
	"autosave_reason" text DEFAULT '' NOT NULL,
	"visible_to_participants" boolean DEFAULT false NOT NULL,
	"discord_url" text DEFAULT '' NOT NULL,
	"show_enemy_numbers" boolean DEFAULT false NOT NULL,
	"scene_id" text,
	"published_extract_id" text,
	"closed_at" timestamp with time zone,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "combats_round_check" CHECK ("combats"."round" >= 1),
	CONSTRAINT "combats_closed_status_check" CHECK ("combats"."closed_at" IS NULL OR "combats"."status" = 'termine'),
	CONSTRAINT "combats_revision_check" CHECK ("combats"."revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE "declarations" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"scene_id" text,
	"combat_id" text,
	"resource" "declaration_resource" NOT NULL,
	"delta" integer NOT NULL,
	"word" text DEFAULT '' NOT NULL,
	"status" "declaration_status" DEFAULT 'proposee' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancel_until" timestamp with time zone GENERATED ALWAYS AS (((created_at AT TIME ZONE 'UTC') + interval '10 seconds') AT TIME ZONE 'UTC') STORED NOT NULL,
	"reported_by" text,
	"reported_at" timestamp with time zone,
	"motif" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_participants" (
	"event_id" text NOT NULL,
	"character_id" text NOT NULL,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_participants_pk" PRIMARY KEY("event_id","character_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"type" "event_type" DEFAULT 'autre' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"starts_at" timestamp with time zone,
	"capacity" integer DEFAULT 0 NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"discord_url" text DEFAULT '' NOT NULL,
	"created_by" text,
	"created_by_label" text DEFAULT '' NOT NULL,
	"extra" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_capacity_check" CHECK ("events"."capacity" >= 0),
	CONSTRAINT "events_revision_check" CHECK ("events"."revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"text" text NOT NULL,
	"in_scene" boolean DEFAULT false NOT NULL,
	"replaces_id" text,
	"struck" boolean DEFAULT false NOT NULL,
	"struck_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "journal_entries_text_check" CHECK (char_length("journal_entries"."text") <= 20000)
);
--> statement-breakpoint
CREATE TABLE "migration_registry" (
	"source_key" text NOT NULL,
	"source_id" text NOT NULL,
	"transformer_version" integer DEFAULT 1 NOT NULL,
	"target_table" text NOT NULL,
	"target_id" text NOT NULL,
	"checksum" text NOT NULL,
	"migrated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "migration_registry_pk" PRIMARY KEY("source_key","source_id","transformer_version"),
	CONSTRAINT "migration_registry_transformer_version_check" CHECK ("migration_registry"."transformer_version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "oaths" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"weapon" text DEFAULT '' NOT NULL,
	"pv_growth" integer DEFAULT 3 NOT NULL,
	"ep_growth" integer DEFAULT 5 NOT NULL,
	"em_growth" integer DEFAULT 2 NOT NULL,
	"base_damage" integer DEFAULT 8 NOT NULL,
	"damage_type" text DEFAULT '' NOT NULL,
	"rank" "oath_rank" DEFAULT 'singular' NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"evolves_from" text,
	"icon" text DEFAULT '✦' NOT NULL,
	"category" "oath_category" DEFAULT 'melee' NOT NULL,
	"is_builtin" boolean DEFAULT false NOT NULL,
	"lore" text DEFAULT '' NOT NULL,
	"branches" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oaths_growth_check" CHECK ("oaths"."pv_growth" >= 0 AND "oaths"."ep_growth" >= 0 AND "oaths"."em_growth" >= 0),
	CONSTRAINT "oaths_base_damage_check" CHECK ("oaths"."base_damage" >= 0),
	CONSTRAINT "oaths_no_self_evolution_check" CHECK ("oaths"."evolves_from" IS NULL OR "oaths"."evolves_from" <> "oaths"."id"),
	CONSTRAINT "oaths_revision_check" CHECK ("oaths"."revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE "publication_beasts" (
	"publication_id" text NOT NULL,
	"beast_id" text NOT NULL,
	CONSTRAINT "publication_beasts_pk" PRIMARY KEY("publication_id","beast_id")
);
--> statement-breakpoint
CREATE TABLE "publications" (
	"id" text PRIMARY KEY NOT NULL,
	"combat_id" text,
	"text" text NOT NULL,
	"on_home" boolean DEFAULT false NOT NULL,
	"stamped_by" text,
	"stamped_at" timestamp with time zone DEFAULT now() NOT NULL,
	"struck" boolean DEFAULT false NOT NULL,
	"struck_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publications_text_check" CHECK (char_length("publications"."text") >= 1)
);
--> statement-breakpoint
CREATE TABLE "reading_marks" (
	"account_id" text PRIMARY KEY NOT NULL,
	"last_read_at" timestamp with time zone DEFAULT now() NOT NULL,
	"bookmark_text" text DEFAULT '' NOT NULL,
	"bookmark_url" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scene_participants" (
	"scene_id" text NOT NULL,
	"character_id" text NOT NULL,
	"bookmark_text" text DEFAULT '' NOT NULL,
	"bookmark_url" text DEFAULT '' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scene_participants_pk" PRIMARY KEY("scene_id","character_id")
);
--> statement-breakpoint
CREATE TABLE "scene_pins" (
	"id" text PRIMARY KEY NOT NULL,
	"scene_id" text NOT NULL,
	"character_id" text NOT NULL,
	"kind" "scene_pin_kind" NOT NULL,
	"ref" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"discord_url" text DEFAULT '' NOT NULL,
	"status" "scene_status" DEFAULT 'ouverte' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"open_question" text DEFAULT '' NOT NULL,
	"created_by" text,
	"combat_id" text,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"auto_closed" boolean DEFAULT false NOT NULL,
	"closed_at" timestamp with time zone,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scenes_revision_check" CHECK ("scenes"."revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"scope" "session_scope" DEFAULT 'full' NOT NULL,
	"session_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone,
	"user_agent" text DEFAULT '' NOT NULL,
	"ip" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_expiry_check" CHECK ("sessions"."expires_at" > "sessions"."created_at"),
	CONSTRAINT "sessions_session_version_check" CHECK ("sessions"."session_version" >= 0)
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spawn_counters" (
	"beast_id" text PRIMARY KEY NOT NULL,
	"migrated_draws" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spawn_counters_migrated_draws_check" CHECK ("spawn_counters"."migrated_draws" >= 0)
);
--> statement-breakpoint
CREATE TABLE "spawn_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_account_id" text,
	"zone_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"beast_ids" text[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spawn_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"migrated_total_draws" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spawn_settings_singleton_check" CHECK ("spawn_settings"."id" = 1),
	CONSTRAINT "spawn_settings_migrated_total_draws_check" CHECK ("spawn_settings"."migrated_total_draws" >= 0)
);
--> statement-breakpoint
CREATE TABLE "staff_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"action" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"actor_account_id" text,
	"actor_name" text DEFAULT '' NOT NULL,
	"target" text DEFAULT '' NOT NULL,
	"archive_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_log_archives" (
	"id" text PRIMARY KEY NOT NULL,
	"archived_at" timestamp with time zone DEFAULT now() NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"filename" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "themes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"css_class" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_event" boolean DEFAULT false NOT NULL,
	"available_until" timestamp with time zone,
	"visible" boolean DEFAULT true NOT NULL,
	"auto_grant_all" boolean DEFAULT false NOT NULL,
	"rarity" text DEFAULT 'Base' NOT NULL,
	"category" text DEFAULT 'Base' NOT NULL,
	"is_builtin" boolean DEFAULT false NOT NULL,
	"preview" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "themes_revision_check" CHECK ("themes"."revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE "validated_facts" (
	"id" text PRIMARY KEY NOT NULL,
	"character_id" text NOT NULL,
	"kind" "fact_kind" NOT NULL,
	"counterpart" text DEFAULT '' NOT NULL,
	"text" text NOT NULL,
	"status" "fact_status" DEFAULT 'proposed' NOT NULL,
	"witness" text DEFAULT '' NOT NULL,
	"proposed_by" text,
	"validated_by" text,
	"validated_at" timestamp with time zone,
	"settled_at" timestamp with time zone,
	"motif" text DEFAULT '' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "validated_facts_revision_check" CHECK ("validated_facts"."revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE "zones" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"emoji" text DEFAULT '' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zones_revision_check" CHECK ("zones"."revision" >= 1)
);
--> statement-breakpoint
ALTER TABLE "account_theme_grants" ADD CONSTRAINT "account_theme_grants_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_theme_grants" ADD CONSTRAINT "account_theme_grants_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_theme_grants" ADD CONSTRAINT "account_theme_grants_granted_by_accounts_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_selected_theme_themes_id_fk" FOREIGN KEY ("selected_theme") REFERENCES "public"."themes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_account_id_accounts_id_fk" FOREIGN KEY ("actor_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beast_observations" ADD CONSTRAINT "beast_observations_beast_id_beasts_id_fk" FOREIGN KEY ("beast_id") REFERENCES "public"."beasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beast_observations" ADD CONSTRAINT "beast_observations_author_account_id_accounts_id_fk" FOREIGN KEY ("author_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beast_observations" ADD CONSTRAINT "beast_observations_validated_by_accounts_id_fk" FOREIGN KEY ("validated_by") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beast_observations" ADD CONSTRAINT "beast_observations_combat_id_combats_id_fk" FOREIGN KEY ("combat_id") REFERENCES "public"."combats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beast_observations" ADD CONSTRAINT "beast_observations_publication_id_publications_id_fk" FOREIGN KEY ("publication_id") REFERENCES "public"."publications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beast_zones" ADD CONSTRAINT "beast_zones_beast_id_beasts_id_fk" FOREIGN KEY ("beast_id") REFERENCES "public"."beasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beast_zones" ADD CONSTRAINT "beast_zones_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_history" ADD CONSTRAINT "character_history_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_history" ADD CONSTRAINT "character_history_actor_account_id_accounts_id_fk" FOREIGN KEY ("actor_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_history" ADD CONSTRAINT "character_history_combat_id_combats_id_fk" FOREIGN KEY ("combat_id") REFERENCES "public"."combats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_history" ADD CONSTRAINT "character_history_declaration_id_declarations_id_fk" FOREIGN KEY ("declaration_id") REFERENCES "public"."declarations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_history" ADD CONSTRAINT "character_history_replaces_id_character_history_id_fk" FOREIGN KEY ("replaces_id") REFERENCES "public"."character_history"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_items" ADD CONSTRAINT "character_items_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_oath_id_oaths_id_fk" FOREIGN KEY ("oath_id") REFERENCES "public"."oaths"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combat_participants" ADD CONSTRAINT "combat_participants_combat_id_combats_id_fk" FOREIGN KEY ("combat_id") REFERENCES "public"."combats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combat_participants" ADD CONSTRAINT "combat_participants_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combats" ADD CONSTRAINT "combats_owner_account_id_accounts_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combats" ADD CONSTRAINT "combats_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "combats" ADD CONSTRAINT "combats_published_extract_id_publications_id_fk" FOREIGN KEY ("published_extract_id") REFERENCES "public"."publications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "declarations" ADD CONSTRAINT "declarations_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "declarations" ADD CONSTRAINT "declarations_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "declarations" ADD CONSTRAINT "declarations_combat_id_combats_id_fk" FOREIGN KEY ("combat_id") REFERENCES "public"."combats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "declarations" ADD CONSTRAINT "declarations_reported_by_accounts_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_replaces_id_journal_entries_id_fk" FOREIGN KEY ("replaces_id") REFERENCES "public"."journal_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oaths" ADD CONSTRAINT "oaths_evolves_from_oaths_id_fk" FOREIGN KEY ("evolves_from") REFERENCES "public"."oaths"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_beasts" ADD CONSTRAINT "publication_beasts_publication_id_publications_id_fk" FOREIGN KEY ("publication_id") REFERENCES "public"."publications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_beasts" ADD CONSTRAINT "publication_beasts_beast_id_beasts_id_fk" FOREIGN KEY ("beast_id") REFERENCES "public"."beasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_combat_id_combats_id_fk" FOREIGN KEY ("combat_id") REFERENCES "public"."combats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_stamped_by_accounts_id_fk" FOREIGN KEY ("stamped_by") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_marks" ADD CONSTRAINT "reading_marks_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_participants" ADD CONSTRAINT "scene_participants_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_participants" ADD CONSTRAINT "scene_participants_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_pins" ADD CONSTRAINT "scene_pins_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_pins" ADD CONSTRAINT "scene_pins_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_combat_id_combats_id_fk" FOREIGN KEY ("combat_id") REFERENCES "public"."combats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_accounts_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spawn_counters" ADD CONSTRAINT "spawn_counters_beast_id_beasts_id_fk" FOREIGN KEY ("beast_id") REFERENCES "public"."beasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spawn_runs" ADD CONSTRAINT "spawn_runs_actor_account_id_accounts_id_fk" FOREIGN KEY ("actor_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spawn_runs" ADD CONSTRAINT "spawn_runs_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_log" ADD CONSTRAINT "staff_log_actor_account_id_accounts_id_fk" FOREIGN KEY ("actor_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_log" ADD CONSTRAINT "staff_log_archive_id_staff_log_archives_id_fk" FOREIGN KEY ("archive_id") REFERENCES "public"."staff_log_archives"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validated_facts" ADD CONSTRAINT "validated_facts_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validated_facts" ADD CONSTRAINT "validated_facts_proposed_by_accounts_id_fk" FOREIGN KEY ("proposed_by") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "validated_facts" ADD CONSTRAINT "validated_facts_validated_by_accounts_id_fk" FOREIGN KEY ("validated_by") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_pseudo_lower_uidx" ON "accounts" USING btree (lower("pseudo"));--> statement-breakpoint
CREATE INDEX "accounts_role_idx" ON "accounts" USING btree ("role");--> statement-breakpoint
CREATE INDEX "audit_log_ts_idx" ON "audit_log" USING btree ("ts");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_account_id");--> statement-breakpoint
CREATE INDEX "beast_observations_beast_status_idx" ON "beast_observations" USING btree ("beast_id","status");--> statement-breakpoint
CREATE INDEX "beast_zones_zone_id_idx" ON "beast_zones" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "beasts_name_idx" ON "beasts" USING btree ("name");--> statement-breakpoint
CREATE INDEX "beasts_visibility_idx" ON "beasts" USING btree ("hidden","archived");--> statement-breakpoint
CREATE INDEX "character_history_character_ts_idx" ON "character_history" USING btree ("character_id","ts","id");--> statement-breakpoint
CREATE INDEX "character_history_combat_id_idx" ON "character_history" USING btree ("combat_id");--> statement-breakpoint
CREATE INDEX "character_history_declaration_id_idx" ON "character_history" USING btree ("declaration_id");--> statement-breakpoint
CREATE INDEX "character_items_character_id_idx" ON "character_items" USING btree ("character_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "character_items_character_legacy_uidx" ON "character_items" USING btree ("character_id","legacy_id");--> statement-breakpoint
CREATE INDEX "characters_name_idx" ON "characters" USING btree ("name");--> statement-breakpoint
CREATE INDEX "characters_oath_id_idx" ON "characters" USING btree ("oath_id");--> statement-breakpoint
CREATE INDEX "combat_participants_character_id_idx" ON "combat_participants" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "combats_owner_saved_at_idx" ON "combats" USING btree ("owner_account_id","saved_at");--> statement-breakpoint
CREATE INDEX "combats_status_idx" ON "combats" USING btree ("status");--> statement-breakpoint
CREATE INDEX "declarations_character_created_idx" ON "declarations" USING btree ("character_id","created_at");--> statement-breakpoint
CREATE INDEX "declarations_status_idx" ON "declarations" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "declarations_scene_id_idx" ON "declarations" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "declarations_combat_id_idx" ON "declarations" USING btree ("combat_id");--> statement-breakpoint
CREATE INDEX "event_participants_character_id_idx" ON "event_participants" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "events_starts_at_idx" ON "events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "events_hidden_idx" ON "events" USING btree ("hidden");--> statement-breakpoint
CREATE INDEX "journal_entries_character_ts_idx" ON "journal_entries" USING btree ("character_id","ts");--> statement-breakpoint
CREATE INDEX "migration_registry_target_idx" ON "migration_registry" USING btree ("target_table","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "oaths_name_lower_uidx" ON "oaths" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "oaths_hidden_idx" ON "oaths" USING btree ("hidden");--> statement-breakpoint
CREATE INDEX "oaths_evolves_from_idx" ON "oaths" USING btree ("evolves_from");--> statement-breakpoint
CREATE INDEX "publication_beasts_beast_id_idx" ON "publication_beasts" USING btree ("beast_id");--> statement-breakpoint
CREATE INDEX "publications_home_idx" ON "publications" USING btree ("on_home","stamped_at");--> statement-breakpoint
CREATE INDEX "publications_combat_id_idx" ON "publications" USING btree ("combat_id");--> statement-breakpoint
CREATE INDEX "scene_participants_character_id_idx" ON "scene_participants" USING btree ("character_id");--> statement-breakpoint
CREATE INDEX "scene_pins_scene_character_idx" ON "scene_pins" USING btree ("scene_id","character_id");--> statement-breakpoint
CREATE INDEX "scenes_status_activity_idx" ON "scenes" USING btree ("status","last_activity_at");--> statement-breakpoint
CREATE INDEX "scenes_combat_id_idx" ON "scenes" USING btree ("combat_id");--> statement-breakpoint
CREATE INDEX "sessions_account_id_idx" ON "sessions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "spawn_runs_generated_at_idx" ON "spawn_runs" USING btree ("generated_at");--> statement-breakpoint
CREATE INDEX "spawn_runs_zone_id_idx" ON "spawn_runs" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "staff_log_ts_idx" ON "staff_log" USING btree ("ts");--> statement-breakpoint
CREATE INDEX "staff_log_archive_id_idx" ON "staff_log" USING btree ("archive_id","ts");--> statement-breakpoint
CREATE INDEX "staff_log_archives_archived_at_idx" ON "staff_log_archives" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "themes_visible_idx" ON "themes" USING btree ("visible");--> statement-breakpoint
CREATE INDEX "validated_facts_character_status_idx" ON "validated_facts" USING btree ("character_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "zones_name_uidx" ON "zones" USING btree ("name");--> statement-breakpoint
CREATE INDEX "zones_position_idx" ON "zones" USING btree ("position");