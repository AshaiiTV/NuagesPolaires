// Fabrique de connexion (04 §10.1, §10.2) : sélection du pilote, pool Neon par appel, PGlite partagé.
import { afterAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import {
	NEON_POOL_OPTIONS,
	closeSharedDb,
	executeRows,
	isProductionEnv,
	openDb,
	resolveDbTarget
} from './index';
import { createPgliteHandle } from './pglite';
import { resolveMigrationsFolder, runMigrations, checkReferentials } from './migrate';

import { DEMO_IDS, THEME_SEED } from './seed';
import { NpError, isNpError, toErrorPayload } from '../http';

afterAll(async () => {
	await closeSharedDb();
});

describe('resolveDbTarget (04 §10.2)', () => {
	it('exige une configuration : sans variable, erreur explicite', () => {
		expect(() => resolveDbTarget({})).toThrow(/Aucune base configurée/);
		expect(() => resolveDbTarget({ DATABASE_URL: '   ' })).toThrow(/Aucune base configurée/);
	});

	it('NP_DB_DRIVER=pglite : mémoire par défaut, dossier si NP_PGLITE_DIR', () => {
		expect(resolveDbTarget({ NP_DB_DRIVER: 'pglite' })).toEqual({
			driver: 'pglite',
			dataDir: null
		});
		expect(resolveDbTarget({ NP_DB_DRIVER: ' PGlite ', NP_PGLITE_DIR: '  ' })).toEqual({
			driver: 'pglite',
			dataDir: null
		});
		expect(resolveDbTarget({ NP_DB_DRIVER: 'pglite', NP_PGLITE_DIR: './.data/np' })).toEqual({
			driver: 'pglite',
			dataDir: './.data/np'
		});
		// Le pilote explicite l'emporte sur une URL présente.
		expect(
			resolveDbTarget({ NP_DB_DRIVER: 'pglite', DATABASE_URL: 'postgres://u:p@h/db' }).driver
		).toBe('pglite');
	});

	it('refuse PGlite en production (NETLIFY=true ou NODE_ENV=production)', () => {
		expect(() => resolveDbTarget({ NP_DB_DRIVER: 'pglite', NETLIFY: 'true' })).toThrow(
			/refusé en production/
		);
		expect(() => resolveDbTarget({ NP_DB_DRIVER: 'pglite', NODE_ENV: 'production' })).toThrow(
			/refusé en production/
		);
		expect(isProductionEnv({ NETLIFY: 'true' })).toBe(true);
		expect(isProductionEnv({ NODE_ENV: 'production' })).toBe(true);
		expect(isProductionEnv({ NETLIFY: 'false', NODE_ENV: 'test' })).toBe(false);
	});

	it('sans pilote explicite : URL postgres via DATABASE_URL puis NETLIFY_DATABASE_URL', () => {
		expect(resolveDbTarget({ DATABASE_URL: 'postgres://u:p@h/db' })).toEqual({
			driver: 'neon',
			url: 'postgres://u:p@h/db'
		});
		expect(
			resolveDbTarget({ NETLIFY_DATABASE_URL: 'postgresql://u:p@h/db?sslmode=require' })
		).toEqual({ driver: 'neon', url: 'postgresql://u:p@h/db?sslmode=require' });
		// Les deux définies et identiques : accepté.
		expect(
			resolveDbTarget({ DATABASE_URL: 'postgres://x/db', NETLIFY_DATABASE_URL: 'postgres://x/db' })
		).toEqual({ driver: 'neon', url: 'postgres://x/db' });
		// En production, Neon est évidemment permis.
		expect(resolveDbTarget({ DATABASE_URL: 'postgres://x/db', NETLIFY: 'true' }).driver).toBe(
			'neon'
		);
	});

	it('refuse deux URL différentes', () => {
		expect(() =>
			resolveDbTarget({ DATABASE_URL: 'postgres://a/db', NETLIFY_DATABASE_URL: 'postgres://b/db' })
		).toThrow(/toutes deux définies et différentes/);
	});

	it('refuse une URL non postgres (dont l’ancienne forme pglite://) et un pilote inconnu', () => {
		expect(() => resolveDbTarget({ DATABASE_URL: 'mysql://x' })).toThrow(/URL de base invalide/);
		expect(() => resolveDbTarget({ DATABASE_URL: 'pglite://memory' })).toThrow(
			/NP_DB_DRIVER=pglite/
		);
		expect(() => resolveDbTarget({ NP_DB_DRIVER: 'sqlite' })).toThrow(/NP_DB_DRIVER inconnu/);
	});
});

describe('openDb — Neon (04 §10.1)', () => {
	it('crée un pool neuf par appel, borné (max 2, 5 s, 10 s), fermé par l’appelant', async () => {
		expect(NEON_POOL_OPTIONS).toEqual({
			max: 2,
			connectionTimeoutMillis: 5000,
			idleTimeoutMillis: 10000
		});
		const target = { driver: 'neon', url: 'postgres://u:p@127.0.0.1:1/inexistante' } as const;
		const a = await openDb(target);
		const b = await openDb(target);
		try {
			expect(a.driver).toBe('neon');
			expect(a).not.toBe(b); // aucun singleton
			expect(a.db).not.toBe(b.db);
			const pool = (a.db as unknown as { $client: { options: Record<string, unknown> } }).$client;
			expect(pool.options).toMatchObject(NEON_POOL_OPTIONS);
		} finally {
			await a.close();
			await b.close();
		}
		await expect(a.close()).resolves.toBeUndefined(); // fermeture idempotente
	});
});

describe('openDb — PGlite partagé (04 §10.2)', () => {
	it('ouvre un singleton de processus migré et semé (référentiels, Serments, démonstration)', async () => {
		const target = { driver: 'pglite', dataDir: null } as const;
		const first = await openDb(target);
		const second = await openDb(target);
		expect(first.driver).toBe('pglite');
		expect(second.db).toBe(first.db);

		// close() d'un handle partagé ne ferme rien : la base reste utilisable.
		await first.close();
		const themes = await executeRows<{ n: number }>(
			second.db,
			sql`select count(*)::int as n from themes`
		);
		expect(themes[0]?.n).toBe(THEME_SEED.length);
		const oaths = await executeRows<{ n: number }>(
			second.db,
			sql`select count(*)::int as n from oaths where is_builtin`
		);
		expect(oaths[0]?.n).toBe(13);
		const demo = await executeRows<{ id: string }>(
			second.db,
			sql`select id from accounts where id = ${DEMO_IDS.accounts.alice}`
		);
		expect(demo).toHaveLength(1);

		// closeSharedDb ferme réellement : l'ouverture suivante repart d'une instance neuve.
		await closeSharedDb();
		const third = await openDb(target);
		expect(third.db).not.toBe(first.db);
		await closeSharedDb();
	}, 30000);

	it('openDb() sans argument suit NP_DB_DRIVER', async () => {
		const previous = process.env.NP_DB_DRIVER;
		process.env.NP_DB_DRIVER = 'pglite';
		try {
			const handle = await openDb();
			expect(handle.driver).toBe('pglite');
		} finally {
			if (previous === undefined) delete process.env.NP_DB_DRIVER;
			else process.env.NP_DB_DRIVER = previous;
			await closeSharedDb();
		}
	}, 30000);

	it('refuse une cible PGlite explicite quand NODE_ENV=production', async () => {
		const previous = process.env.NODE_ENV;
		process.env.NODE_ENV = 'production';
		try {
			await expect(openDb({ driver: 'pglite', dataDir: null })).rejects.toThrow(
				/refusé en production/
			);
		} finally {
			process.env.NODE_ENV = previous;
		}
	});
});

describe('migrations', () => {
	it('localise le dossier drizzle/ avec son journal', () => {
		expect(resolveMigrationsFolder()).toMatch(/drizzle$/);
		expect(() => resolveMigrationsFolder({ NP_MIGRATIONS_DIR: 'C:/inexistant' })).not.toThrow(); // retombe sur le dépôt
	});

	it('runMigrations est idempotent sur une base isolée', async () => {
		const handle = await createPgliteHandle(null);
		try {
			await runMigrations(handle);
			await runMigrations(handle);
			const rows = await executeRows<{ n: number }>(
				handle.db,
				sql`select count(*)::int as n from drizzle.__drizzle_migrations`
			);
			expect(rows[0]?.n).toBe(5); // Fondation, référentiels, INT-1, tokens et fidélité INT-3.
			const themes = await executeRows<{ n: number }>(
				handle.db,
				sql`select count(*)::int as n from themes`
			);
			// Aucun semis applicatif : les référentiels viennent de la migration 0001 elle-même.
			expect(themes[0]?.n).toBe(THEME_SEED.length);
			expect(await checkReferentials(handle.db)).toEqual([]);
		} finally {
			await handle.close();
		}
	});
});

describe('NpError', () => {
	it('porte code et statut, et se sérialise pour fail()', () => {
		const e = new NpError('EVENT_FULL', 'Événement complet.', 409);
		expect(isNpError(e)).toBe(true);
		expect(e.toJSON()).toEqual({ code: 'EVENT_FULL', message: 'Événement complet.', status: 409 });
		expect(NpError.versionRequired().status).toBe(428);
		expect(NpError.versionConflict().message).toBe(
			'Quelqu’un a écrit sur cette page entre-temps. Relis avant d’écrire par-dessus.'
		);
		expect(isNpError(new Error('x'))).toBe(false);
		expect(toErrorPayload(new Error('secret interne'))).toEqual({
			status: 500,
			code: 'INTERNAL',
			message: 'Une erreur inattendue est survenue.'
		});
	});
});
