import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import { DEMO_IDS } from '$lib/server/db/seed';
import { accounts, sessions } from '$lib/server/db/schema';
import {
	FULL_SESSION_MS,
	RESET_SESSION_MS,
	clearSessionCookie,
	countSessions,
	createSession,
	deleteSession,
	isWellFormedToken,
	newSessionToken,
	purgeExpiredSessions,
	readSession,
	revokeAllSessions,
	sessionCookieOptions,
	sessionExpiry,
	sessionIdFor,
	sessionSecret,
	setSessionCookie,
	type SessionCookieOptions
} from './session';
import { ensureTestEnv } from './testing';

const ALICE = DEMO_IDS.accounts.alice;

let t: TestDb;
beforeAll(async () => {
	ensureTestEnv();
	t = await createTestDb({ demo: true });
});
afterAll(async () => {
	await t.close();
});
beforeEach(async () => {
	await t.db.delete(sessions);
	await t.db
		.update(accounts)
		.set({ sessionVersion: 0, forcePasswordReset: false, resetExpiresAt: null })
		.where(eq(accounts.id, ALICE));
});

describe('secret et jetons (04 §3.1)', () => {
	it('exige NP_SESSION_SECRET d’au moins 32 caractères', () => {
		expect(() => sessionSecret({ NP_SESSION_SECRET: 'court' })).toThrow(/32 caractères/);
		expect(() => sessionSecret({})).toThrow(/NP_SESSION_SECRET/);
		expect(sessionSecret({ NP_SESSION_SECRET: 'x'.repeat(32) })).toHaveLength(32);
	});

	it('jeton opaque 32 octets base64url ; id = HMAC-SHA-256 hex, jamais le jeton', () => {
		const token = newSessionToken();
		expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(Buffer.from(token, 'base64url')).toHaveLength(32);
		const id = sessionIdFor(token);
		expect(id).toMatch(/^[0-9a-f]{64}$/);
		expect(id).not.toContain(token);
		expect(sessionIdFor(token, { NP_SESSION_SECRET: 'y'.repeat(40) })).not.toBe(id);
		expect(isWellFormedToken('abc')).toBe(false);
	});

	it('échéances : 30 jours (full), min(reset_expires_at, now + 1 h) (reset)', () => {
		const now = new Date('2026-10-01T10:00:00Z');
		expect(sessionExpiry('full', now).getTime()).toBe(now.getTime() + FULL_SESSION_MS);
		expect(
			sessionExpiry('reset', now, new Date(now.getTime() + 2 * RESET_SESSION_MS)).getTime()
		).toBe(now.getTime() + RESET_SESSION_MS);
		const soon = new Date(now.getTime() + 10 * 60 * 1000);
		expect(sessionExpiry('reset', now, soon).getTime()).toBe(soon.getTime());
	});
});

describe('readSession', () => {
	it('lit une session pleine avec le compte et le personnage relié', async () => {
		const s = await createSession(t.db, {
			accountId: ALICE,
			scope: 'full',
			sessionVersion: 0,
			ip: '1.2.3.4',
			userAgent: 'vitest'
		});
		const read = await readSession(t.db, s.token);
		expect(read?.account.id).toBe(ALICE);
		expect(read?.character?.id).toBe(DEMO_IDS.characters.aria);
		expect(read?.session.scope).toBe('full');
		const [stored] = await t.db.select().from(sessions).where(eq(sessions.id, s.id));
		expect(stored.id).toBe(sessionIdFor(s.token));
		expect(JSON.stringify(stored)).not.toContain(s.token);
	});

	it('refuse un jeton modifié, inconnu ou malformé', async () => {
		const s = await createSession(t.db, { accountId: ALICE, scope: 'full', sessionVersion: 0 });
		const tampered = (s.token[0] === 'A' ? 'B' : 'A') + s.token.slice(1);
		expect(await readSession(t.db, tampered)).toBeNull();
		expect(await readSession(t.db, newSessionToken())).toBeNull();
		expect(await readSession(t.db, 'pas-un-jeton')).toBeNull();
		expect(await readSession(t.db, null)).toBeNull();
	});

	it('refuse une session expirée', async () => {
		const past = new Date(Date.now() - FULL_SESSION_MS - 1000);
		const s = await createSession(t.db, {
			accountId: ALICE,
			scope: 'full',
			sessionVersion: 0,
			now: past
		});
		expect(await readSession(t.db, s.token)).toBeNull();
		expect(await purgeExpiredSessions(t.db)).toBe(1);
	});

	it('refuse une session dont la version est révoquée', async () => {
		const s = await createSession(t.db, { accountId: ALICE, scope: 'full', sessionVersion: 0 });
		expect(await revokeAllSessions(t.db, ALICE)).toBe(1);
		expect(await readSession(t.db, s.token)).toBeNull();
		expect(await countSessions(t.db, ALICE)).toBe(0);
	});

	it('une session pleine tombe dès qu’une réinitialisation est imposée au compte', async () => {
		const s = await createSession(t.db, { accountId: ALICE, scope: 'full', sessionVersion: 0 });
		await t.db
			.update(accounts)
			.set({ forcePasswordReset: true, resetExpiresAt: new Date(Date.now() + 3600_000) })
			.where(eq(accounts.id, ALICE));
		expect(await readSession(t.db, s.token)).toBeNull();
	});

	it('session reset : valide pendant la réinitialisation, refusée si elle échoit ou est levée (04 §10.8)', async () => {
		const resetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
		await t.db
			.update(accounts)
			.set({ forcePasswordReset: true, resetExpiresAt })
			.where(eq(accounts.id, ALICE));
		const s = await createSession(t.db, {
			accountId: ALICE,
			scope: 'reset',
			sessionVersion: 0,
			resetExpiresAt
		});
		expect(s.expiresAt.getTime()).toBe(resetExpiresAt.getTime());
		const read = await readSession(t.db, s.token);
		expect(read?.session.scope).toBe('reset');
		expect(read?.character).toBeNull();
		// Échéance du secret dépassée : refus à l'accès suivant, même si la session n'a pas expiré.
		await t.db
			.update(accounts)
			.set({ resetExpiresAt: new Date(Date.now() - 1000) })
			.where(eq(accounts.id, ALICE));
		expect(await readSession(t.db, s.token)).toBeNull();
		// Réinitialisation levée : la session reset ne vaut plus rien.
		await t.db
			.update(accounts)
			.set({ forcePasswordReset: false, resetExpiresAt: null })
			.where(eq(accounts.id, ALICE));
		expect(await readSession(t.db, s.token)).toBeNull();
	});

	it('deleteSession ne supprime que la session visée', async () => {
		const a = await createSession(t.db, { accountId: ALICE, scope: 'full', sessionVersion: 0 });
		const b = await createSession(t.db, { accountId: ALICE, scope: 'full', sessionVersion: 0 });
		await deleteSession(t.db, a.id);
		expect(await readSession(t.db, a.token)).toBeNull();
		expect(await readSession(t.db, b.token)).not.toBeNull();
	});
});

describe('cookie np_session', () => {
	it('HttpOnly ; SameSite=Lax ; Path=/ ; Secure hors dev ; Max-Age = échéance', () => {
		const now = new Date('2026-10-01T10:00:00Z');
		const opts = sessionCookieOptions(new Date(now.getTime() + FULL_SESSION_MS), {
			now,
			secure: true
		});
		expect(opts).toEqual({
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 30 * 24 * 3600
		});
		expect(sessionCookieOptions(now, { now, secure: false }).secure).toBe(false);
	});

	it('pose et efface le cookie', () => {
		const jar = new Map<string, { value: string; opts: SessionCookieOptions }>();
		const deleted: string[] = [];
		const cookies = {
			get: (n: string) => jar.get(n)?.value,
			set: (n: string, value: string, opts: SessionCookieOptions) =>
				void jar.set(n, { value, opts }),
			delete: (n: string) => void deleted.push(n)
		};
		setSessionCookie(cookies, 'jeton', new Date(Date.now() + 1000 * 60), true);
		expect(jar.get('np_session')?.opts.httpOnly).toBe(true);
		clearSessionCookie(cookies, true);
		expect(deleted).toEqual(['np_session']);
	});
});
