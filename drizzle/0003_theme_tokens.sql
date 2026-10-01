-- Migration de DONNÉES 0003 — tokens des thèmes natifs et reprise des marques `extra` (décision INT-1).
-- GÉNÉRÉE : npx tsx src/lib/server/db/generate-referentials.ts — ne pas éditer à la main.
-- Source : THEMES de src/lib/ui/themes.ts (via THEME_SEED de referentials.ts).
-- Une ligne déjà renseignée (tokens non nuls, colonne déjà posée) n’est jamais écrasée.
UPDATE "themes" SET "tokens" = '{"--bureau":"#091519","--page":"#102327","--page-2":"#172e32","--reglure":"#1c3439","--encre":"#f0eee5","--encre-2":"#bdcdc8","--encre-grise":"#7e8f8b","--ruban":"#c6d8c4"}' WHERE "id" = 'dark' AND "tokens" IS NULL;
--> statement-breakpoint
UPDATE "themes" SET "tokens" = '{"--bureau":"#dcd6c5","--page":"#efead9","--page-2":"#e6e0cf","--reglure":"#d9d2bf","--encre":"#1b2a2e","--encre-2":"#4c5b5b","--encre-grise":"#8a928c","--ruban":"#7fa089"}' WHERE "id" = 'light' AND "tokens" IS NULL;
--> statement-breakpoint
UPDATE "themes" SET "tokens" = '{"--bureau":"#03020b","--page":"#090621","--page-2":"#140d3d","--reglure":"#21145f","--encre":"#fcfaff","--encre-2":"#d9d4f4","--encre-grise":"#9a93c7","--ruban":"#73d8ff"}' WHERE "id" = 'violet' AND "tokens" IS NULL;
--> statement-breakpoint
UPDATE "themes" SET "tokens" = '{"--bureau":"#031108","--page":"#082111","--page-2":"#12381d","--reglure":"#1e552d","--encre":"#f3fff0","--encre-2":"#c9edbf","--encre-grise":"#8db883","--ruban":"#d8c16a"}' WHERE "id" = 'green' AND "tokens" IS NULL;
--> statement-breakpoint
UPDATE "themes" SET "tokens" = '{"--bureau":"#011018","--page":"#041a24","--page-2":"#082b37","--reglure":"#0d3f4e","--encre":"#f0fcff","--encre-2":"#c8e8ef","--encre-grise":"#8fb6c0","--ruban":"#e5c878"}' WHERE "id" = 'aquaris' AND "tokens" IS NULL;
--> statement-breakpoint
UPDATE "themes" SET "tokens" = '{"--bureau":"#effbe9","--page":"#e5f7de","--page-2":"#d7f2cf","--reglure":"#c6ebbd","--encre":"#203227","--encre-2":"#49655a","--encre-grise":"#668378","--ruban":"#ff83bc"}' WHERE "id" = 'easter' AND "tokens" IS NULL;
--> statement-breakpoint
UPDATE "themes" SET "tokens" = '{"--bureau":"#0a0911","--page":"#110d18","--page-2":"#191224","--reglure":"#251830","--encre":"#fff4ea","--encre-2":"#e8ccb6","--encre-grise":"#a98e8d","--ruban":"#d8d2ff"}' WHERE "id" = 'halloween' AND "tokens" IS NULL;
--> statement-breakpoint
UPDATE "themes" SET "tokens" = '{"--bureau":"#08140d","--page":"#0d1e12","--page-2":"#132816","--reglure":"#1d361f","--encre":"#fbfff9","--encre-2":"#d8ead7","--encre-grise":"#9bb59e","--ruban":"#f2c66d"}' WHERE "id" = 'noel' AND "tokens" IS NULL;
--> statement-breakpoint
UPDATE "themes" SET "tokens" = '{"--bureau":"#050102","--page":"#0c0305","--page-2":"#17060a","--reglure":"#260912","--encre":"#fff6f3","--encre-2":"#f0c4bd","--encre-grise":"#b07d82","--ruban":"#ff7d92"}' WHERE "id" = 'bloodmoon' AND "tokens" IS NULL;
--> statement-breakpoint
UPDATE "characters" SET "struck_at" = ("extra" ->> 'struckAt')::timestamptz, "struck_motif" = "extra" ->> 'struckMotif', "extra" = "extra" - 'struckAt' - 'struckBy' - 'struckMotif' WHERE "struck_at" IS NULL AND ("extra" ->> 'struckAt') ~ '^\d{4}-\d{2}-\d{2}T';
--> statement-breakpoint
UPDATE "events" SET "announced_at" = ("extra" ->> 'announcedAt')::timestamptz, "extra" = "extra" - 'announcedAt' - 'announcedBy' WHERE "announced_at" IS NULL AND ("extra" ->> 'announcedAt') ~ '^\d{4}-\d{2}-\d{2}T';
--> statement-breakpoint
UPDATE "events" SET "recit_combat_id" = "extra" ->> 'recitId', "extra" = "extra" - 'recitId' WHERE "recit_combat_id" IS NULL AND EXISTS (SELECT 1 FROM "combats" WHERE "combats"."id" = "events"."extra" ->> 'recitId');
