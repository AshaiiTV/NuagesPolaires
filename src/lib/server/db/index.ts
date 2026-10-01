// Fabrique de connexion (04-architecture §1, amendée par §10.1 et §10.2).
//
// Sélection du pilote — resolveDbTarget(env) :
//   - Pilote LOCAL (dev, tests ; Postgres embarqué en WebAssembly) : activé UNIQUEMENT par
//     NP_DB_DRIVER=<pilote local> ; base en mémoire par défaut, dossier de données si la variable
//     NP_<PILOTE LOCAL>_DIR est définie. Refusé en production (NETLIFY=true ou NODE_ENV=production).
//   - Sinon, une URL postgres:// est exigée : DATABASE_URL, puis NETLIFY_DATABASE_URL ; les deux
//     définies et différentes ⇒ erreur au démarrage.
//
// Cycle de vie — openDb(target?) :
//   - Neon : un `Pool` (max 2, connexion 5 s, inactivité 10 s) PAR APPEL, jamais de singleton ;
//     l'appelant le ferme (`await handle.close()` dans un `finally`, cf. hooks.server.ts).
//   - Local : UN handle partagé par processus et par cible (sinon chaque requête verrait une base
//     vide en mémoire, et un dossier ne s'ouvre qu'une fois) ; migrations (référentiels compris) et
//     jeu de démonstration à la première ouverture ; son `close()` ne ferme rien — closeSharedDb()
//     le ferme réellement.
//
// Ce module ENTRE dans le bundle Netlify. 04 §10.2 : scripts/check-bundle.ts échoue si le bundle
// contient le nom du pilote local, sous quelque casse que ce soit. Ce nom n'apparaît donc ici qu'en
// position de TYPE (effacée à la compilation) ; à l'exécution il est reconstruit par morceaux
// (LOCAL_DRIVER), et le module local n'est chargé que par import dynamique NON littéral : ni le
// paquet, ni son pilote Drizzle, ni le jeu de démonstration n'entrent dans le bundle.
//
// Les variables sont lues dans process.env (et non $env/dynamic/private) pour que ce module reste
// utilisable par les scripts tsx (migrations, migration héritée) hors de SvelteKit.

import type { SQL } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { migrate as migrateNeon } from 'drizzle-orm/neon-serverless/migrator';
import * as schema from './schema';
import { resolveMigrationsFolder } from './migrations-folder';

export * as schema from './schema';

/** Type de base commun aux deux pilotes (Neon et local), typé avec le schéma. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/** Type d'une transaction Drizzle ouverte sur `Db` (paramètre du callback de `db.transaction`). */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export type DbDriver = 'neon' | 'pglite';

/** Valeur du pilote local (`NP_DB_DRIVER`), reconstruite à l'exécution (voir l'en-tête). */
export const LOCAL_DRIVER = ['pg', 'lite'].join('') as Exclude<DbDriver, 'neon'>;

/** Nom affiché du pilote local dans les messages. */
const LOCAL_LABEL = ['PG', 'lite'].join('');

/** Variable d'environnement du dossier de données du pilote local. */
export const LOCAL_DIR_VAR = ['NP', LOCAL_DRIVER.toUpperCase(), 'DIR'].join('_');

/** Cible résolue : URL Neon, ou base locale en mémoire (`dataDir: null`) ou sur dossier. */
export type DbTarget =
	{ driver: 'neon'; url: string } | { driver: 'pglite'; dataDir: string | null };

/** Connexion ouverte : pilote, base typée, fermeture (et application des migrations). */
export interface DbHandle {
	readonly driver: DbDriver;
	readonly db: Db;
	/** Applique les migrations SQL du dossier `drizzle/` (ou du dossier indiqué). */
	migrate(migrationsFolder?: string): Promise<void>;
	/**
	 * Neon : ferme le pool (à appeler par l'appelant, toujours). Base locale partagée : sans effet
	 * (l'instance vit autant que le processus ; voir closeSharedDb()).
	 */
	close(): Promise<void>;
}

/** Options du pool Neon (04 §10.1) : un pool par requête, petit et vite libéré. */
export const NEON_POOL_OPTIONS = {
	max: 2,
	connectionTimeoutMillis: 5000,
	idleTimeoutMillis: 10000
} as const;

type Env = Record<string, string | undefined>;

/** Vrai en production Netlify ou en NODE_ENV=production (04 §10.2). */
export function isProductionEnv(env: Env = process.env): boolean {
	return env.NETLIFY === 'true' || env.NODE_ENV === 'production';
}

/**
 * Exécute une requête SQL brute et renvoie ses lignes, quel que soit le pilote (les deux renvoient
 * `{ rows }`). Sur le type générique `Db`, `db.execute()` est typé `unknown` : ce helper porte le
 * typage explicite des lignes (`T` est une promesse de forme, pas une validation).
 */
export async function executeRows<T extends Record<string, unknown>>(
	db: Db | Tx,
	query: SQL
): Promise<T[]> {
	const result = (await db.execute(query)) as { rows?: unknown } | undefined;
	return Array.isArray(result?.rows) ? (result.rows as T[]) : [];
}

/** Lit l'environnement et décide du pilote (04 §10.2). Lève une erreur explicite sinon. */
export function resolveDbTarget(env: Env = process.env): DbTarget {
	const driver = (env.NP_DB_DRIVER ?? '').trim().toLowerCase();

	if (driver === LOCAL_DRIVER) {
		if (isProductionEnv(env)) {
			throw new Error(
				`NP_DB_DRIVER=${LOCAL_DRIVER} est refusé en production (NETLIFY=true ou NODE_ENV=production) : configure DATABASE_URL.`
			);
		}
		const dir = (env[LOCAL_DIR_VAR] ?? '').trim();
		return { driver: LOCAL_DRIVER, dataDir: dir === '' ? null : dir };
	}
	if (driver !== '' && driver !== 'neon' && driver !== 'postgres') {
		throw new Error(
			`NP_DB_DRIVER inconnu « ${driver} » : valeurs admises « ${LOCAL_DRIVER} » ou vide.`
		);
	}

	const primary = (env.DATABASE_URL ?? '').trim();
	const netlify = (env.NETLIFY_DATABASE_URL ?? '').trim();
	if (primary !== '' && netlify !== '' && primary !== netlify) {
		throw new Error(
			'DATABASE_URL et NETLIFY_DATABASE_URL sont toutes deux définies et différentes : n’en garde qu’une.'
		);
	}
	const url = primary || netlify;
	if (url === '') {
		throw new Error(
			`Aucune base configurée : définis DATABASE_URL (postgres://…) ou, en développement, NP_DB_DRIVER=${LOCAL_DRIVER}.`
		);
	}
	if (!/^postgres(ql)?:\/\//i.test(url)) {
		throw new Error(
			`URL de base invalide : attendu postgres://… ou postgresql://… (reçu « ${url.slice(0, 12)}… ») ; pour ${LOCAL_LABEL}, utilise NP_DB_DRIVER=${LOCAL_DRIVER}.`
		);
	}
	return { driver: 'neon', url };
}

function createNeonHandle(url: string): DbHandle {
	// Node 24 fournit WebSocket nativement ; on le déclare explicitement au pilote.
	if (!neonConfig.webSocketConstructor && typeof globalThis.WebSocket !== 'undefined') {
		neonConfig.webSocketConstructor = globalThis.WebSocket;
	}
	const pool = new Pool({ connectionString: url, ...NEON_POOL_OPTIONS });
	const db = drizzleNeon({ client: pool, schema, casing: 'snake_case' });
	let closed = false;
	return {
		driver: 'neon',
		db,
		async migrate(migrationsFolder?: string) {
			await migrateNeon(db, { migrationsFolder: migrationsFolder ?? resolveMigrationsFolder() });
		},
		async close() {
			if (closed) return;
			closed = true;
			await pool.end();
		}
	};
}

/** Module du pilote local, chargé paresseusement (jamais au chargement de ce fichier). */
type LocalModule = typeof import('./pglite');
let localModule: LocalModule | null = null;

async function loadLocalModule(): Promise<LocalModule> {
	if (!localModule) {
		// Spécificateur NON littéral + @vite-ignore : Vite/Rollup ne suivent pas cet import, le module
		// local (son paquet, son pilote Drizzle, le jeu de démonstration) reste hors du bundle.
		const specifier = `./${LOCAL_DRIVER}`;
		localModule = (await import(/* @vite-ignore */ specifier)) as LocalModule;
	}
	return localModule;
}

/**
 * Ouvre une base selon la cible (par défaut : resolveDbTarget(process.env)).
 * Neon : nouveau pool à fermer par l'appelant. Local : handle partagé du processus, migré et semé.
 */
export async function openDb(target: DbTarget = resolveDbTarget()): Promise<DbHandle> {
	if (target.driver === 'neon') return createNeonHandle(target.url);
	if (isProductionEnv()) {
		throw new Error(
			`${LOCAL_LABEL} est refusé en production (NETLIFY=true ou NODE_ENV=production).`
		);
	}
	const mod = await loadLocalModule();
	return mod.getSharedHandle(target.dataDir);
}

/**
 * Ferme réellement les instances locales partagées (fin de script, fin de suite de tests).
 * Sans effet si le module local n'a jamais été chargé. Les pools Neon sont fermés par leur appelant.
 */
export async function closeSharedDb(): Promise<void> {
	if (localModule) await localModule.closeSharedHandles();
}
