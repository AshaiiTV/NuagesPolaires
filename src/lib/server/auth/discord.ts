// Connexion Discord, optionnelle (04-architecture §4 ; 03-vision §12.6 : livrée mais DÉSACTIVÉE tant
// que DISCORD_CLIENT_ID est vide).
//
// - `state` aléatoire à usage unique et vérificateur PKCE (S256), conservés dans un cookie signé
//   HMAC (NP_SESSION_SECRET), valable 10 minutes ; la route l'efface dès le retour.
// - Redirection exacte `NP_SITE_URL/connexion/discord/retour`.
// - Liaison à un compte EXISTANT et CONNECTÉ uniquement (« Lier mon compte Discord ») ; ensuite
//   connexion par `discord_id`. Aucun rôle ni liaison de personnage par Discord.
// - Le réseau est injecté (`fetch` en paramètre) pour les tests.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { and, eq, ne } from 'drizzle-orm';
import type { Db } from '$lib/server/db';
import { accounts } from '$lib/server/db/schema';
import { recordAudit } from '$lib/server/domain/audit';
import { NpError } from '$lib/server/http';
import { requireActor, type Actor } from '$lib/server/permissions';
import { discordCallbackInput, type LoginResultView } from '$lib/schemas/auth';
import { assertFreshAccount, auditContextOf } from './context';
import { createSession, scopeMatchesAccount, sessionSecret } from './session';
import { isUniqueViolation, parseInput } from './validate';

type Env = Record<string, string | undefined>;

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export const DISCORD_STATE_COOKIE = 'np_discord_state';
export const DISCORD_STATE_TTL_MS = 10 * 60 * 1000;
export const DISCORD_CALLBACK_PATH = '/connexion/discord/retour';
const DISCORD_AUTHORIZE_URL = 'https://discord.com/oauth2/authorize';
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
const DISCORD_ME_URL = 'https://discord.com/api/users/@me';

const STATE_EXPIRED_MESSAGE = 'La connexion Discord a expiré ou a déjà servi. Recommence depuis le carnet.';

/** Discord est actif si DISCORD_CLIENT_ID est défini (03-vision §12.6). */
export function isDiscordEnabled(env: Env = process.env): boolean {
	return (env.DISCORD_CLIENT_ID ?? '').trim() !== '';
}

function assertEnabled(env: Env): { clientId: string; clientSecret: string; redirectUri: string } {
	if (!isDiscordEnabled(env)) {
		throw new NpError('DISCORD_DISABLED', 'La connexion Discord n’est pas activée sur ce carnet.', 404);
	}
	const site = (env.NP_SITE_URL ?? '').trim().replace(/\/+$/, '');
	if (!site) throw new Error('NP_SITE_URL est requis pour la connexion Discord.');
	return {
		clientId: (env.DISCORD_CLIENT_ID ?? '').trim(),
		clientSecret: (env.DISCORD_CLIENT_SECRET ?? '').trim(),
		redirectUri: `${site}${DISCORD_CALLBACK_PATH}`
	};
}

/** URL de retour exacte (04 §4). */
export function discordRedirectUri(env: Env = process.env): string {
	return `${(env.NP_SITE_URL ?? '').trim().replace(/\/+$/, '')}${DISCORD_CALLBACK_PATH}`;
}

interface StatePayload {
	/** state */
	s: string;
	/** vérificateur PKCE */
	v: string;
	/** link : liaison d'un compte connecté ; login : connexion par discord_id */
	m: 'link' | 'login';
	/** compte qui lie (mode link) */
	a: string | null;
	/** échéance (ms) */
	e: number;
}

function sign(data: string, env: Env): string {
	return createHmac('sha256', sessionSecret(env)).update(`discord:${data}`, 'utf8').digest('base64url');
}

function encodeState(payload: StatePayload, env: Env): string {
	const data = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
	return `${data}.${sign(data, env)}`;
}

/** Relit et vérifie le cookie signé ; `null` si absent, falsifié, expiré ou d'un autre `state`. */
export function readDiscordState(
	cookieValue: string | null | undefined,
	state: string,
	env: Env = process.env,
	now: Date = new Date()
): StatePayload | null {
	if (!cookieValue || cookieValue.length > 2048) return null;
	const [data, mac] = cookieValue.split('.');
	if (!data || !mac) return null;
	const expected = Buffer.from(sign(data, env));
	const given = Buffer.from(mac);
	if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
	let payload: StatePayload;
	try {
		payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as StatePayload;
	} catch {
		return null;
	}
	if (typeof payload?.s !== 'string' || typeof payload.v !== 'string' || typeof payload.e !== 'number') return null;
	if (payload.e <= now.getTime()) return null;
	const a = Buffer.from(payload.s);
	const b = Buffer.from(state);
	if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
	return payload;
}

export interface DiscordAuthStart {
	/** URL d'autorisation Discord vers laquelle rediriger. */
	url: string;
	/** Cookie à poser (signé, HttpOnly, SameSite=Lax, 10 minutes). */
	cookieName: string;
	cookieValue: string;
	maxAge: number;
}

/**
 * Prépare l'autorisation (06 §B.1 `discordAuthUrl`). Acteur connecté ⇒ mode liaison ; visiteur ⇒
 * mode connexion.
 */
export function discordAuthUrl(
	actor: Actor | null,
	env: Env = process.env,
	now: Date = new Date()
): DiscordAuthStart {
	const cfg = assertEnabled(env);
	const state = randomBytes(18).toString('base64url');
	const verifier = randomBytes(32).toString('base64url');
	const challenge = createHash('sha256').update(verifier, 'ascii').digest('base64url');
	const payload: StatePayload = {
		s: state,
		v: verifier,
		m: actor ? 'link' : 'login',
		a: actor?.accountId ?? null,
		e: now.getTime() + DISCORD_STATE_TTL_MS
	};
	const params = new URLSearchParams({
		response_type: 'code',
		client_id: cfg.clientId,
		scope: 'identify',
		state,
		redirect_uri: cfg.redirectUri,
		code_challenge: challenge,
		code_challenge_method: 'S256',
		prompt: 'none'
	});
	return {
		url: `${DISCORD_AUTHORIZE_URL}?${params.toString()}`,
		cookieName: DISCORD_STATE_COOKIE,
		cookieValue: encodeState(payload, env),
		maxAge: Math.floor(DISCORD_STATE_TTL_MS / 1000)
	};
}

/** Échange le code contre l'identité Discord (`id`, `username`). */
export async function exchangeDiscordCode(
	code: string,
	verifier: string,
	fetchFn: FetchLike,
	env: Env = process.env
): Promise<{ id: string; username: string }> {
	const cfg = assertEnabled(env);
	const failure = () => new NpError('DISCORD_FAILED', 'Discord n’a pas confirmé la connexion. Réessaie.', 502);
	let tokenResponse: Response;
	try {
		tokenResponse = await fetchFn(DISCORD_TOKEN_URL, {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
			body: new URLSearchParams({
				client_id: cfg.clientId,
				client_secret: cfg.clientSecret,
				grant_type: 'authorization_code',
				code,
				redirect_uri: cfg.redirectUri,
				code_verifier: verifier
			}).toString()
		});
	} catch {
		throw failure();
	}
	if (!tokenResponse.ok) throw failure();
	const token = (await tokenResponse.json().catch(() => null)) as { access_token?: unknown } | null;
	if (!token || typeof token.access_token !== 'string') throw failure();
	let meResponse: Response;
	try {
		meResponse = await fetchFn(DISCORD_ME_URL, {
			headers: { authorization: `Bearer ${token.access_token}`, accept: 'application/json' }
		});
	} catch {
		throw failure();
	}
	if (!meResponse.ok) throw failure();
	const me = (await meResponse.json().catch(() => null)) as { id?: unknown; username?: unknown } | null;
	if (!me || typeof me.id !== 'string' || !/^\d{5,32}$/.test(me.id)) throw failure();
	return { id: me.id, username: typeof me.username === 'string' ? me.username.slice(0, 64) : '' };
}

export interface DiscordDeps {
	fetch: FetchLike;
	env?: Env;
	now?: Date;
}

export interface DiscordReturnInput {
	code: string;
	state: string;
	/** Valeur du cookie `np_discord_state` (la route l'efface ensuite : usage unique). */
	cookieValue: string | null | undefined;
}

/** « Lier mon compte Discord » (06 §B.1 `discordCallback`) : compte connecté uniquement. */
export async function discordCallback(
	db: Db,
	actor: Actor | null,
	input: DiscordReturnInput,
	deps: DiscordDeps
): Promise<{ discordUsername: string }> {
	const present = requireActor(actor);
	const env = deps.env ?? process.env;
	const { code, state } = parseInput(discordCallbackInput, input);
	const payload = readDiscordState(input.cookieValue, state, env, deps.now);
	if (!payload || payload.m !== 'link' || payload.a !== present.accountId) {
		throw new NpError('DISCORD_STATE', STATE_EXPIRED_MESSAGE, 400);
	}
	const identity = await exchangeDiscordCode(code, payload.v, deps.fetch, env);
	try {
		await db.transaction(async (tx) => {
			await assertFreshAccount(tx, present);
			const other = await tx
				.select({ id: accounts.id })
				.from(accounts)
				.where(and(eq(accounts.discordId, identity.id), ne(accounts.id, present.accountId)));
			if (other.length > 0) throw discordTaken();
			await tx
				.update(accounts)
				.set({ discordId: identity.id, discordUsername: identity.username })
				.where(eq(accounts.id, present.accountId));
			await recordAudit(tx, {
				source: 'auth',
				action: 'discord_link',
				actor: present,
				details: { discordUsername: identity.username },
				...auditContextOf(present)
			});
		});
	} catch (e) {
		if (isUniqueViolation(e, 'accounts_discord_id_unique')) throw discordTaken();
		throw e;
	}
	return { discordUsername: identity.username };
}

function discordTaken(): NpError {
	return new NpError('DISCORD_TAKEN', 'Ce compte Discord est déjà lié à un autre compte du carnet.', 409);
}

/** Délie le compte Discord du compte connecté. */
export async function discordUnlink(db: Db, actor: Actor | null): Promise<void> {
	const present = requireActor(actor);
	await db.transaction(async (tx) => {
		await assertFreshAccount(tx, present);
		await tx
			.update(accounts)
			.set({ discordId: null, discordUsername: null })
			.where(eq(accounts.id, present.accountId));
		await recordAudit(tx, { source: 'auth', action: 'discord_unlink', actor: present, ...auditContextOf(present) });
	});
}

/** Connexion par `discord_id` (06 §B.1 `discordLogin`) : ouvre une session pleine. */
export async function discordLogin(
	db: Db,
	input: DiscordReturnInput & { ip?: string | null; userAgent?: string | null },
	deps: DiscordDeps
): Promise<LoginResultView> {
	const env = deps.env ?? process.env;
	const now = deps.now ?? new Date();
	const { code, state } = parseInput(discordCallbackInput, input);
	const payload = readDiscordState(input.cookieValue, state, env, now);
	if (!payload || payload.m !== 'login') throw new NpError('DISCORD_STATE', STATE_EXPIRED_MESSAGE, 400);
	const identity = await exchangeDiscordCode(code, payload.v, deps.fetch, env);

	return db.transaction(async (tx) => {
		const [account] = await tx.select().from(accounts).where(eq(accounts.discordId, identity.id)).for('update');
		// Un compte en réinitialisation forcée ne s'ouvre qu'avec son code (04 §4).
		if (!account || !scopeMatchesAccount('full', account, now)) {
			throw NpError.unauthenticated(
				'Aucun compte du carnet n’est lié à ce compte Discord. Entre avec ton pseudo, puis lie Discord depuis Mon compte.'
			);
		}
		await tx.update(accounts).set({ lastSeenAt: now }).where(eq(accounts.id, account.id));
		const session = await createSession(tx, {
			accountId: account.id,
			scope: 'full',
			sessionVersion: account.sessionVersion,
			ip: input.ip,
			userAgent: input.userAgent,
			now
		});
		await recordAudit(tx, {
			source: 'auth',
			action: 'login_success',
			actor: { accountId: account.id, role: account.role, characterId: account.characterId, pseudo: account.pseudo },
			details: { method: 'discord', scope: 'full' },
			ip: input.ip ?? null,
			userAgent: input.userAgent ?? null
		});
		return {
			sessionToken: session.token,
			scope: 'full' as const,
			expiresAt: session.expiresAt.toISOString(),
			weakPassword: false
		};
	});
}
