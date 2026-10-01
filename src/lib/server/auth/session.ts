// Sessions opaques (04-architecture §3.1, §4, amendement §10.8 ; revue GPT B7).
//
// - Jeton : 32 octets aléatoires base64url, porté par le cookie `np_session` (HttpOnly ; Secure hors
//   développement ; SameSite=Lax pour le retour OAuth ; Path=/). Le jeton n'est JAMAIS stocké :
//   `sessions.id` = HMAC-SHA-256(NP_SESSION_SECRET, jeton), en hex.
// - Portée `full` : 30 jours. Portée `reset` : expiration = min(reset_expires_at, now + 1 h).
// - Une session est valide si elle n'a pas expiré, si `sessions.session_version` = celle du compte,
//   et si l'état de réinitialisation du compte concorde avec sa portée (vérifié à CHAQUE lecture :
//   `force_password_reset` + `reset_expires_at`).
// - Révocation : incrément de `accounts.session_version` (déconnexion de tous les appareils) et
//   suppression des lignes de session.
import { createHmac, randomBytes } from 'node:crypto';
import { and, eq, lt, sql } from 'drizzle-orm';
import type { Db, Tx } from '$lib/server/db';
import { isProductionEnv } from '$lib/server/db';
import {
	accounts,
	characters,
	sessions,
	type Account,
	type Character,
	type Session,
	type SessionScope
} from '$lib/server/db/schema';

export const SESSION_COOKIE = 'np_session';
/** Portée pleine : 30 jours (04 §3.1). */
export const FULL_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
/** Portée réinitialisation : 1 h au plus (04 §10.8). */
export const RESET_SESSION_MS = 60 * 60 * 1000;
/** `last_used_at` et `last_seen_at` ne sont réécrits qu'au-delà de ce délai (pas d'écriture par requête). */
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

type Env = Record<string, string | undefined>;

/** Secret HMAC des sessions : NP_SESSION_SECRET, 32 caractères au moins, sinon erreur explicite. */
export function sessionSecret(env: Env = process.env): string {
	const secret = env.NP_SESSION_SECRET ?? '';
	if (secret.length < 32) {
		throw new Error(
			'NP_SESSION_SECRET manquant ou trop court : 32 caractères aléatoires au minimum sont exigés.'
		);
	}
	return secret;
}

/** Nouveau jeton opaque : 32 octets aléatoires en base64url (43 caractères). */
export function newSessionToken(): string {
	return randomBytes(32).toString('base64url');
}

/** Identifiant stocké d'un jeton : HMAC-SHA-256(NP_SESSION_SECRET, jeton), hex. */
export function sessionIdFor(token: string, env: Env = process.env): string {
	return createHmac('sha256', sessionSecret(env)).update(token, 'utf8').digest('hex');
}

/** Forme attendue d'un jeton (refus immédiat d'un cookie fantaisiste, sans requête). */
export function isWellFormedToken(token: unknown): token is string {
	return typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token);
}

export interface CreateSessionInput {
	accountId: string;
	scope: SessionScope;
	/** Copie de `accounts.session_version` au moment de la création. */
	sessionVersion: number;
	/** Échéance du secret de réinitialisation (portée `reset` uniquement). */
	resetExpiresAt?: Date | null;
	ip?: string | null;
	userAgent?: string | null;
	now?: Date;
}

export interface CreatedSession {
	token: string;
	id: string;
	scope: SessionScope;
	expiresAt: Date;
}

/** Échéance d'une session selon sa portée (04 §3.1, §10.8). */
export function sessionExpiry(scope: SessionScope, now: Date, resetExpiresAt?: Date | null): Date {
	if (scope === 'full') return new Date(now.getTime() + FULL_SESSION_MS);
	const cap = now.getTime() + RESET_SESSION_MS;
	const reset = resetExpiresAt ? resetExpiresAt.getTime() : cap;
	return new Date(Math.min(cap, reset));
}

/** Crée une session (à appeler dans la transaction qui l'autorise). */
export async function createSession(db: Db | Tx, input: CreateSessionInput): Promise<CreatedSession> {
	const now = input.now ?? new Date();
	const expiresAt = sessionExpiry(input.scope, now, input.resetExpiresAt);
	if (expiresAt.getTime() <= now.getTime()) {
		throw new Error('createSession : échéance déjà passée.');
	}
	const token = newSessionToken();
	const id = sessionIdFor(token);
	await db.insert(sessions).values({
		id,
		accountId: input.accountId,
		scope: input.scope,
		sessionVersion: input.sessionVersion,
		createdAt: now,
		expiresAt,
		lastUsedAt: now,
		ip: (input.ip ?? '').slice(0, 64),
		userAgent: (input.userAgent ?? '').slice(0, 240)
	});
	return { token, id, scope: input.scope, expiresAt };
}

export interface SessionRead {
	session: Session;
	account: Account;
	/** Personnage relié (portée `full` uniquement), ou `null`. */
	character: Character | null;
}

/**
 * Vrai si l'état de réinitialisation du compte autorise cette portée : une session `reset` exige une
 * réinitialisation en cours et non échue ; une session `full` exige qu'aucune ne soit en cours.
 */
export function scopeMatchesAccount(scope: SessionScope, account: Account, now: Date): boolean {
	const resetOpen =
		account.forcePasswordReset &&
		account.resetExpiresAt !== null &&
		account.resetExpiresAt.getTime() > now.getTime();
	if (scope === 'reset') return resetOpen;
	return !account.forcePasswordReset;
}

/**
 * Lit et valide une session à partir du jeton du cookie (06 §B.1 `readSession`). `null` si le jeton
 * est absent, malformé, inconnu, expiré, révoqué ou incompatible avec l'état du compte.
 */
export async function readSession(
	db: Db | Tx,
	token: string | null | undefined,
	options: { now?: Date } = {}
): Promise<SessionRead | null> {
	if (!isWellFormedToken(token)) return null;
	const now = options.now ?? new Date();
	const id = sessionIdFor(token);
	const [row] = await db
		.select({ session: sessions, account: accounts })
		.from(sessions)
		.innerJoin(accounts, eq(accounts.id, sessions.accountId))
		.where(eq(sessions.id, id));
	if (!row) return null;
	const { session, account } = row;
	if (session.expiresAt.getTime() <= now.getTime()) return null;
	if (session.sessionVersion !== account.sessionVersion) return null;
	if (!scopeMatchesAccount(session.scope, account, now)) return null;

	let character: Character | null = null;
	if (session.scope === 'full' && account.characterId) {
		const [c] = await db.select().from(characters).where(eq(characters.id, account.characterId));
		character = c ?? null;
	}

	// Traces d'usage, au plus toutes les 5 minutes ; n'incrémentent jamais la révision (04 §10.13).
	const stale = (d: Date | null) => !d || now.getTime() - d.getTime() > TOUCH_INTERVAL_MS;
	if (stale(session.lastUsedAt)) {
		await db.update(sessions).set({ lastUsedAt: now }).where(eq(sessions.id, session.id));
		session.lastUsedAt = now;
	}
	if (session.scope === 'full' && stale(account.lastSeenAt)) {
		await db
			.update(accounts)
			.set({ lastSeenAt: now, updatedAt: sql`${accounts.updatedAt}` })
			.where(eq(accounts.id, account.id));
		account.lastSeenAt = now;
	}
	return { session, account, character };
}

/** Supprime une session précise (sans révoquer les autres). */
export async function deleteSession(db: Db | Tx, sessionId: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}

/**
 * Révoque toutes les sessions d'un compte : incrémente `session_version` et supprime les lignes.
 * Renvoie la nouvelle `session_version` (ou `null` si le compte n'existe pas).
 */
export async function revokeAllSessions(db: Db | Tx, accountId: string): Promise<number | null> {
	const [row] = await db
		.update(accounts)
		.set({ sessionVersion: sql`${accounts.sessionVersion} + 1` })
		.where(eq(accounts.id, accountId))
		.returning({ sessionVersion: accounts.sessionVersion });
	await db.delete(sessions).where(eq(sessions.accountId, accountId));
	return row?.sessionVersion ?? null;
}

/** Entretien : supprime les sessions expirées (04 §10.16). Renvoie le nombre supprimé. */
export async function purgeExpiredSessions(db: Db | Tx, now: Date = new Date()): Promise<number> {
	const rows = await db
		.delete(sessions)
		.where(lt(sessions.expiresAt, now))
		.returning({ id: sessions.id });
	return rows.length;
}

/** Sessions ouvertes d'un compte (diagnostic, tests). */
export async function countSessions(db: Db | Tx, accountId: string, scope?: SessionScope): Promise<number> {
	const rows = await db
		.select({ id: sessions.id })
		.from(sessions)
		.where(scope ? and(eq(sessions.accountId, accountId), eq(sessions.scope, scope)) : eq(sessions.accountId, accountId));
	return rows.length;
}

// ---------------------------------------------------------------------------
// Cookie `np_session`
// ---------------------------------------------------------------------------

export interface SessionCookieOptions {
	path: '/';
	httpOnly: true;
	secure: boolean;
	sameSite: 'lax';
	maxAge: number;
}

/** Cookie sécurisé hors développement : production, ou site servi en https. */
export function cookieShouldBeSecure(env: Env = process.env): boolean {
	return isProductionEnv(env) || (env.NP_SITE_URL ?? '').trim().toLowerCase().startsWith('https://');
}

/** Options du cookie de session (04 §3.1 : HttpOnly ; Secure hors dev ; SameSite=Lax ; Path=/). */
export function sessionCookieOptions(
	expiresAt: Date,
	options: { secure?: boolean; now?: Date } = {}
): SessionCookieOptions {
	const now = options.now ?? new Date();
	return {
		path: '/',
		httpOnly: true,
		secure: options.secure ?? cookieShouldBeSecure(),
		sameSite: 'lax',
		maxAge: Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))
	};
}

/** Interface minimale des cookies SvelteKit utilisée ici. */
export interface CookieJar {
	get(name: string): string | undefined;
	set(name: string, value: string, opts: SessionCookieOptions): void;
	delete(name: string, opts: { path: string; secure?: boolean; httpOnly?: boolean; sameSite?: 'lax' }): void;
}

/** Pose le cookie de session. */
export function setSessionCookie(cookies: CookieJar, token: string, expiresAt: Date, secure?: boolean): void {
	cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt, { secure }));
}

/** Efface le cookie de session. */
export function clearSessionCookie(cookies: CookieJar, secure?: boolean): void {
	cookies.delete(SESSION_COOKIE, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: secure ?? cookieShouldBeSecure()
	});
}
