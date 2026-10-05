// Outils de test du paquet Auth (jamais importés par le code applicatif).
import { createHash, pbkdf2Sync } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Db } from '$lib/server/db';
import { accounts } from '$lib/server/db/schema';
import type { Actor } from '$lib/server/permissions';

/** Secret de session de test (≥ 32 caractères) et variables de récupération neutralisées. */
export function ensureTestEnv(): void {
	if ((process.env.NP_SESSION_SECRET ?? '').length < 32) {
		process.env.NP_SESSION_SECRET = 'test-only-session-secret-0123456789abcdef';
	}
	delete process.env.NP_ADMIN_PSEUDO;
	delete process.env.NP_ADMIN_PASSWORD;
	delete process.env.NP_ADMIN_RECOVERY;
}

/** Acteur construit depuis la ligne du compte (comme le hook). */
export async function actorFor(db: Db, accountId: string): Promise<Actor> {
	const [row] = await db.select().from(accounts).where(eq(accounts.id, accountId));
	if (!row) throw new Error(`compte ${accountId} introuvable`);
	return { accountId: row.id, role: row.role, characterId: row.characterId, pseudo: row.pseudo };
}

/** Hash hérité PBKDF2, convention EXACTE du legacy (auth.js:151-158 : sel passé comme chaîne). */
export function legacyPbkdf2Hash(password: string, saltHex: string): string {
	const sha = createHash('sha256').update(password, 'utf8').digest('hex');
	return `pbkdf2:${saltHex}:${pbkdf2Sync(sha, saltHex, 100_000, 64, 'sha512').toString('hex')}`;
}

/** Hash hérité `sha256:<hex>` (client legacy `hashPass`). */
export function legacySha256(password: string): string {
	return `sha256:${createHash('sha256').update(password, 'utf8').digest('hex')}`;
}

/**
 * Base dont `transaction()` exécute d'abord `before` (une écriture « concurrente » qui se glisse entre
 * la vérification hors transaction et la transaction), puis éventuellement intercepte `tx`.
 */
export function interceptTransaction(
	db: Db,
	options: { before?: () => Promise<void>; wrapTx?: (tx: unknown) => unknown }
): Db {
	return new Proxy(db, {
		get(target, prop) {
			if (prop === 'transaction') {
				return async (cb: (tx: unknown) => Promise<unknown>, config?: unknown) => {
					if (options.before) await options.before();
					return (
						target.transaction as (
							cb: (tx: unknown) => Promise<unknown>,
							config?: unknown
						) => Promise<unknown>
					)((tx) => cb(options.wrapTx ? options.wrapTx(tx) : tx), config);
				};
			}
			const value = Reflect.get(target, prop, target) as unknown;
			return typeof value === 'function'
				? (value as (...a: unknown[]) => unknown).bind(target)
				: value;
		}
	});
}

/** Transaction qui échoue sur `delete(table)` : sert aux tests de rollback total. */
export function failOnDelete(table: object): (tx: unknown) => unknown {
	return (tx) =>
		new Proxy(tx as object, {
			get(target, prop) {
				const value = Reflect.get(target, prop, target) as unknown;
				if (prop === 'delete') {
					return (t: object) => {
						if (t === table) throw new Error('échec simulé de la suppression');
						return (value as (t: object) => unknown).call(target, t);
					};
				}
				return typeof value === 'function'
					? (value as (...a: unknown[]) => unknown).bind(target)
					: value;
			}
		});
}
