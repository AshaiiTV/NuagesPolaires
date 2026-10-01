// Application des migrations SQL versionnées de `drizzle/` (04-architecture §1, §9).
// Le migrateur dépend du pilote (drizzle-orm/neon-serverless/migrator ou drizzle-orm/pglite/migrator) :
// chaque DbHandle porte donc sa propre méthode `migrate()` ; ce module fournit la résolution du
// dossier et un point d'entrée en ligne de commande, exécuté HORS requête web
// (`npx tsx src/lib/server/db/migrate.ts`, ou étape de build Netlify si NP_MIGRATE_ON_BUILD=true).

import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { getDbHandle, closeDb, type DbHandle } from './index';

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

/** Applique les migrations sur la connexion donnée (ou sur la connexion partagée). */
export async function runMigrations(handle?: DbHandle, migrationsFolder?: string): Promise<void> {
	const h = handle ?? (await getDbHandle());
	await h.migrate(migrationsFolder ?? resolveMigrationsFolder());
}

const isDirectRun =
	typeof process !== 'undefined' &&
	Array.isArray(process.argv) &&
	process.argv.length > 1 &&
	import.meta.url === pathToFileURL(path.resolve(process.argv[1] ?? '')).href;

if (isDirectRun) {
	runMigrations()
		.then(async () => {
			console.log('Migrations appliquées.');
			await closeDb();
		})
		.catch(async (e: unknown) => {
			console.error('Échec des migrations :', e);
			await closeDb();
			process.exitCode = 1;
		});
}
