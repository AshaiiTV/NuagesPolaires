// Mon compte (03-vision §4 « portrait », §5.2 compte en attente, §8 micro-textes 18 et 20 ;
// 06-contrats §C `/compte`). Lecture : `getOwnAccount`, le thème porté (`listThemes`) ; écritures :
// mot de passe, Discord, quitter le carnet, fermer le compte.
import { redirect } from '@sveltejs/kit';
import { action } from '$lib/server/actions';
import {
	changeOwnPassword,
	deleteOwnAccount,
	discordAuthUrl,
	discordUnlink,
	getOwnAccount,
	isDiscordEnabled,
	listThemes,
	logout
} from '$lib/server/domain/accounts';
import {
	SESSION_COOKIE,
	clearSessionCookie,
	cookieShouldBeSecure,
	setSessionCookie
} from '$lib/server/auth/session';
import { getOwnSheet } from '$lib/server/domain/characters';
import { requireAccount } from '$lib/server/guards';
import { NpError } from '$lib/server/http';
import { MIN_PASSWORD_LENGTH, PASSWORD_TOO_SHORT_MESSAGE } from '$lib/schemas/auth';
import type { Actions, PageServerLoad } from './$types';

const CONFIRMATION_MESSAGE = 'Les deux mots de passe ne sont pas les mêmes.';

/** Retours de Discord (codes courts dans l'adresse ; la page écrit la phrase). */
const DISCORD_RETOUR: Record<string, { ton: 'fait' | 'refus'; texte: string }> = {
	lie: { ton: 'fait', texte: 'Discord est lié à ton compte. Tu peux entrer d’un geste.' },
	annule: { ton: 'refus', texte: 'La liaison Discord a été interrompue. Rien n’a changé.' },
	DISCORD_STATE: { ton: 'refus', texte: 'La liaison Discord a expiré ou a déjà servi. Recommence.' },
	DISCORD_FAILED: { ton: 'refus', texte: 'Discord n’a pas confirmé la liaison. Réessaie.' },
	DISCORD_TAKEN: { ton: 'refus', texte: 'Ce compte Discord est déjà lié à un autre compte du carnet.' }
};

export const load: PageServerLoad = async (event) => {
	const actor = requireAccount(event);
	const { db } = event.locals;
	const compte = await getOwnAccount(db, actor);
	// Le thème porté : son nom suffit ici, la galerie vit dans Ma collection.
	const themes = await listThemes(db, actor);
	const porte = themes.find((t) => t.active) ?? themes.find((t) => t.id === 'dark') ?? null;
	// Le personnage relié, en une ligne (Serment · rang · niveau) ; une fiche qui ne s'ouvre pas
	// n'empêche pas d'ouvrir le compte.
	let personnage: { name: string; portraitUrl: string | null; oath: string; rank: string; level: number } | null = null;
	if (compte.characterId) {
		try {
			const sheet = await getOwnSheet(db, actor);
			if (sheet) {
				personnage = {
					name: sheet.name,
					portraitUrl: sheet.portraitUrl || null,
					oath: sheet.oath.name,
					rank: sheet.oath.rankLabel,
					level: sheet.level
				};
			}
		} catch {
			personnage = null;
		}
	}
	const discordActif = isDiscordEnabled();
	const retour = event.url.searchParams.get('discord');
	return {
		// `compte` est déjà la navigation du layout (CompteNav) : la vue du compte s'appelle `moi`.
		moi: compte,
		personnage,
		themePorte: porte ? { name: porte.name, tone: porte.tone } : null,
		discordActif,
		discordRetour: discordActif && retour ? (DISCORD_RETOUR[retour] ?? DISCORD_RETOUR.DISCORD_FAILED) : null,
		motDePasseCourt: event.url.searchParams.get('mot-de-passe') === 'court'
	};
};

export const actions: Actions = {
	motDePasse: action(async (event, data) => {
		const actor = requireAccount(event);
		const next = String(data.next ?? '');
		if (next.length < MIN_PASSWORD_LENGTH) throw new NpError('INVALID_PASSWORD', PASSWORD_TOO_SHORT_MESSAGE, 400);
		if (next !== String(data.passwordConfirm ?? '')) throw new NpError('MISMATCH', CONFIRMATION_MESSAGE, 400);
		const result = await changeOwnPassword(event.locals.db, actor, { current: String(data.current ?? ''), next });
		// Toutes les sessions sont révoquées : celle-ci est remplacée par la nouvelle.
		setSessionCookie(event.cookies, result.sessionToken, new Date(result.expiresAt));
		return { geste: 'motDePasse' as const };
	}),

	// Lier (départ vers Discord, formulaire classique) ou délier (écriture sur place).
	discord: action(async (event, data) => {
		const actor = requireAccount(event);
		if (!isDiscordEnabled()) throw NpError.notFound('La connexion Discord n’est pas activée sur ce carnet.');
		if (data.geste === 'delier') {
			await discordUnlink(event.locals.db, actor);
			return { geste: 'discord' as const };
		}
		const depart = discordAuthUrl(actor);
		event.cookies.set(depart.cookieName, depart.cookieValue, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: cookieShouldBeSecure(),
			maxAge: depart.maxAge
		});
		redirect(303, depart.url);
	}),

	quitter: action(async (event) => {
		await logout(event.locals.db, event.cookies.get(SESSION_COOKIE));
		clearSessionCookie(event.cookies);
		redirect(303, '/');
	}),

	fermer: action(async (event, data) => {
		const actor = requireAccount(event);
		await deleteOwnAccount(event.locals.db, actor, { password: String(data.password ?? '') });
		clearSessionCookie(event.cookies);
		redirect(303, '/');
	})
};
