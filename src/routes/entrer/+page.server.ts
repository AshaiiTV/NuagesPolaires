import { safeLoginReturn } from '$lib/server/auth/redirect';
// Entrer (03-vision §4, P6 ; 06-contrats §C `/entrer`) : connexion par pseudo et mot de passe, ou par
// Discord quand il est activé. Un compte déjà connecté est renvoyé vers son cahier.
import { redirect } from '@sveltejs/kit';
import { action } from '$lib/server/actions';
import { discordAuthUrl, isDiscordEnabled, login, readSession } from '$lib/server/domain/accounts';
import { cookieShouldBeSecure, setSessionCookie } from '$lib/server/auth/session';
import { homeFor, redirectIfConnected, RESET_PAGE } from '$lib/server/guards';
import type { Actions, PageServerLoad } from './$types';

/** Retour après connexion : un chemin interne seulement, jamais une autre origine ni l'entrée elle-même. */

/** Retours possibles de la connexion Discord (codes seulement, jamais de donnée personnelle). */
const DISCORD_REFUS: Record<string, string> = {
	annule: 'La connexion Discord a été interrompue. Rien n’a changé.',
	DISCORD_STATE: 'La connexion Discord a expiré ou a déjà servi. Recommence depuis cette page.',
	DISCORD_FAILED: 'Discord n’a pas confirmé la connexion. Réessaie.',
	UNAUTHENTICATED:
		'Aucun compte du carnet n’est lié à ce compte Discord. Entre avec ton pseudo, puis lie Discord depuis Mon compte.'
};

export const load: PageServerLoad = async (event) => {
	// Un compte déjà connecté est renvoyé vers son cahier (carnet, Table, Atelier ou Registre).
	redirectIfConnected(event);
	const discord = event.url.searchParams.get('discord');
	return {
		discordActif: isDiscordEnabled(),
		retour: safeLoginReturn(event.url.searchParams.get('retour'), event.url.origin),
		discordRefus: discord ? (DISCORD_REFUS[discord] ?? DISCORD_REFUS.DISCORD_FAILED) : null
	};
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
		// Réinitialisation en cours : le code temporaire n'ouvre que la page du nouveau mot de passe.
		if (result.scope === 'reset') redirect(303, RESET_PAGE);
		// Ancien mot de passe de moins de 8 caractères : Mon compte invite à le changer (04 §4).
		if (result.weakPassword) redirect(303, '/compte?mot-de-passe=court#mot-de-passe');
		const retour = safeLoginReturn(data.retour, event.url.origin);
		if (retour) redirect(303, retour);
		const lu = await readSession(event.locals.db, result.sessionToken);
		redirect(303, lu ? homeFor(lu.account.role, !!lu.account.characterId) : '/carnet');
	}),

	// Entrer avec Discord : formulaire classique (sans enhance), la page part vers Discord.
	discord: action(async (event) => {
		const depart = discordAuthUrl(null);
		event.cookies.set(depart.cookieName, depart.cookieValue, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: cookieShouldBeSecure(),
			maxAge: depart.maxAge
		});
		redirect(303, depart.url);
	})
};
