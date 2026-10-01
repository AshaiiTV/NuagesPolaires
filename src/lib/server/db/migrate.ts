// Application des migrations SQL versionnées de `drizzle/` (04-architecture §1, §9).
// Le migrateur dépend du pilote : chaque DbHandle porte sa propre méthode `migrate()` ; ce module
// fournit le point d'entrée en ligne de commande, exécuté HORS requête web :
//   npx tsx src/lib/server/db/migrate.ts
// Le script ouvre sa propre connexion et la ferme (04 §10.1 : aucun pool global).
//
// Les migrations comprennent la migration de DONNÉES `0001_referentiels` (thèmes dont `dark`/`light`,
// zones, réglages, ligne `spawn_settings`, Serments natifs) : `drizzle-kit migrate` (npm run
// db:migrate) suffit donc à rendre une base Neon neuve utilisable. Ce script le fait aussi, puis
// VÉRIFIE ces référentiels (code de sortie 1 s'il en manque).
//
// Ce module n'est pas importé par la fabrique de connexion (index.ts) : il reste hors du bundle.

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { count, eq, inArray } from 'drizzle-orm';
import type { Db, DbHandle, Tx } from './index';
import { resolveMigrationsFolder } from './migrations-folder';
import { ALWAYS_GRANTED_THEME_IDS, SETTING_KEYS, SPAWN_SETTINGS_ID } from './referentials';
import { oaths, settings, spawnSettings, themes } from './schema';

export { resolveMigrationsFolder } from './migrations-folder';

/** Applique les migrations (DDL et données de référence) sur la connexion donnée. */
export async function runMigrations(handle: DbHandle, migrationsFolder?: string): Promise<void> {
	await handle.migrate(migrationsFolder ?? resolveMigrationsFolder());
}

/**
 * Liste ce qui manque pour qu'une base migrée soit utilisable : thèmes toujours accordés (défaut et
 * FK RESTRICT de `accounts.selected_theme`), au moins un Serment natif (FK RESTRICT de
 * `characters.oath_id`), clés de réglages, ligne unique `spawn_settings`. Tableau vide = conforme.
 */
export async function checkReferentials(db: Db | Tx): Promise<string[]> {
	const problems: string[] = [];
	const themeRows = await db
		.select({ id: themes.id })
		.from(themes)
		.where(inArray(themes.id, [...ALWAYS_GRANTED_THEME_IDS]));
	const presentThemes = new Set(themeRows.map((r) => r.id));
	for (const id of ALWAYS_GRANTED_THEME_IDS) {
		if (!presentThemes.has(id)) problems.push(`thème « ${id} » absent`);
	}
	const [builtin] = await db.select({ n: count() }).from(oaths).where(eq(oaths.isBuiltin, true));
	if ((builtin?.n ?? 0) === 0) problems.push('aucun Serment natif');
	const keys = Object.values(SETTING_KEYS);
	const settingRows = await db
		.select({ key: settings.key })
		.from(settings)
		.where(inArray(settings.key, keys));
	const presentKeys = new Set(settingRows.map((r) => r.key));
	for (const key of keys) {
		if (!presentKeys.has(key)) problems.push(`réglage « ${key} » absent`);
	}
	const spawn = await db
		.select({ id: spawnSettings.id })
		.from(spawnSettings)
		.where(eq(spawnSettings.id, SPAWN_SETTINGS_ID));
	if (spawn.length === 0) problems.push(`ligne spawn_settings (id = ${SPAWN_SETTINGS_ID}) absente`);
	return problems;
}

const isDirectRun =
	typeof process !== 'undefined' &&
	Array.isArray(process.argv) &&
	process.argv.length > 1 &&
	import.meta.url === pathToFileURL(path.resolve(process.argv[1] ?? '')).href;

if (isDirectRun) {
	void (async () => {
		const { openDb, closeSharedDb } = await import('./index');
		const handle = await openDb();
		try {
			await runMigrations(handle);
			const problems = await checkReferentials(handle.db);
			if (problems.length > 0) {
				throw new Error(`référentiels incomplets après migration : ${problems.join(' ; ')}.`);
			}
			console.log('Migrations appliquées ; référentiels présents.');
		} finally {
			await handle.close();
			await closeSharedDb();
		}
	})().catch((e: unknown) => {
		console.error('Échec des migrations :', e);
		process.exitCode = 1;
	});
}
