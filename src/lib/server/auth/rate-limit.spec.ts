import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import { authRateLimits } from '$lib/server/db/schema';
import {
	RATE_LIMITED_MESSAGE,
	RATE_LIMIT_MAX,
	RATE_LIMIT_WINDOW_MS,
	consumeRateLimit,
	hitRateLimit,
	purgeRateLimits,
	rateLimitKey,
	resetRateLimit
} from './rate-limit';

let t: TestDb;
beforeAll(async () => {
	t = await createTestDb();
});
afterAll(async () => {
	await t.close();
});
beforeEach(async () => {
	await t.db.delete(authRateLimits);
});

describe('limitation des tentatives (04 §3.1, audit 05 §4.3)', () => {
	it('normalise les sujets : pseudo en minuscules, adresse vide ⇒ unknown', () => {
		expect(rateLimitKey('login', ' Alice ')).toEqual({ scope: 'login', subject: 'alice' });
		expect(rateLimitKey('ip', '')).toEqual({ scope: 'ip', subject: 'unknown' });
	});

	it('10 tentatives passent, la 11e est refusée en 429 avec le message exact', async () => {
		const key = rateLimitKey('login', 'alice');
		for (let i = 0; i < RATE_LIMIT_MAX; i++) await consumeRateLimit(t.db, [key]);
		await expect(consumeRateLimit(t.db, [key])).rejects.toMatchObject({
			code: 'RATE_LIMITED',
			status: 429,
			message: RATE_LIMITED_MESSAGE
		});
		expect(RATE_LIMITED_MESSAGE).toBe('Trop de tentatives. Réessaie dans 15 minutes.');
	});

	it('compte chaque clé séparément ; une seule clé dépassée suffit au refus', async () => {
		const ip = rateLimitKey('ip', '9.9.9.9');
		for (let i = 0; i < RATE_LIMIT_MAX; i++) await consumeRateLimit(t.db, [ip, rateLimitKey('login', `p${i}`)]);
		await expect(consumeRateLimit(t.db, [ip, rateLimitKey('login', 'neuf')])).rejects.toMatchObject({ status: 429 });
	});

	it('incrémentation atomique sous concurrence : 20 appels simultanés ⇒ compteur 20', async () => {
		const key = rateLimitKey('register', 'bob');
		const counts = await Promise.all(Array.from({ length: 20 }, () => hitRateLimit(t.db, key)));
		expect([...counts].sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
	});

	it('une fenêtre échue repart à 1', async () => {
		const key = rateLimitKey('login', 'carl');
		const old = new Date(Date.now() - RATE_LIMIT_WINDOW_MS - 1000);
		for (let i = 0; i < 12; i++) await hitRateLimit(t.db, key, old);
		expect(await hitRateLimit(t.db, key)).toBe(1);
	});

	it('remise à zéro et purge', async () => {
		const key = rateLimitKey('login', 'dora');
		await hitRateLimit(t.db, key);
		await resetRateLimit(t.db, key);
		expect(await hitRateLimit(t.db, key)).toBe(1);
		await hitRateLimit(t.db, rateLimitKey('ip', 'x'), new Date(Date.now() - RATE_LIMIT_WINDOW_MS - 5000));
		expect(await purgeRateLimits(t.db)).toBe(1);
	});
});
