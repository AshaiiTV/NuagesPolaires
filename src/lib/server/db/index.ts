// Fabrique de connexion (04-architecture §1) : Neon Postgres via le pilote WebSocket (`Pool` +
// drizzle-orm/neon-serverless, vraies transactions) en production ; PGlite en mémoire ou sur dossier
// en développement et en test. Sélection par DATABASE_URL (ou NETLIFY_DATABASE_URL) :
//   - `postgres://…` / `postgresql://…` → Neon ;
//   - vide, `pglite://memory` ou `pglite://<dossier>` → PGlite (chargé par import dynamique
//     non littéral : jamais embarqué dans le bundle Netlify).
// Les variables sont lues dans process.env (et non $env/dynamic/private) pour que ce module reste
// utilisable par les scripts tsx (migrations, migration héritée) hors de SvelteKit.

import type { SQL } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { migrate as migrateNeon } from 'drizzle-orm/neon-serverless/migrator';
import * as schema from './schema';
import { resolveMigrationsFolder } from './migrate';

export * as schema from './schema';

/** Type de base compatible avec les deux pilotes (NeonDatabase et PgliteDatabase), typé avec le schéma. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/** Type d'une transaction Drizzle ouverte sur `Db` (paramètre du callback de `db.transaction`). */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export type DbDriver = 'neon' | 'pglite';

/**
 * Exécute une requête SQL brute et renvoie ses lignes, quel que soit le pilote (Neon et PGlite
 * renvoient tous deux `{ rows }`). Sur le type générique `Db`, `db.execute()` est typé `unknown` :
 * ce helper porte le typage explicite des lignes (`T` est une promesse de forme, pas une validation).
 */
export async function executeRows<T extends Record<string, unknown>>(
	db: Db | Tx,
	query: SQL
): Promise<T[]> {
	const result = (await db.execute(query)) as { rows?: unknown } | undefined;
	return Array.isArray(result?.rows) ? (result.rows as T[]) : [];
}

/** Connexion ouverte : base typée, pilote, application des migrations et fermeture propre. */
export interface DbHandle {
	readonly driver: DbDriver;
	readonly db: Db;
	/** Applique les migrations SQL du dossier `drizzle/` (ou du dossier indiqué). */
	migrate(migrationsFolder?: string): Promise<void>;
	/** Ferme le pool Neon ou l'instance PGlite. */
	close(): Promise<void>;
}

export type DbTarget = { driver: 'neon'; url: string } | { driver: 'pglite'; target: string };

/** Lit DATABASE_URL / NETLIFY_DATABASE_URL et décide du pilote. */
export function resolveDbTarget(env: NodeJS.ProcessEnv = process.env): DbTarget {
	const raw = (env.DATABASE_URL || env.NETLIFY_DATABASE_URL || '').trim();
	if (raw === '') return { driver: 'pglite', target: 'memory' };
	if (/^postgres(ql)?:\/\//i.test(raw)) return { driver: 'neon', url: raw };
	if (/^pglite:\/\//i.test(raw)) {
		const target = raw.slice('pglite://'.length).trim();
		return { driver: 'pglite', target: target === '' ? 'memory' : target };
	}
	throw new Error(
		`DATABASE_URL invalide : attendu postgres://…, pglite://memory ou pglite://<dossier> (reçu « ${raw.slice(0, 16)}… »).`
	);
}

function createNeonHandle(url: string): DbHandle {
	// Node 24 fournit WebSocket nativement ; on le déclare explicitement au pilote.
	if (!neonConfig.webSocketConstructor && typeof globalThis.WebSocket !== 'undefined') {
		neonConfig.webSocketConstructor = globalThis.WebSocket;
	}
	const pool = new Pool({ connectionString: url });
	const db = drizzleNeon({ client: pool, schema, casing: 'snake_case' });
	return {
		driver: 'neon',
		db,
		async migrate(migrationsFolder?: string) {
			await migrateNeon(db, { migrationsFolder: migrationsFolder ?? resolveMigrationsFolder() });
		},
		async close() {
			await pool.end();
		}
	};
}

async function createPgliteHandleLazily(target: string): Promise<DbHandle> {
	// Spécificateur non littéral + @vite-ignore : Vite/Rollup ne suivent pas cet import, PGlite
	// reste hors du bundle de production (il n'est chargé qu'en dev/test, où le chemin se résout).
	const specifier = ['.', 'pglite'].join('/');
	const mod = (await import(/* @vite-ignore */ specifier)) as typeof import('./pglite');
	return mod.createPgliteHandle(target);
}

/** Ouvre une connexion selon la cible ; n'utilise pas le singleton (tests, scripts). */
export async function openDb(target: DbTarget = resolveDbTarget()): Promise<DbHandle> {
	return target.driver === 'neon'
		? createNeonHandle(target.url)
		: createPgliteHandleLazily(target.target);
}

let singleton: Promise<DbHandle> | null = null;

/** Connexion partagée (singleton) ; ouvre le pilote choisi par DATABASE_URL à la première demande. */
export async function getDbHandle(): Promise<DbHandle> {
	if (!singleton) {
		singleton = openDb().catch((e: unknown) => {
			singleton = null;
			throw e;
		});
	}
	return singleton;
}

/** Base partagée typée avec le schéma (04 §2 : seules les couches `lib/server` y accèdent). */
export async function getDb(): Promise<Db> {
	return (await getDbHandle()).db;
}

/** Ferme la connexion partagée (arrêt d'un script, fin de suite de tests) et oublie le singleton. */
export async function closeDb(): Promise<void> {
	const pending = singleton;
	singleton = null;
	if (pending) {
		const handle = await pending.catch(() => null);
		if (handle) await handle.close();
	}
}
