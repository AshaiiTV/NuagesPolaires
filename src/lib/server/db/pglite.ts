// Pilote PGlite (dev et tests) : même schéma et mêmes migrations que Neon (04-architecture §1).
// Ce module n'est chargé QUE par import dynamique non littéral depuis index.ts, afin que
// @electric-sql/pglite ne soit jamais embarqué dans le bundle Netlify (revue de risques GPT, risque 9).

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from './schema';
import type { DbHandle } from './index';
import { resolveMigrationsFolder } from './migrate';

/**
 * Crée une base PGlite. `target` vaut `'memory'` (ou vide) pour une base en mémoire, sinon le
 * dossier de données (`pglite://<dossier>`).
 */
export async function createPgliteHandle(target: string): Promise<DbHandle> {
	const client = !target || target === 'memory' ? new PGlite() : new PGlite(target);
	await client.waitReady;
	const db = drizzle({ client, schema, casing: 'snake_case' });
	return {
		driver: 'pglite',
		db,
		async migrate(migrationsFolder?: string) {
			await migrate(db, { migrationsFolder: migrationsFolder ?? resolveMigrationsFolder() });
		},
		async close() {
			await client.close();
		}
	};
}
