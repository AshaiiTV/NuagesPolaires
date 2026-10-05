// Registre › Thèmes (03-vision §5.11, §7) : la galerie des feuillets de thèmes, leurs gestes (donner à
// un compte, donner à tous, retirer, visibilité, distribution) et la création d'un thème : huit
// couleurs, l'encre et l'encre secondaire à 4,5:1 sur la page, sinon le thème n'est pas proposé.
import { requireCapability } from '$lib/server/guards';
import { action } from '$lib/server/actions';
import {
	createTheme,
	grantTheme,
	grantThemeToAll,
	listAccounts,
	listThemes,
	revokeTheme,
	setThemeAutoGrant,
	setThemeVisibility
} from '$lib/server/domain/accounts';
import { ALWAYS_GRANTED_THEME_IDS } from '$lib/server/db/referentials';
import { THEME_TOKEN_KEYS } from '$lib/schemas/accounts';
import { libelleTheme } from '$lib/ui/themes';
import type { Actions, PageServerLoad } from './$types';

const texte = (v: unknown): string => (typeof v === 'string' ? v : '');

export const load: PageServerLoad = async (event) => {
	const actor = requireCapability(event, 'admin.themes');
	const db = event.locals.db;
	const themes = await listThemes(db, actor);
	const comptes = await listAccounts(db, actor);
	return {
		themes: themes.map((t) => ({ ...libelleTheme(t), toujours: ALWAYS_GRANTED_THEME_IDS.includes(t.id) })),
		// Le don est réservé aux joueurs (règle du serveur) : on ne propose qu'eux.
		joueurs: comptes
			.filter((c) => c.role === 'joueur')
			.map((c) => ({ id: c.id, pseudo: c.pseudo, personnage: c.characterName }))
			.sort((a, b) => a.pseudo.localeCompare(b.pseudo, 'fr')),
		releve: new Date().toISOString()
	};
};

export const actions: Actions = {
	donner: action(async (event, data) => {
		const r = await grantTheme(event.locals.db, event.locals.actor, {
			accountId: texte(data.accountId),
			themeId: texte(data.themeId)
		});
		return { geste: { themeId: texte(data.themeId), quoi: r.granted ? 'donne' : 'deja', at: new Date().toISOString() } };
	}),
	retirer: action(async (event, data) => {
		const r = await revokeTheme(event.locals.db, event.locals.actor, {
			accountId: texte(data.accountId),
			themeId: texte(data.themeId)
		});
		return { geste: { themeId: texte(data.themeId), quoi: r.revoked ? 'retire' : 'absent', at: new Date().toISOString() } };
	}),
	tous: action(async (event, data) => {
		const r = await grantThemeToAll(event.locals.db, event.locals.actor, { themeId: texte(data.themeId) });
		return { geste: { themeId: texte(data.themeId), quoi: r.changed > 0 ? 'tous' : 'tous-deja', at: new Date().toISOString() } };
	}),
	visibilite: action(async (event, data) => {
		await setThemeVisibility(event.locals.db, event.locals.actor, {
			themeId: texte(data.themeId),
			visible: texte(data.visible)
		});
		return { geste: { themeId: texte(data.themeId), quoi: 'visibilite', at: new Date().toISOString() } };
	}),
	distribution: action(async (event, data) => {
		await setThemeAutoGrant(event.locals.db, event.locals.actor, {
			themeId: texte(data.themeId),
			enabled: texte(data.enabled)
		});
		return { geste: { themeId: texte(data.themeId), quoi: 'distribution', at: new Date().toISOString() } };
	}),
	creer: action(async (event, data) => {
		const tokens = Object.fromEntries(THEME_TOKEN_KEYS.map((k) => [k, texte(data[k])])) as Record<
			(typeof THEME_TOKEN_KEYS)[number],
			string
		>;
		const theme = await createTheme(event.locals.db, event.locals.actor, {
			id: texte(data.id),
			name: texte(data.name),
			description: texte(data.description),
			tokens
		});
		return { cree: { id: theme.id, name: theme.name, par: event.locals.actor?.pseudo ?? '', at: new Date().toISOString() } };
	})
};
