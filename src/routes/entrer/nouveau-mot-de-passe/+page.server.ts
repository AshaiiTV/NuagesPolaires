// Fin de réinitialisation (04-architecture §4, §10.8 ; 06-contrats §C) : seule page ouverte à une
// session `reset`. Le code temporaire a ouvert le carnet une fois ; le nouveau mot de passe le remplace,
// toutes les sessions sont révoquées et une session pleine s'ouvre.
import { redirect } from '@sveltejs/kit';
import { action } from '$lib/server/actions';
import { completeForcedReset, readSession } from '$lib/server/domain/accounts';
import { setSessionCookie } from '$lib/server/auth/session';
import { homeFor, requireResetSession } from '$lib/server/guards';
import { NpError } from '$lib/server/http';
import { MIN_PASSWORD_LENGTH, PASSWORD_TOO_SHORT_MESSAGE } from '$lib/schemas/auth';
import type { Actions, PageServerLoad } from './$types';

const CONFIRMATION_MESSAGE = 'Les deux mots de passe ne sont pas les mêmes.';

export const load: PageServerLoad = async (event) => {
	requireResetSession(event);
	const account = event.locals.account;
	return {
		pseudo: account?.pseudo ?? '',
		// Échéance du code (et de cette session) : au plus une heure.
		echeance: account?.resetExpiresAt ? account.resetExpiresAt.toISOString() : null
	};
};

export const actions: Actions = {
	terminer: action(async (event, data) => {
		const resetActor = requireResetSession(event);
		const next = String(data.next ?? '');
		if (next.length < MIN_PASSWORD_LENGTH) throw new NpError('INVALID_PASSWORD', PASSWORD_TOO_SHORT_MESSAGE, 400);
		if (next !== String(data.passwordConfirm ?? '')) throw new NpError('MISMATCH', CONFIRMATION_MESSAGE, 400);
		const result = await completeForcedReset(event.locals.db, resetActor, { next });
		setSessionCookie(event.cookies, result.sessionToken, new Date(result.expiresAt));
		const lu = await readSession(event.locals.db, result.sessionToken);
		redirect(303, lu ? homeFor(lu.account.role, !!lu.account.characterId) : '/carnet');
	})
};
