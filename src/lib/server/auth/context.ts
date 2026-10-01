// Contexte de requête attaché à un acteur (04-architecture §10.7 : « toute mutation sensible relit le
// compte et la session dans la transaction ; session révoquée entre-temps ⇒ 401 »).
//
// Le type `Actor` du contrat (06 §A) ne porte ni la session ni l'adresse : `hooks.server.ts` associe
// donc à l'objet acteur, dans une WeakMap, la session et l'origine de la requête. Les domaines s'en
// servent pour revérifier la session sous verrou (`assertFreshAccount`) et pour l'audit (ip, agent).
// Un acteur construit à la main (tests, scripts) n'a pas de contexte : seules les vérifications sur
// le compte s'appliquent.
import { and, eq } from 'drizzle-orm';
import type { Db, Tx } from '$lib/server/db';
import { accounts, characters, sessions, type Account } from '$lib/server/db/schema';
import { scopeMatchesAccount } from './session';
import { NpError } from '$lib/server/http';
import type { Actor } from '$lib/server/permissions';

export interface RequestContext {
	ip: string;
	userAgent: string;
	origin: string;
	/** Empreinte de la session de la requête (`sessions.id`), si elle existe. */
	sessionId: string | null;
	/** `session_version` de la session au moment de la lecture. */
	sessionVersion: number | null;
}

const contexts = new WeakMap<Actor, RequestContext>();

/** Associe le contexte de la requête à l'acteur construit par le hook. */
export function bindRequestContext(actor: Actor, context: RequestContext): void {
	contexts.set(actor, context);
}

/** Contexte de la requête de cet acteur, ou `null` (acteur construit hors requête). */
export function requestContextOf(actor: Actor | null | undefined): RequestContext | null {
	return actor ? (contexts.get(actor) ?? null) : null;
}

/** Champs d'audit (ip, origine, agent) de l'acteur. */
export function auditContextOf(actor: Actor | null | undefined): {
	ip: string | null;
	origin: string | null;
	userAgent: string | null;
} {
	const ctx = requestContextOf(actor);
	return { ip: ctx?.ip ?? null, origin: ctx?.origin ?? null, userAgent: ctx?.userAgent ?? null };
}

/** Message officiel de session refermée (03-vision §8, micro-texte 20). */
export const SESSION_CLOSED_MESSAGE = 'Le carnet s’est refermé. Rouvre-le en te reconnectant.';

/**
 * Relit le compte de l'acteur SOUS VERROU (`SELECT … FOR UPDATE`) dans la transaction et vérifie
 * qu'il existe toujours, que son rôle n'a pas changé, et — si la requête porte une session — que
 * celle-ci n'a pas été révoquée entre-temps. Sinon 401. Renvoie la ligne du compte.
 */
export async function assertFreshAccount(
	tx: Db | Tx,
	actor: Actor,
	/** Ligne du compte déjà verrouillée par l'appelant (verrous pris dans l'ordre des identifiants). */
	locked?: Account | null
): Promise<Account> {
	const account =
		locked !== undefined
			? locked
			: (await tx.select().from(accounts).where(eq(accounts.id, actor.accountId)).for('update'))[0];
	if (!account || account.id !== actor.accountId || account.role !== actor.role) {
		throw NpError.unauthenticated(SESSION_CLOSED_MESSAGE);
	}
	const ctx = requestContextOf(actor);
	if (ctx?.sessionVersion != null && ctx.sessionVersion !== account.sessionVersion) {
		throw NpError.unauthenticated(SESSION_CLOSED_MESSAGE);
	}
	if (ctx?.sessionId) {
		const [session] = await tx
			.select()
			.from(sessions)
			.where(and(eq(sessions.id, ctx.sessionId), eq(sessions.accountId, account.id)))
			.for('share');
		if (
			!session ||
			session.expiresAt.getTime() <= Date.now() ||
			session.sessionVersion !== account.sessionVersion ||
			session.scope !== 'full' ||
			!scopeMatchesAccount(session.scope, account, new Date())
		) {
			throw NpError.unauthenticated(SESSION_CLOSED_MESSAGE);
		}
	}
	if (!scopeMatchesAccount('full', account, new Date()))
		throw NpError.unauthenticated(SESSION_CLOSED_MESSAGE);
	if (account.characterId !== actor.characterId)
		throw NpError.forbidden('La liaison de ton personnage a changé. Reconnecte-toi.');
	return account;
}
