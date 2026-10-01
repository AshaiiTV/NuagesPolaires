// Localisation du dossier `drizzle/` des migrations SQL versionnées (04-architecture §1, §9).
// Module minimal, sans dépendance : la fabrique de connexion (index.ts) l'importe, il entre donc dans
// le bundle de production — il ne doit tirer ni le lanceur de migrations, ni les semis.

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Localise le dossier `drizzle/` : NP_MIGRATIONS_DIR, puis la racine du dépôt déduite de ce fichier
 * (source : src/lib/server/db → ../../../../drizzle), puis `<cwd>/drizzle`.
 */
export function resolveMigrationsFolder(env: NodeJS.ProcessEnv = process.env): string {
	const candidates: string[] = [];
	if (env.NP_MIGRATIONS_DIR) candidates.push(path.resolve(env.NP_MIGRATIONS_DIR));
	try {
		candidates.push(fileURLToPath(new URL('../../../../drizzle', import.meta.url)));
	} catch {
		// import.meta.url absent ou non fichier (bundle) : on retombe sur le cwd.
	}
	candidates.push(path.resolve(process.cwd(), 'drizzle'));
	for (const dir of candidates) {
		if (existsSync(path.join(dir, 'meta', '_journal.json'))) return dir;
	}
	throw new Error(
		`Dossier de migrations introuvable (meta/_journal.json absent) ; candidats : ${candidates.join(' ; ')}. Génère-les avec « npx drizzle-kit generate ».`
	);
}
