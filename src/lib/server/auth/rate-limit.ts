// Limitation des tentatives d'authentification (04-architecture §3.1 ; audit 05 §4.3).
//
// Table `auth_rate_limits (scope, subject)` : 10 tentatives par fenêtre de 15 minutes, pour chacun
// des compteurs `ip:<adresse>`, `login:<pseudo minuscule>`, `register:<pseudo minuscule>`.
// Incrémentation ATOMIQUE (un seul `INSERT … ON CONFLICT DO UPDATE … RETURNING`), hors de toute
// transaction métier : une tentative refusée reste comptée. L'exception admin de l'ancien code
// (legacy auth.js:643-652) est SUPPRIMÉE (04 §3.1).
import { and, eq, lt, sql } from 'drizzle-orm';
import type { Db, Tx } from '$lib/server/db';
import { authRateLimits } from '$lib/server/db/schema';
import { NpError } from '$lib/server/http';

export const RATE_LIMIT_MAX = 10;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
/** Message exact (audit 05 §4.3). */
export const RATE_LIMITED_MESSAGE = 'Trop de tentatives. Réessaie dans 15 minutes.';

export type RateLimitScope = 'ip' | 'login' | 'register';

export interface RateLimitKey {
	scope: RateLimitScope;
	subject: string;
}

/** Normalise le sujet d'un compteur : pseudo en minuscules, adresse vide ⇒ `unknown`. */
export function rateLimitKey(scope: RateLimitScope, subject: string | null | undefined): RateLimitKey {
	const raw = (subject ?? '').trim();
	const normalized = scope === 'ip' ? raw || 'unknown' : raw.toLowerCase();
	return { scope, subject: normalized.slice(0, 128) };
}

/**
 * Compte une tentative sur chaque compteur et renvoie le nombre de tentatives de la fenêtre courante
 * (une fenêtre échue repart à 1). Atomique par compteur.
 */
export async function hitRateLimit(
	db: Db | Tx,
	key: RateLimitKey,
	now: Date = new Date()
): Promise<number> {
	const windowStartLimit = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);
	const expired = sql`${authRateLimits.windowStart} <= ${windowStartLimit.toISOString()}::timestamptz`;
	const [row] = await db
		.insert(authRateLimits)
		.values({ scope: key.scope, subject: key.subject, count: 1, windowStart: now })
		.onConflictDoUpdate({
			target: [authRateLimits.scope, authRateLimits.subject],
			set: {
				count: sql`CASE WHEN ${expired} THEN 1 ELSE ${authRateLimits.count} + 1 END`,
				windowStart: sql`CASE WHEN ${expired} THEN ${now.toISOString()}::timestamptz ELSE ${authRateLimits.windowStart} END`,
				updatedAt: now
			}
		})
		.returning({ count: authRateLimits.count });
	return row?.count ?? 1;
}

/**
 * Compte une tentative sur chaque clé ; si l'une dépasse 10 dans sa fenêtre, lève 429 RATE_LIMITED.
 * Renvoie la clé fautive pour l'audit (via l'erreur) — l'appelant journalise `*_rate_limited`.
 */
export async function consumeRateLimit(
	db: Db | Tx,
	keys: readonly RateLimitKey[],
	now: Date = new Date()
): Promise<void> {
	let exceeded = false;
	for (const key of keys) {
		const count = await hitRateLimit(db, key, now);
		if (count > RATE_LIMIT_MAX) exceeded = true;
	}
	if (exceeded) throw new NpError('RATE_LIMITED', RATE_LIMITED_MESSAGE, 429);
}

/** Remet un compteur à zéro (connexion réussie). */
export async function resetRateLimit(db: Db | Tx, key: RateLimitKey): Promise<void> {
	await db
		.delete(authRateLimits)
		.where(and(eq(authRateLimits.scope, key.scope), eq(authRateLimits.subject, key.subject)));
}

/** Entretien : supprime les compteurs dont la fenêtre est échue (04 §10.16). */
export async function purgeRateLimits(db: Db | Tx, now: Date = new Date()): Promise<number> {
	const rows = await db
		.delete(authRateLimits)
		.where(lt(authRateLimits.windowStart, new Date(now.getTime() - RATE_LIMIT_WINDOW_MS)))
		.returning({ scope: authRateLimits.scope });
	return rows.length;
}
