// Gardes d'accès des routes (06-contrats §A « Garde d'accès »).
// Ce qui n'est pas autorisé n'est pas rendu : une capacité absente donne 404, jamais une page grisée
// (03-vision §4).
import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import { can, type Actor, type Capability, type Role } from '$lib/server/permissions';
import type { ResetActor } from '$lib/server/domain/accounts';

/** Page de fin de réinitialisation (seule page ouverte à une session `reset`). */
export const RESET_PAGE = '/entrer/nouveau-mot-de-passe';
/** Page d'entrée. */
export const LOGIN_PAGE = '/entrer';

type GuardEvent = Pick<RequestEvent, 'locals' | 'url'>;

function toLogin(event: GuardEvent): never {
	if (event.locals.session?.scope === 'reset') redirect(303, RESET_PAGE);
	const back = event.url.pathname + event.url.search;
	const query =
		back && back !== '/' && back.startsWith('/') && !back.startsWith('//')
			? `?retour=${encodeURIComponent(back)}`
			: '';
	redirect(303, `${LOGIN_PAGE}${query}`);
}

/** Exige un compte connecté (session pleine) ; sinon redirige vers `/entrer`. Renvoie l'acteur. */
export function requireAccount(event: GuardEvent): Actor {
	const actor = event.locals.actor;
	if (!actor) toLogin(event);
	return actor;
}

/**
 * Exige un personnage relié ; un compte en attente de liaison est renvoyé vers `/carnet` (état
 * « en attente de liaison », 03-vision §5.2).
 */
export function requireCharacter(event: GuardEvent): { actor: Actor; characterId: string } {
	const actor = requireAccount(event);
	if (!actor.characterId) redirect(303, '/carnet');
	return { actor, characterId: actor.characterId };
}

/** Exige une capacité ; visiteur ⇒ `/entrer`, compte sans le droit ⇒ 404. Renvoie l'acteur. */
export function requireCapability(event: GuardEvent, capability: Capability): Actor {
	const actor = requireAccount(event);
	if (!can(actor.role, capability)) error(404, { message: 'Page introuvable.', code: 'NOT_FOUND' });
	return actor;
}

/** Première page d'un compte connecté selon son rôle (03-vision §4). */
export function homeFor(role: Role, hasCharacter: boolean): string {
	if (role === 'joueur' || hasCharacter) return '/carnet';
	if (role === 'mj') return '/table';
	if (role === 'designer') return '/atelier/bestiaire';
	return '/registre';
}

/** Page d'entrée : un compte déjà connecté est renvoyé vers son carnet (session `reset` : fin de réinitialisation). */
export function redirectIfConnected(event: GuardEvent): void {
	if (event.locals.session?.scope === 'reset') redirect(303, RESET_PAGE);
	const actor = event.locals.actor;
	if (actor) redirect(303, homeFor(actor.role, !!actor.characterId));
}

/** Exige une session de réinitialisation ; renvoie de quoi appeler `completeForcedReset`. */
export function requireResetSession(event: GuardEvent): ResetActor {
	const { session, account } = event.locals;
	if (!session || !account) redirect(303, LOGIN_PAGE);
	if (session.scope !== 'reset') redirect(303, homeFor(account.role, !!account.characterId));
	return { accountId: account.id, sessionId: session.id };
}
