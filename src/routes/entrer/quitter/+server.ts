// Quitter le carnet (03-vision §4) : POST seulement. Révoque les sessions du compte (tous les
// appareils), efface le cookie et rouvre l'accueil. Ouvert aussi à une session de réinitialisation
// (RESET_ALLOWED_PATHS) ; rejoué ou sans session, il ne fait qu'effacer le cookie.
import { redirect } from '@sveltejs/kit';
import { logout } from '$lib/server/domain/accounts';
import { SESSION_COOKIE, clearSessionCookie } from '$lib/server/auth/session';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => redirect(303, '/compte');

export const POST: RequestHandler = async ({ locals, cookies }) => {
	await logout(locals.db, cookies.get(SESSION_COOKIE));
	clearSessionCookie(cookies);
	redirect(303, '/');
};
