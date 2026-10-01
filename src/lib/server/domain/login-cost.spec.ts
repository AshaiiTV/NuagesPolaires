import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import { accounts } from '../db/schema';
import { ensureTestEnv, legacyPbkdf2Hash, legacySha256 } from '../auth/testing';
import { hashPassword } from '../auth/password';
import { login } from './accounts';

const calls = vi.hoisted(() => ({ scrypt: 0 }));
vi.mock('node:crypto', async (importOriginal) => {
	const original = await importOriginal<typeof import('node:crypto')>();
	return {
		...original,
		scrypt: (...args: Parameters<typeof original.scrypt>) => {
			calls.scrypt++;
			return (original.scrypt as (...a: Parameters<typeof original.scrypt>) => void)(...args);
		}
	};
});
let t: TestDb;
beforeAll(async () => {
	ensureTestEnv();
	t = await createTestDb();
	await t.db.insert(accounts).values({ id: 'cost', pseudo: 'Cost', passwordHash: 'invalid' });
	// Réchauffe la vérification factice, sans compter son premier encodage.
	await login(t.db, { pseudo: 'Unknown', password: 'wrong', ip: 'warm' }).catch(() => undefined);
});
afterAll(async () => t.close());
it('chaque échec effectue une vérification scrypt et applique le budget commun', async () => {
	const hashes = [
		null,
		legacySha256('correct'),
		legacySha256('correct').slice(7),
		legacyPbkdf2Hash('correct', '0123456789abcdef'),
		await hashPassword('correct'),
		'scrypt$malformed'
	];
	for (const [i, hash] of hashes.entries()) {
		if (hash !== null)
			await t.db.update(accounts).set({ passwordHash: hash }).where(eq(accounts.id, 'cost'));
		const before = calls.scrypt;
		const started = performance.now();
		await expect(
			login(t.db, {
				pseudo: hash === null ? 'Unknown' : 'Cost',
				password: 'wrong',
				ip: `cost-${i}`
			})
		).rejects.toMatchObject({ status: 401 });
		expect(calls.scrypt - before).toBe(1);
		expect(performance.now() - started).toBeGreaterThanOrEqual(190);
	}
});
