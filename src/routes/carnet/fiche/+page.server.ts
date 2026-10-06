import { fail } from '@sveltejs/kit';
import { action } from '$lib/server/actions';
import { requireCharacter } from '$lib/server/guards';
import {
	consumeOwnItem,
	getOwnSheet,
	listConsequences,
	setOwnPortrait
} from '$lib/server/domain/characters';
import {
	cancelDeclaration,
	listOwnPending,
	strikeOwnDeclaration
} from '$lib/server/domain/declarations';
import { CONSEQUENCE_FILTERS, type ConsequenceFilter } from '$lib/schemas/characters';
import type { Actions, PageServerLoad } from './$types';

// Ma fiche (03-vision §5.4 ; 06-contrats §B.2, §B.3, §C).
// Un compte en attente de liaison est renvoyé vers Dernières pages, qui dit la phrase de §5.2.

function texte(v: unknown): string {
	return typeof v === 'string' ? v : '';
}

function filtreDe(brut: string | null): ConsequenceFilter | undefined {
	return CONSEQUENCE_FILTERS.find((f) => f === brut);
}

export const load: PageServerLoad = async (event) => {
	const { actor } = requireCharacter(event);
	const db = event.locals.db;
	const filtre = filtreDe(event.url.searchParams.get('filtre'));
	const brut = Number(event.url.searchParams.get('page') ?? '');
	const page = Number.isInteger(brut) && brut >= 1 && brut <= 10_000 ? brut : 1;

	const fiche = await getOwnSheet(db, actor);
	if (!fiche) return { fiche: null, consequences: null, declarations: [], filtre: filtre ?? null };

	// Toutes les lectures sont attendues avant de répondre : la base de la requête se ferme ensuite.
	const [consequences, declarations] = await Promise.all([
		listConsequences(db, actor, { filter: filtre, page }),
		listOwnPending(db, actor)
	]);
	return { fiche, consequences, declarations, filtre: filtre ?? null };
};

export const actions: Actions = {
	/** Changer de portrait : un lien d'image, ou rien pour revenir à l'initiale. */
	portrait: action(async (event, data) => {
		const { actor } = requireCharacter(event);
		const url = texte(data.url).trim();
		if (url && !URL.canParse(url))
			return fail(400, {
				message: 'Ce lien ne mène pas à une image http(s). Ton portrait n’a pas changé.'
			});
		if (url && !['http:', 'https:'].includes(new URL(url).protocol))
			return fail(400, {
				message: 'Ce lien ne mène pas à une image http(s). Ton portrait n’a pas changé.'
			});
		const fiche = await setOwnPortrait(event.locals.db, actor, {
			url: texte(data.url),
			expectedRevision: data.expectedRevision as number
		});
		return { portrait: fiche.portraitUrl };
	}),
	/** « Tu déclares avoir utilisé … ? Oui, je le note. » : −1 et une trace signée « toi ». */
	consommer: action(async (event, data) => {
		const { actor } = requireCharacter(event);
		const note = texte(data.note).trim();
		await consumeOwnItem(event.locals.db, actor, {
			itemId: texte(data.itemId),
			...(note ? { note } : {}),
			expectedRevision: data.expectedRevision as number
		});
		return { consomme: texte(data.itemId) };
	}),
	/** Annuler une déclaration dans ses dix secondes : la ligne rayée reste. */
	annuler: action(async (event, data) => {
		const { actor } = requireCharacter(event);
		const d = await cancelDeclaration(event.locals.db, actor, { id: texte(data.id) });
		return { declaration: d.id };
	}),
	/** Rayer une déclaration après ses dix secondes : la rature reste lisible, datée. */
	rayer: action(async (event, data) => {
		const { actor } = requireCharacter(event);
		const d = await strikeOwnDeclaration(event.locals.db, actor, { id: texte(data.id) });
		return { declaration: d.id };
	})
};
