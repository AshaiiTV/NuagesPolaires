// Retour de Discord (04-architecture §4 ; 03-vision §12.6) : GET. Compte connecté ⇒ liaison
// (`discordCallback`) ; visiteur ⇒ connexion par `discord_id` (`discordLogin`). Le cookie d'état est
// effacé dès le retour (usage unique). Discord désactivé ⇒ 404. Les refus reviennent en code court
// dans l'adresse (jamais de donnée personnelle) et la page dit ce qui n'a pas été fait.
import { error, redirect } from '@sveltejs/kit';
import {
	discordCallback,
	discordLogin,
	isDiscordEnabled,
	readSession
} from '$lib/server/domain/accounts';
import { DISCORD_STATE_COOKIE } from '$lib/server/auth/discord';
import { setSessionCookie } from '$lib/server/auth/session';
import { homeFor } from '$lib/server/guards';
import { isNpError } from '$lib/server/http';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	if (!isDiscordEnabled()) error(404, { message: 'Page introuvable.', code: 'NOT_FOUND' });
	const { url, cookies, locals } = event;
	const cookieValue = cookies.get(DISCORD_STATE_COOKIE);
	cookies.delete(DISCORD_STATE_COOKIE, { path: '/' });

	const actor = locals.actor;
	const depart = actor ? '/compte' : '/entrer';
	const code = url.searchParams.get('code') ?? '';
	const state = url.searchParams.get('state') ?? '';
	// Refus ou abandon côté Discord : rien n'a changé.
	if (url.searchParams.has('error') || !code || !state) redirect(303, `${depart}?discord=annule${actor ? '#discord' : ''}`);

	let destination: string;
	try {
		if (actor) {
			await discordCallback(locals.db, actor, { code, state, cookieValue }, { fetch });
			destination = '/compte?discord=lie#discord';
		} else {
			const result = await discordLogin(
				locals.db,
				{
					code,
					state,
					cookieValue,
					ip: event.getClientAddress(),
					userAgent: event.request.headers.get('user-agent') ?? ''
				},
				{ fetch }
			);
			setSessionCookie(cookies, result.sessionToken, new Date(result.expiresAt));
			const lu = await readSession(locals.db, result.sessionToken);
			destination = lu ? homeFor(lu.account.role, !!lu.account.characterId) : '/carnet';
		}
	} catch (e) {
		if (!isNpError(e)) throw e;
		destination = `${depart}?discord=${encodeURIComponent(e.code)}${actor ? '#discord' : ''}`;
	}
	redirect(303, destination);
};
