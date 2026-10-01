import { redirect } from '@sveltejs/kit';
import { action } from '$lib/server/actions';
import { login } from '$lib/server/domain/accounts';
import { setSessionCookie } from '$lib/server/auth/session';
import { redirectIfConnected, RESET_PAGE } from '$lib/server/guards';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	// Un compte déjà connecté est renvoyé vers son cahier (carnet, Table, Atelier ou Registre).
	redirectIfConnected(event);
	return {};
};

export const actions: Actions = {
	entrer: action(async (event, data) => {
		const result = await login(event.locals.db, {
			pseudo: String(data.pseudo ?? ''),
			password: String(data.password ?? ''),
			ip: event.getClientAddress(),
			userAgent: event.request.headers.get('user-agent') ?? ''
		});
		setSessionCookie(event.cookies, result.sessionToken, new Date(result.expiresAt));
		// La session vient d'être posée : la page d'entrée redirige elle-même vers le bon cahier.
		redirect(303, result.scope === 'reset' ? RESET_PAGE : '/entrer');
	})
};
