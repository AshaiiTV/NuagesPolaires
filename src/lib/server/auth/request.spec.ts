// Hook serveur (04-architecture §4, §10.1, §10.11) testé sans le runtime SvelteKit.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestEvent, ResolveOptions } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import { DEMO_IDS, DEMO_PASSWORDS } from '$lib/server/db/seed';
import { accounts, combats, settings } from '$lib/server/db/schema';
import { SETTING_KEYS } from '$lib/server/db/referentials';
import { adminResetPassword, login } from '$lib/server/domain/accounts';
import {
	applyThemeToHtml,
	createHandle,
	isOriginAllowed,
	isResetAllowedPath,
	securityHeaders
} from './request';
import { requestContextOf } from './context';
import { actorFor, ensureTestEnv } from './testing';

const SITE = 'https://np.test';
const APP_HTML =
	'<html lang="fr" data-regime="carnet" data-theme="dark" data-ton="sombre"><head></head><body></body></html>';

interface Fake {
	event: RequestEvent;
	deleted: string[];
}

function fakeEvent(
	options: { method?: string; path?: string; origin?: string; token?: string } = {}
): Fake {
	const url = new URL(SITE + (options.path ?? '/'));
	const headers: Record<string, string> = { 'user-agent': 'vitest' };
	if (options.origin) headers.origin = options.origin;
	const request = new Request(url, { method: options.method ?? 'GET', headers });
	const jar = new Map<string, string>();
	if (options.token) jar.set('np_session', options.token);
	const deleted: string[] = [];
	const event = {
		request,
		url,
		locals: {},
		params: {},
		route: { id: null },
		isDataRequest: false,
		isSubRequest: false,
		cookies: {
			get: (n: string) => jar.get(n),
			getAll: () => [...jar].map(([name, value]) => ({ name, value })),
			set: (n: string, v: string) => void jar.set(n, v),
			delete: (n: string) => {
				deleted.push(n);
				jar.delete(n);
			},
			serialize: () => ''
		},
		getClientAddress: () => '9.9.9.9',
		setHeaders: () => undefined
	} as unknown as RequestEvent;
	return { event, deleted };
}

const resolve = vi.fn(async (_event: RequestEvent, opts?: ResolveOptions) => {
	const html = opts?.transformPageChunk
		? ((await opts.transformPageChunk({ html: APP_HTML, done: true })) ?? APP_HTML)
		: APP_HTML;
	return new Response(html, { headers: { 'content-type': 'text/html' } });
});

let t: TestDb;
let close: ReturnType<typeof vi.fn<() => Promise<void>>>;
let env: Record<string, string | undefined>;
const handleFor = (dev = false) =>
	createHandle({
		dev,
		env: () => env,
		openDb: async () => ({ db: t.db, close })
	});

beforeAll(() => ensureTestEnv());
beforeEach(async () => {
	t = await createTestDb({ demo: true });
	close = vi.fn<() => Promise<void>>(async () => undefined);
	env = { ...process.env, NP_SITE_URL: SITE };
	resolve.mockClear();
});
afterEach(async () => {
	await t.close();
});

describe('fonctions pures', () => {
	it('contrôle d’origine : non GET/HEAD ⇒ Origin = NP_SITE_URL, hors développement', () => {
		expect(isOriginAllowed('GET', 'https://ailleurs.test', SITE, false)).toBe(true);
		expect(isOriginAllowed('HEAD', null, SITE, false)).toBe(true);
		expect(isOriginAllowed('POST', SITE, SITE, false)).toBe(true);
		expect(isOriginAllowed('POST', `${SITE}/`, `${SITE}/`, false)).toBe(true);
		expect(isOriginAllowed('POST', 'https://ailleurs.test', SITE, false)).toBe(false);
		expect(isOriginAllowed('POST', null, SITE, false)).toBe(false);
		expect(isOriginAllowed('DELETE', SITE, '', false)).toBe(false);
		expect(isOriginAllowed('POST', 'https://ailleurs.test', SITE, true)).toBe(true);
	});

	it('pages ouvertes à une session reset', () => {
		expect(isResetAllowedPath('/entrer/nouveau-mot-de-passe')).toBe(true);
		expect(isResetAllowedPath('/entrer/nouveau-mot-de-passe/')).toBe(true);
		expect(isResetAllowedPath('/entrer/quitter')).toBe(true);
		expect(isResetAllowedPath('/carnet')).toBe(false);
		expect(isResetAllowedPath('/registre')).toBe(false);
	});

	it('en-têtes : HSTS hors dev, no-store si authentifié', () => {
		expect(securityHeaders({ dev: false, authenticated: true })).toMatchObject({
			'Cache-Control': 'private, no-store',
			'Strict-Transport-Security': expect.any(String),
			'X-Content-Type-Options': 'nosniff',
			'Referrer-Policy': 'strict-origin-when-cross-origin',
			'Cross-Origin-Opener-Policy': 'same-origin'
		});
		expect(securityHeaders({ dev: true, authenticated: false })).not.toHaveProperty(
			'Cache-Control'
		);
		expect(securityHeaders({ dev: true, authenticated: false })).not.toHaveProperty(
			'Strict-Transport-Security'
		);
	});

	it('thème dans app.html, tokens d’un thème créé injectés, identifiant hostile ignoré', () => {
		expect(applyThemeToHtml(APP_HTML, { id: 'light', ton: 'clair' })).toContain(
			'data-theme="light" data-ton="clair"'
		);
		expect(applyThemeToHtml(APP_HTML, { id: 'dark', ton: 'sombre' })).toBe(APP_HTML);
		const custom = applyThemeToHtml(APP_HTML, { id: 'veillee', ton: 'sombre' }, {
			'--page': '#141414',
			'--encre': '#f5f5f5'
		} as never);
		expect(custom).toContain(
			'<style>html[data-theme="veillee"]{--page:#141414;--encre:#f5f5f5}</style></head>'
		);
		expect(applyThemeToHtml(APP_HTML, { id: '"><script>', ton: 'sombre' })).toBe(APP_HTML);
	});
});

describe('handle', () => {
	it('refuse en 403 un POST d’une autre origine, sans ouvrir la base', async () => {
		const opened = vi.fn();
		const handle = createHandle({
			dev: false,
			env: () => env,
			openDb: async () => (opened(), { db: t.db, close })
		});
		const { event } = fakeEvent({
			method: 'POST',
			path: '/entrer',
			origin: 'https://ailleurs.test'
		});
		const res = await handle({ event, resolve });
		expect(res.status).toBe(403);
		expect(opened).not.toHaveBeenCalled();
		expect(resolve).not.toHaveBeenCalled();
	});

	it('visiteur : locals vides, thème dark, en-têtes de sécurité, base fermée', async () => {
		const { event } = fakeEvent({ method: 'POST', path: '/entrer', origin: SITE });
		const res = await handleFor()({ event, resolve });
		expect(event.locals).toMatchObject({
			session: null,
			account: null,
			character: null,
			actor: null,
			compteNav: null,
			theme: { id: 'dark', ton: 'sombre' }
		});
		expect(event.locals.db).toBe(t.db);
		expect(res.headers.get('x-content-type-options')).toBe('nosniff');
		expect(res.headers.get('strict-transport-security')).toBeTruthy();
		expect(res.headers.get('cache-control')).toBeNull();
		expect(close).toHaveBeenCalledTimes(1);
	});

	it('session pleine : acteur, navigation, thème du compte, Cache-Control privé', async () => {
		await t.db
			.update(accounts)
			.set({ selectedTheme: 'violet' })
			.where(eq(accounts.id, DEMO_IDS.accounts.alice));
		const { sessionToken } = await login(t.db, { pseudo: 'alice', password: DEMO_PASSWORDS.alice });
		const { event } = fakeEvent({ path: '/carnet', token: sessionToken });
		const res = await handleFor()({ event, resolve });
		expect(event.locals.actor).toEqual({
			accountId: DEMO_IDS.accounts.alice,
			role: 'joueur',
			characterId: DEMO_IDS.characters.aria,
			pseudo: 'alice'
		});
		// `cornes` vient de `hasCorners` (domain/reading.ts, import tolérant) quand ce module est livré.
		expect(event.locals.compteNav).toMatchObject({
			pseudo: 'alice',
			role: 'joueur',
			relie: true,
			cornes: expect.any(Boolean),
			tableOuverte: null
		});
		expect(event.locals.character?.id).toBe(DEMO_IDS.characters.aria);
		expect(event.locals.session?.scope).toBe('full');
		expect(event.locals.theme).toEqual({ id: 'violet', ton: 'sombre' });
		expect(await res.text()).toContain('data-theme="violet" data-ton="sombre"');
		expect(res.headers.get('cache-control')).toBe('private, no-store');
		// Le contexte (session, ip) accompagne l'acteur pour les relectures sous verrou.
		expect(requestContextOf(event.locals.actor)).toMatchObject({
			ip: '9.9.9.9',
			sessionId: event.locals.session?.id
		});
	});

	it('cookie invalide : effacé, visiteur, réponse privée', async () => {
		const { event, deleted } = fakeEvent({ path: '/', token: 'A'.repeat(43) });
		const res = await handleFor()({ event, resolve });
		expect(deleted).toEqual(['np_session']);
		expect(event.locals.actor).toBeNull();
		expect(res.headers.get('cache-control')).toBe('private, no-store');
	});

	it('session reset : redirection vers la fin de réinitialisation, aucun acteur', async () => {
		const admin = await actorFor(t.db, DEMO_IDS.accounts.admin);
		const reset = await adminResetPassword(t.db, admin, { accountId: DEMO_IDS.accounts.bob });
		const { sessionToken } = await login(t.db, {
			pseudo: 'bob',
			password: reset.temporaryPassword
		});

		const blocked = fakeEvent({ path: '/carnet', token: sessionToken });
		const res = await handleFor()({ event: blocked.event, resolve });
		expect(res.status).toBe(303);
		expect(res.headers.get('location')).toBe('/entrer/nouveau-mot-de-passe');
		expect(resolve).not.toHaveBeenCalled();

		const allowed = fakeEvent({ path: '/entrer/nouveau-mot-de-passe', token: sessionToken });
		const ok = await handleFor()({ event: allowed.event, resolve });
		expect(ok.status).toBe(200);
		expect(allowed.event.locals.session?.scope).toBe('reset');
		expect(allowed.event.locals.actor).toBeNull();
		expect(allowed.event.locals.account?.id).toBe(DEMO_IDS.accounts.bob);
		expect(close).toHaveBeenCalledTimes(2);
	});

	it('MJ avec une Table ouverte : le ruban y mène ; lien d’invitation Discord lu dans les réglages', async () => {
		await t.db.insert(combats).values({
			id: 'c_ouverte',
			ownerAccountId: DEMO_IDS.accounts.mj,
			status: 'en_cours',
			name: 'Col des brumes'
		});
		await t.db
			.update(settings)
			.set({ value: 'https://discord.gg/nuages' })
			.where(eq(settings.key, SETTING_KEYS.discordInviteUrl));
		const { sessionToken } = await login(t.db, { pseudo: 'mj', password: DEMO_PASSWORDS.mj });
		const { event } = fakeEvent({ path: '/table', token: sessionToken });
		await handleFor()({ event, resolve });
		expect(event.locals.compteNav).toMatchObject({
			role: 'mj',
			relie: false,
			tableOuverte: 'c_ouverte'
		});
		expect(event.locals.discordInvite).toBe('https://discord.gg/nuages');
	});

	it('la base est fermée même si le rendu échoue', async () => {
		const { event } = fakeEvent({ path: '/' });
		const failing = vi.fn(async () => {
			throw new Error('rendu cassé');
		});
		await expect(handleFor()({ event, resolve: failing })).rejects.toThrow('rendu cassé');
		expect(close).toHaveBeenCalledTimes(1);
	});

	it('prérendu : aucune base ouverte', async () => {
		const opened = vi.fn();
		const handle = createHandle({
			dev: false,
			building: true,
			env: () => env,
			openDb: async () => (opened(), { db: t.db, close })
		});
		const { event } = fakeEvent({ path: '/' });
		await handle({ event, resolve });
		expect(opened).not.toHaveBeenCalled();
		expect(event.locals.actor).toBeNull();
	});
});
