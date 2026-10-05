import { redirect } from '@sveltejs/kit';
import { action } from '$lib/server/actions';
import { requireAccount } from '$lib/server/guards';
import { getLastPages, openPage, setBookmark, unfoldAll } from '$lib/server/domain/reading';
import { setParticipation } from '$lib/server/domain/events';
import { getSceneContext } from '$lib/server/domain/scenes';
import { composerAttente } from './attente';
import type { Actions, PageServerLoad } from './$types';

// « Dernières pages » (03-vision §5.2 ; 06-contrats §B.4, §C).

/** Où mène vraiment une page du carnet (les faits validés vivent dans une voix du journal). */
function versPage(href: string): string {
	if (href.startsWith('/carnet/journal#faits')) return '/carnet/journal?voix=faits#faits';
	return href;
}

function texte(v: unknown): string {
	return typeof v === 'string' ? v : '';
}

export const load: PageServerLoad = async (event) => {
	const actor = requireAccount(event);
	const brut = Number(event.url.searchParams.get('page') ?? '');
	const page = Number.isInteger(brut) && brut >= 1 && brut <= 10_000 ? brut : undefined;
	const vue = await getLastPages(event.locals.db, actor, { page });
	const contexte = vue.state === 'linked' ? await getSceneContext(event.locals.db, actor) : null;
	return {
		vue: {
			...vue,
			// La Table vue par un joueur se suit dans son carnet, en lecture seule ; le MJ la suit à la Table.
			waiting:
				vue.state === 'staff'
					? vue.waiting
					: composerAttente(vue.waiting, vue.upcoming, new Date(), contexte?.table ?? null).map(
							(w) => (w.kind === 'table' ? { ...w, href: `/carnet/table/${w.id}` } : w)
						),
			since: vue.since.map((l) => ({ ...l, href: versPage(l.href) }))
		}
	};
};

export const actions: Actions = {
	/** Ouvrir une page : la corne se déplie, le signet avance, puis on tourne la page. */
	ouvrir: action(async (event, data) => {
		const actor = requireAccount(event);
		const ouverte = await openPage(event.locals.db, actor, { lineId: texte(data.lineId) });
		redirect(303, versPage(ouverte.href));
	}),
	/** « Déplier toutes les cornes » : le signet se pose à maintenant. */
	deplier: action(async (event) => {
		const actor = requireAccount(event);
		const { lastReadAt } = await unfoldAll(event.locals.db, actor);
		return { deplie: lastReadAt };
	}),
	/** Réécrire ou retirer le marque-page (phrase et lien Discord facultatifs). */
	marquePage: action(async (event, data) => {
		const actor = requireAccount(event);
		const marque = await setBookmark(event.locals.db, actor, {
			text: texte(data.text),
			url: texte(data.url)
		});
		return { marque };
	}),
	/** « Je viens » / « Rayer ma place ». */
	participer: action(async (event, data) => {
		const actor = requireAccount(event);
		const rendezVous = await setParticipation(event.locals.db, actor, {
			eventId: texte(data.eventId),
			participating: texte(data.participating),
			expectedRevision: data.expectedRevision as number
		});
		return { participation: { eventId: rendezVous.id, viens: rendezVous.registered } };
	})
};
