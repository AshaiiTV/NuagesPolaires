// Fabrique de connexion : sélection du pilote par DATABASE_URL, singleton, fermeture.
import { afterEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { closeDb, executeRows, getDb, getDbHandle, openDb, resolveDbTarget } from './index';
import { runMigrations, resolveMigrationsFolder } from './migrate';
import { NpError, isNpError, toErrorPayload } from '../http';

afterEach(async () => {
	await closeDb();
});

describe('resolveDbTarget', () => {
	it('choisit PGlite en mémoire quand DATABASE_URL est vide', () => {
		expect(resolveDbTarget({})).toEqual({ driver: 'pglite', target: 'memory' });
		expect(resolveDbTarget({ DATABASE_URL: '   ' })).toEqual({
			driver: 'pglite',
			target: 'memory'
		});
		expect(resolveDbTarget({ DATABASE_URL: 'pglite://memory' })).toEqual({
			driver: 'pglite',
			target: 'memory'
		});
		expect(resolveDbTarget({ DATABASE_URL: 'pglite://./.data/np' })).toEqual({
			driver: 'pglite',
			target: './.data/np'
		});
	});

	it('choisit Neon pour postgres:// et postgresql://, y compris via NETLIFY_DATABASE_URL', () => {
		expect(resolveDbTarget({ DATABASE_URL: 'postgres://u:p@h/db' })).toEqual({
			driver: 'neon',
			url: 'postgres://u:p@h/db'
		});
		expect(
			resolveDbTarget({ NETLIFY_DATABASE_URL: 'postgresql://u:p@h/db?sslmode=require' })
		).toEqual({
			driver: 'neon',
			url: 'postgresql://u:p@h/db?sslmode=require'
		});
		// DATABASE_URL prime sur NETLIFY_DATABASE_URL.
		expect(
			resolveDbTarget({ DATABASE_URL: 'pglite://memory', NETLIFY_DATABASE_URL: 'postgres://x' })
				.driver
		).toBe('pglite');
	});

	it('rejette une URL inconnue', () => {
		expect(() => resolveDbTarget({ DATABASE_URL: 'mysql://x' })).toThrow(/DATABASE_URL invalide/);
	});
});

describe('getDb', () => {
	it('ouvre PGlite par import dynamique, applique les migrations et partage le singleton', async () => {
		const previous = process.env.DATABASE_URL;
		process.env.DATABASE_URL = 'pglite://memory';
		try {
			const handle = await getDbHandle();
			expect(handle.driver).toBe('pglite');
			await runMigrations();
			const db = await getDb();
			expect(db).toBe(handle.db);
			expect(await getDbHandle()).toBe(handle);
			const r = await executeRows<{ n: number }>(db, sql`select count(*)::int as n from themes`);
			expect(r[0]?.n).toBe(0); // migré mais non semé
		} finally {
			if (previous === undefined) delete process.env.DATABASE_URL;
			else process.env.DATABASE_URL = previous;
		}
	});

	it('closeDb ferme et oublie le singleton', async () => {
		const first = await openDb({ driver: 'pglite', target: 'memory' });
		await first.close();
		const a = await getDbHandle();
		await closeDb();
		const b = await getDbHandle();
		expect(b).not.toBe(a);
	});

	it('localise le dossier drizzle/ avec son journal', () => {
		expect(resolveMigrationsFolder()).toMatch(/drizzle$/);
		expect(() => resolveMigrationsFolder({ NP_MIGRATIONS_DIR: 'C:/inexistant' })).not.toThrow(); // retombe sur le dépôt
	});
});

describe('NpError', () => {
	it('porte code et statut, et se sérialise pour fail()', () => {
		const e = new NpError('EVENT_FULL', 'Événement complet.', 409);
		expect(isNpError(e)).toBe(true);
		expect(e.toJSON()).toEqual({ code: 'EVENT_FULL', message: 'Événement complet.', status: 409 });
		expect(NpError.versionRequired().status).toBe(428);
		expect(NpError.versionConflict().message).toBe(
			'Ces données ont été modifiées par une autre session. Recharge-les avant de réessayer.'
		);
		expect(isNpError(new Error('x'))).toBe(false);
		expect(toErrorPayload(new Error('secret interne'))).toEqual({
			status: 500,
			code: 'INTERNAL',
			message: 'Une erreur inattendue est survenue.'
		});
	});
});
