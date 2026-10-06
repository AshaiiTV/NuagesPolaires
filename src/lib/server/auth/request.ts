// Traitement commun de chaque requête (04-architecture §4, §10.1, §10.11 ; 06-contrats §A), assemblé par
// `src/hooks.server.ts`. Séparé du hook pour être testé sans le runtime SvelteKit :
//   - base de la requête ouverte puis FERMÉE dans un `finally` (04 §10.1) ;
//   - refus 403 de toute requête non GET/HEAD dont l'Origin diffère de NP_SITE_URL, hors développement ;
//   - lecture de la session (cookie `np_session`), du compte, du personnage, de l'acteur, de la
//     navigation (cornes, Table ouverte), du thème et du lien d'invitation Discord ;
//   - session `reset` : seules la page de fin de réinitialisation et la déconnexion sont ouvertes ;
//   - `Cache-Control: private, no-store` dès qu'une session existe ; en-têtes de sécurité ;
//   - `transformPageChunk` : remplace `data-theme="dark" data-ton="sombre"` de app.html.
import type { Handle, RequestEvent } from '@sveltejs/kit';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Db } from '$lib/server/db';
import { combats, oaths, settings, type Account } from '$lib/server/db/schema';
import { SETTING_KEYS } from '$lib/server/db/referentials';
import type { Actor } from '$lib/server/permissions';
import type { CompteNav } from '$lib/ui/navigation';
import type { ThemeTokens } from '$lib/ui/themes';
import { resolveActiveTheme } from '$lib/server/domain/accounts';
import { bindRequestContext } from './context';
import { SESSION_COOKIE, clearSessionCookie, cookieShouldBeSecure, readSession } from './session';

type Env = Record<string, string | undefined>;

/** Pages ouvertes à une session `reset` (04 §4 : verify, complete_forced_reset, logout). */
export const RESET_ALLOWED_PATHS: readonly string[] = [
	'/entrer/nouveau-mot-de-passe',
	'/entrer/quitter'
];
export const RESET_PAGE = '/entrer/nouveau-mot-de-passe';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Origine canonique d'une URL (`https://site.tld`), ou `null`. */
export function originOf(url: string | null | undefined): string | null {
	if (!url) return null;
	try {
		return new URL(url).origin;
	} catch {
		return null;
	}
}

/**
 * Contrôle d'origine (04 §4 « CSRF ») : hors développement, toute requête non GET/HEAD doit porter
 * `Origin` égal à NP_SITE_URL. En production, NP_SITE_URL est obligatoire.
 */
export function isOriginAllowed(
	method: string,
	originHeader: string | null,
	siteUrl: string | null | undefined,
	dev: boolean
): boolean {
	if (SAFE_METHODS.has(method.toUpperCase())) return true;
	if (dev) return true;
	const expected = originOf(siteUrl);
	if (!expected) return false;
	return originOf(originHeader) === expected;
}

/** Vrai si le chemin est ouvert à une session `reset`. */
export function isResetAllowedPath(pathname: string): boolean {
	const path = pathname.replace(/\/+$/, '') || '/';
	return RESET_ALLOWED_PATHS.includes(path) || pathname.startsWith('/_app/');
}

/** En-têtes de sécurité des réponses SSR (04 §4, §10.11). La CSP elle-même vient de `kit.csp`. */
export function securityHeaders(options: {
	dev: boolean;
	authenticated: boolean;
}): Record<string, string> {
	const headers: Record<string, string> = {
		'X-Content-Type-Options': 'nosniff',
		'Referrer-Policy': 'strict-origin-when-cross-origin',
		'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
		'Cross-Origin-Opener-Policy': 'same-origin',
		'X-Frame-Options': 'DENY'
	};
	if (!options.dev) headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
	if (options.authenticated) headers['Cache-Control'] = 'private, no-store';
	return headers;
}

/** Pose des en-têtes sur une réponse (recrée la réponse si ses en-têtes sont figés). */
export function withHeaders(response: Response, headers: Record<string, string>): Response {
	try {
		for (const [k, v] of Object.entries(headers)) response.headers.set(k, v);
		return response;
	} catch {
		const copy = new Response(response.body, response);
		for (const [k, v] of Object.entries(headers)) copy.headers.set(k, v);
		return copy;
	}
}

const THEME_ID_SAFE = /^[a-z0-9-]{1,64}$/;
const HEX_SAFE = /^#[0-9a-fA-F]{3,6}$/;

/**
 * Remplace le thème par défaut d'app.html (`data-theme="dark" data-ton="sombre"`) par celui du compte ;
 * pour un thème créé (sans règle CSS), injecte ses huit tokens dans un `<style>` (autorisé par
 * `style-src 'unsafe-inline'`, 04 §4).
 */
export function applyThemeToHtml(
	html: string,
	theme: { id: string; ton: 'sombre' | 'clair' },
	customTokens?: ThemeTokens | null
): string {
	if (!THEME_ID_SAFE.test(theme.id)) return html;
	let out = html;
	if (theme.id !== 'dark' || theme.ton !== 'sombre') {
		out = out.replace(
			'data-theme="dark" data-ton="sombre"',
			`data-theme="${theme.id}" data-ton="${theme.ton}"`
		);
	}
	if (customTokens && out.includes('</head>')) {
		const decls = Object.entries(customTokens)
			.filter(([k, v]) => /^--[a-z0-9-]+$/.test(k) && HEX_SAFE.test(v))
			.map(([k, v]) => `${k}:${v}`)
			.join(';');
		out = out.replace('</head>', `<style>html[data-theme="${theme.id}"]{${decls}}</style></head>`);
	}
	return out;
}

/** Module optionnel `reading.ts` (paquet « Dernières pages ») : présent ⇒ inclus dans le bundle. */
const readingModules = import.meta.glob<{
	hasCorners?: (db: Db, actor: Actor) => Promise<boolean>;
}>('/src/lib/server/domain/reading.ts');

async function cornersFor(db: Db, actor: Actor): Promise<boolean> {
	const load = Object.values(readingModules)[0];
	if (!load) return false;
	try {
		const mod = await load();
		return typeof mod.hasCorners === 'function' ? Boolean(await mod.hasCorners(db, actor)) : false;
	} catch {
		return false;
	}
}

/** Table ouverte conduite par ce MJ ou cet administrateur (le ruban y mène, 03-vision §4). */
async function openTableOf(db: Db, account: Account): Promise<string | null> {
	if (account.role !== 'mj' && account.role !== 'admin') return null;
	try {
		const [row] = await db
			.select({ id: combats.id })
			.from(combats)
			.where(
				and(
					eq(combats.ownerAccountId, account.id),
					eq(combats.status, 'en_cours'),
					isNull(combats.closedAt)
				)
			)
			.orderBy(desc(combats.updatedAt))
			.limit(1);
		return row?.id ?? null;
	} catch {
		return null;
	}
}

/** Lien d'invitation Discord du colophon (réglage administrateur), ou `null`. */
export async function readDiscordInvite(db: Db): Promise<string | null> {
	try {
		const [row] = await db
			.select({ value: settings.value })
			.from(settings)
			.where(eq(settings.key, SETTING_KEYS.discordInviteUrl));
		const value = (row?.value ?? '').trim();
		return /^https:\/\//i.test(value) ? value : null;
	} catch {
		return null;
	}
}

export interface HandleDeps {
	/** Ouvre la base de la requête ; `close()` est TOUJOURS appelé (finally). */
	openDb: () => Promise<{ db: Db; close(): Promise<void> }>;
	/** Mode développement (`dev` de `$app/environment`). */
	dev: boolean;
	/** Construction (prérendu) : aucune base n'est ouverte. */
	building?: boolean;
	/** Environnement (par défaut process.env). */
	env?: () => Env;
}

/** Base factice du prérendu : toute utilisation lève une erreur explicite. */
const BUILD_DB = new Proxy({} as Db, {
	get() {
		throw new Error(
			'Base indisponible pendant le prérendu : cette page doit être rendue côté serveur.'
		);
	}
});

function clientAddress(event: RequestEvent): string {
	try {
		return event.getClientAddress();
	} catch {
		return '';
	}
}

/** Fabrique le `handle` de `hooks.server.ts`. */
export function createHandle(deps: HandleDeps): Handle {
	return async ({ event, resolve }) => {
		const env = deps.env?.() ?? process.env;
		const locals = event.locals;
		locals.session = null;
		locals.account = null;
		locals.character = null;
		locals.actor = null;
		locals.compteNav = null;
		locals.theme = { id: 'dark', ton: 'sombre' };
		locals.discordInvite = null;

		if (deps.building) {
			locals.db = BUILD_DB;
			return resolve(event);
		}

		const method = event.request.method;
		if (!isOriginAllowed(method, event.request.headers.get('origin'), env.NP_SITE_URL, deps.dev)) {
			return withHeaders(
				new Response('Origine refusée.', {
					status: 403,
					headers: { 'content-type': 'text/plain; charset=utf-8' }
				}),
				securityHeaders({ dev: deps.dev, authenticated: false })
			);
		}

		const handle = await deps.openDb();
		try {
			const db = handle.db;
			locals.db = db;
			const secure = !deps.dev && cookieShouldBeSecure(env);
			const token = event.cookies.get(SESSION_COOKIE);
			const read = token ? await readSession(db, token) : null;
			if (token && !read) clearSessionCookie(event.cookies, secure);

			let customTokens: ThemeTokens | null = null;
			if (read) {
				const { session, account, character } = read;
				locals.session = { id: session.id, scope: session.scope };
				locals.account = account;
				if (session.scope === 'full') {
					locals.character = character;
					const actor: Actor = {
						accountId: account.id,
						role: account.role,
						characterId: character ? character.id : null,
						pseudo: account.pseudo
					};
					bindRequestContext(actor, {
						ip: clientAddress(event),
						userAgent: (event.request.headers.get('user-agent') ?? '').slice(0, 240),
						origin: event.request.headers.get('origin') ?? '',
						sessionId: session.id,
						sessionVersion: session.sessionVersion
					});
					locals.actor = actor;
					const [serment] = character
						? await db
								.select({ name: oaths.name })
								.from(oaths)
								.where(eq(oaths.id, character.oathId))
						: [];
					const nav: CompteNav = {
						serment: serment?.name,
						pseudo: account.pseudo,
						role: account.role,
						relie: !!character,
						portrait: character?.avatarUrl ? character.avatarUrl : null,
						cornes: await cornersFor(db, actor),
						tableOuverte: await openTableOf(db, account)
					};
					locals.compteNav = nav;
					const theme = await resolveActiveTheme(db, account);
					locals.theme = { id: theme.id, ton: theme.ton };
					if (theme.custom) customTokens = theme.tokens;
				} else if (!isResetAllowedPath(event.url.pathname)) {
					// Session de réinitialisation : seule la fin de réinitialisation est ouverte (04 §4).
					return withHeaders(
						new Response(null, { status: 303, headers: { location: RESET_PAGE } }),
						securityHeaders({ dev: deps.dev, authenticated: true })
					);
				}
			}
			locals.discordInvite = await readDiscordInvite(db);

			const theme = locals.theme;
			const response = await resolve(event, {
				transformPageChunk: ({ html }) => applyThemeToHtml(html, theme, customTokens)
			});
			return withHeaders(
				response,
				securityHeaders({ dev: deps.dev, authenticated: !!read || !!token })
			);
		} finally {
			await handle.close();
		}
	};
}
