import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import { DEMO_IDS } from '$lib/server/db/seed';
import { accounts } from '$lib/server/db/schema';
import type { Actor } from '$lib/server/permissions';
import {
	DISCORD_CALLBACK_PATH,
	discordAuthUrl,
	discordCallback,
	discordLogin,
	discordUnlink,
	isDiscordEnabled,
	readDiscordState,
	type FetchLike
} from './discord';
import { readSession } from './session';
import { actorFor, ensureTestEnv } from './testing';

const ENV = {
	DISCORD_CLIENT_ID: '123456',
	DISCORD_CLIENT_SECRET: 'secret-discord',
	NP_SITE_URL: 'https://np.test',
	NP_SESSION_SECRET: 'test-only-session-secret-0123456789abcdef'
};

/** Faux Discord : vérifie l'échange PKCE et renvoie l'identité donnée. */
function fakeDiscord(
	identity: { id: string; username: string },
	calls: { url: string; body?: string }[] = []
): FetchLike {
	return async (url, init) => {
		calls.push({ url, body: typeof init?.body === 'string' ? init.body : undefined });
		if (url.endsWith('/oauth2/token')) {
			const body = new URLSearchParams(String(init?.body ?? ''));
			if (
				!body.get('code_verifier') ||
				body.get('redirect_uri') !== `https://np.test${DISCORD_CALLBACK_PATH}`
			) {
				return new Response('{}', { status: 400 });
			}
			return Response.json({ access_token: 'jeton-discord' });
		}
		if (url.endsWith('/users/@me')) return Response.json(identity);
		return new Response('', { status: 404 });
	};
}

function stateOf(url: string): string {
	return new URL(url).searchParams.get('state') ?? '';
}

let t: TestDb;
let alice: Actor;
beforeAll(() => ensureTestEnv());
beforeEach(async () => {
	t = await createTestDb({ demo: true });
	alice = await actorFor(t.db, DEMO_IDS.accounts.alice);
});
afterEach(async () => {
	await t.close();
});

describe('Discord (04 §4 ; 03-vision §12.6)', () => {
	it('désactivé tant que DISCORD_CLIENT_ID est vide', () => {
		expect(isDiscordEnabled({})).toBe(false);
		expect(isDiscordEnabled(ENV)).toBe(true);
		expect(() => discordAuthUrl(null, { ...ENV, DISCORD_CLIENT_ID: '' })).toThrow(
			expect.objectContaining({ status: 404 })
		);
	});

	it('URL d’autorisation : state, PKCE S256, redirection exacte, cookie signé de 10 minutes', () => {
		const start = discordAuthUrl(alice, ENV);
		const url = new URL(start.url);
		expect(url.origin + url.pathname).toBe('https://discord.com/oauth2/authorize');
		expect(url.searchParams.get('redirect_uri')).toBe('https://np.test/entrer/discord/retour');
		expect(url.searchParams.get('code_challenge_method')).toBe('S256');
		expect(url.searchParams.get('scope')).toBe('identify');
		expect(start.maxAge).toBe(600);
		const payload = readDiscordState(start.cookieValue, stateOf(start.url), ENV);
		expect(payload).toMatchObject({ m: 'link', a: alice.accountId });
		// Falsifié, autre state, ou expiré : refusé.
		expect(
			readDiscordState(
				start.cookieValue.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')),
				stateOf(start.url),
				ENV
			)
		).toBeNull();
		expect(readDiscordState(start.cookieValue, 'autre', ENV)).toBeNull();
		expect(
			readDiscordState(
				start.cookieValue,
				stateOf(start.url),
				ENV,
				new Date(Date.now() + 11 * 60_000)
			)
		).toBeNull();
	});

	it('lie le compte connecté puis permet la connexion par discord_id', async () => {
		const calls: { url: string; body?: string }[] = [];
		const fetch = fakeDiscord({ id: '987654321012', username: 'aria_d' }, calls);
		const link = discordAuthUrl(alice, ENV);
		await expect(
			discordCallback(
				t.db,
				alice,
				{ code: 'c1', state: stateOf(link.url), cookieValue: link.cookieValue },
				{ fetch, env: ENV }
			)
		).resolves.toEqual({ discordUsername: 'aria_d' });
		const [row] = await t.db.select().from(accounts).where(eq(accounts.id, alice.accountId));
		expect(row).toMatchObject({ discordId: '987654321012', discordUsername: 'aria_d' });
		expect(calls[0].body).toContain('code_verifier=');

		const start = discordAuthUrl(null, ENV);
		const res = await discordLogin(
			t.db,
			{ code: 'c2', state: stateOf(start.url), cookieValue: start.cookieValue },
			{ fetch, env: ENV }
		);
		expect((await readSession(t.db, res.sessionToken))?.account.id).toBe(alice.accountId);
	});

	it('refuse un state de liaison utilisé par un autre compte ou en mode connexion', async () => {
		const fetch = fakeDiscord({ id: '987654321012', username: 'aria_d' });
		const bob = await actorFor(t.db, DEMO_IDS.accounts.bob);
		const link = discordAuthUrl(alice, ENV);
		await expect(
			discordCallback(
				t.db,
				bob,
				{ code: 'c', state: stateOf(link.url), cookieValue: link.cookieValue },
				{ fetch, env: ENV }
			)
		).rejects.toMatchObject({ status: 400, code: 'DISCORD_STATE' });
		await expect(
			discordLogin(
				t.db,
				{ code: 'c', state: stateOf(link.url), cookieValue: link.cookieValue },
				{ fetch, env: ENV }
			)
		).rejects.toMatchObject({ status: 400 });
		await expect(
			discordCallback(
				t.db,
				null,
				{ code: 'c', state: stateOf(link.url), cookieValue: link.cookieValue },
				{ fetch, env: ENV }
			)
		).rejects.toMatchObject({ status: 401 });
	});

	it('un compte Discord déjà lié ailleurs ⇒ 409 ; inconnu à la connexion ⇒ 401', async () => {
		const fetch = fakeDiscord({ id: '111111111111', username: 'x' });
		await t.db
			.update(accounts)
			.set({ discordId: '111111111111' })
			.where(eq(accounts.id, DEMO_IDS.accounts.bob));
		const link = discordAuthUrl(alice, ENV);
		await expect(
			discordCallback(
				t.db,
				alice,
				{ code: 'c', state: stateOf(link.url), cookieValue: link.cookieValue },
				{ fetch, env: ENV }
			)
		).rejects.toMatchObject({ status: 409, code: 'DISCORD_TAKEN' });

		const other = fakeDiscord({ id: '222222222222', username: 'y' });
		const start = discordAuthUrl(null, ENV);
		await expect(
			discordLogin(
				t.db,
				{ code: 'c', state: stateOf(start.url), cookieValue: start.cookieValue },
				{ fetch: other, env: ENV }
			)
		).rejects.toMatchObject({ status: 401 });
	});

	it('échec réseau ou réponse invalide de Discord ⇒ 502 sans écriture', async () => {
		const broken: FetchLike = async () => {
			throw new Error('réseau');
		};
		const link = discordAuthUrl(alice, ENV);
		await expect(
			discordCallback(
				t.db,
				alice,
				{ code: 'c', state: stateOf(link.url), cookieValue: link.cookieValue },
				{ fetch: broken, env: ENV }
			)
		).rejects.toMatchObject({ status: 502 });
		const [row] = await t.db.select().from(accounts).where(eq(accounts.id, alice.accountId));
		expect(row.discordId).toBeNull();
	});

	it('délier', async () => {
		await t.db
			.update(accounts)
			.set({ discordId: '333333333333', discordUsername: 'z' })
			.where(eq(accounts.id, alice.accountId));
		await discordUnlink(t.db, alice);
		const [row] = await t.db.select().from(accounts).where(eq(accounts.id, alice.accountId));
		expect(row.discordId).toBeNull();
	});
});
