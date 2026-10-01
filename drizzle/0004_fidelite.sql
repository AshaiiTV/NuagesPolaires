-- Rapport de migration durable, lisible par le Registre.
ALTER TABLE migration_registry ADD COLUMN anomalies jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
-- Tolérer les blocs hérités encore stockés sous forme de tableau, sans perdre de branche.
UPDATE oaths SET branches = jsonb_build_object(
 'bA', branches->0,
 'bB', branches->1,
 'extraBranches', COALESCE((SELECT jsonb_agg(value ORDER BY ordinality)
   FROM jsonb_array_elements(branches) WITH ORDINALITY WHERE ordinality > 2), '[]'::jsonb)
) WHERE jsonb_typeof(branches) = 'array';
