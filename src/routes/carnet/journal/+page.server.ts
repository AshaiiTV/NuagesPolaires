import { action } from '$lib/server/actions';
import { requireCharacter } from '$lib/server/guards';
import { amendEntry, listEntries, strikeEntry, writeEntry } from '$lib/server/domain/journal';
import { listFacts, proposeFact } from '$lib/server/domain/facts';
import { listRecits } from '$lib/server/domain/combats';
import { FACT_KINDS, type FactKindKey } from '$lib/schemas/facts';
import type { Actions, PageServerLoad } from './$types';

// Mon journal — trois voix (03-vision §5.5 ; 06-contrats §B.3, §B.6, §C).
// Un compte en attente de liaison n'a pas de journal : il est renvoyé vers Dernières pages.

type Voix = 'notes' | 'recits' | 'faits';
const VOIX: Voix[] = ['notes', 'recits', 'faits'];

function texte(v: unknown): string {
	return typeof v === 'string' ? v : '';
}
function entier(brut: string | null, defaut: number | undefined): number | undefined {
	const n = Number(brut ?? '');
	return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n : defaut;
}

export const load: PageServerLoad = async (event) => {
	const { actor } = requireCharacter(event);
	const db = event.locals.db;
	const params = event.url.searchParams;
	const voix = VOIX.find((v) => v === params.get('voix')) ?? 'notes';
	// Sans numéro de page, le journal s'ouvre sur sa dernière page : on écrit sous la dernière ligne.
	const page = entier(params.get('page'), undefined);
	const pageRecits = entier(params.get('recits'), 1) ?? 1;

	// Toutes les lectures sont attendues : la base de la requête se ferme dès la réponse.
	const [notes, faits, recits] = await Promise.all([
		listEntries(db, actor, { page: voix === 'notes' ? page : undefined }),
		listFacts(db, actor),
		listRecits(db, actor, { page: pageRecits })
	]);
	return { voix, notes, faits, recits, pageRecits };
};

export const actions: Actions = {
	/** Écrire sous la dernière ligne. */
	noter: action(async (event, data) => {
		const { actor } = requireCharacter(event);
		const entree = await writeEntry(event.locals.db, actor, { text: texte(data.text) });
		return { notee: entree.id };
	}),
	/** Corriger : l'ancienne version reste en rature dessous. */
	corriger: action(async (event, data) => {
		const { actor } = requireCharacter(event);
		const entree = await amendEntry(event.locals.db, actor, {
			entryId: texte(data.entryId),
			text: texte(data.text)
		});
		return { corrigee: entree.id };
	}),
	/** Rayer : l'entrée entière est barrée, et reste lisible. */
	rayer: action(async (event, data) => {
		const { actor } = requireCharacter(event);
		const entree = await strikeEntry(event.locals.db, actor, { entryId: texte(data.entryId) });
		return { rayee: entree.id };
	}),
	/** Proposer un fait (type · envers · texte) : il attend le tampon d'un MJ. */
	proposerFait: action(async (event, data) => {
		const { actor } = requireCharacter(event);
		const kind =
			FACT_KINDS.find((k) => k === texte(data.kind)) ?? (texte(data.kind) as FactKindKey);
		const counterpart = texte(data.counterpart).trim();
		const fait = await proposeFact(event.locals.db, actor, {
			kind,
			...(counterpart ? { counterpart } : {}),
			text: texte(data.text)
		});
		return { propose: fait.id };
	})
};
