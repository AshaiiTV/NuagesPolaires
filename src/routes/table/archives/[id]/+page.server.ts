// /table/archives/[id] — un récit lu par le MJ : journal complet (lignes réservées comprises), notes du
// MJ, participants et adversaires ; « Publier un extrait » a posteriori ; « Rayer la publication »
// avec motif (03-vision §5.8, §6 moment 8, P7 ; 06-contrats B.6).
import { error } from '@sveltejs/kit';
import { desc, eq, inArray } from 'drizzle-orm';
import { requireCapability } from '$lib/server/guards';
import { action, type FormValues } from '$lib/server/actions';
import { NpError, isNpError } from '$lib/server/http';
import { getRecit, getTable } from '$lib/server/domain/combats';
import { publishExtract, strikePublication } from '$lib/server/domain/publications';
import { publicationBeasts, publications } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const actor = requireCapability(event, 'combat.run');
	const db = event.locals.db;
	const id = event.params.id;
	let recit, table;
	try {
		[recit, table] = await Promise.all([getRecit(db, actor, id), getTable(db, actor, id)]);
	} catch (e) {
		if (isNpError(e) && e.status === 404) error(404, { message: 'Ce récit n’existe pas, ou la Table n’est pas repliée.', code: 'NOT_FOUND' });
		if (isNpError(e)) error(e.status, { message: 'Ce récit n’a pas pu s’ouvrir : son état enregistré est illisible.', code: e.code });
		throw e;
	}
	// Lecture des extraits publiés de ce récit. Écart assumé : le domaine publications.ts n'expose pas
	// encore de lecture par combat (listPublications) ; la requête reste en lecture seule et filtrée.
	const extraits = await db
		.select({ id: publications.id, text: publications.text, onHome: publications.onHome, at: publications.stampedAt, struck: publications.struck, struckAt: publications.struckAt })
		.from(publications)
		.where(eq(publications.combatId, id))
		.orderBy(desc(publications.stampedAt));
	const liens = extraits.length
		? await db
				.select()
				.from(publicationBeasts)
				.where(
					inArray(
						publicationBeasts.publicationId,
						extraits.map((x) => x.id)
					)
				)
		: [];
	const state = table.state;
	const adversaires = [...new Map(state.fighters.filter((f) => f.type === 'beast' && f.beastId).map((f) => [f.beastId!, f.baseName || f.name])).entries()].map(
		([beastId, nom]) => ({ id: beastId, nom })
	);
	return {
		recit: {
			id: recit.id,
			titre: recit.title || recit.name,
			nom: recit.name,
			at: recit.at,
			rounds: Math.max(1, recit.round - 1),
			lisible: recit.visibleToParticipants,
			salon: recit.discordUrl
		},
		// Le MJ lit tout : les lignes réservées (journaux repris de l'ancien simulateur) sont marquées.
		journal: state.log.map((e) => ({ n: e.n, round: e.round, kind: e.kind, text: e.text, prive: !!e.private })),
		notes: state.notes,
		eleves: state.fighters
			.filter((f) => f.type === 'player' && !f.isSummon)
			.map((f) => ({ id: f.id, nom: f.name, niveau: f.level, pv: `${f.pvCur}/${f.pvMax}`, ko: f.pvCur <= 0 })),
		adversaires,
		ko: state.fighters.filter((f) => f.type === 'beast' && f.pvCur <= 0).map((f) => f.name),
		extraits: extraits.map((x) => ({
			id: x.id,
			texte: x.text,
			accueil: x.onHome,
			at: x.at.toISOString(),
			raye: x.struck,
			rayeA: x.struckAt?.toISOString() ?? null,
			creatures: liens
				.filter((l) => l.publicationId === x.id)
				.map((l) => adversaires.find((a) => a.id === l.beastId)?.nom ?? 'une créature')
		}))
	};
};

function texte(v: FormValues[string]): string {
	return typeof v === 'string' ? v.trim() : '';
}
function liste(v: FormValues[string]): string[] {
	if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string' && x.length > 0);
	return typeof v === 'string' && v ? [v] : [];
}

export const actions: Actions = {
	publier: action(async (event, data) => {
		const actor = requireCapability(event, 'combat.run');
		const text = texte(data.extrait).replace(/\r\n/g, '\n');
		const onHome = texte(data.accueil) === 'oui';
		const beastIds = liste(data.creatures);
		if (!onHome && !beastIds.length) throw new NpError('INVALID', 'Coche au moins une destination : l’accueil ou la page d’une créature.');
		const pub = await publishExtract(event.locals.db, actor, { text, onHome, beastIds, combatId: event.params.id });
		return { publie: { id: pub.id, at: pub.at } };
	}),

	rayerPublication: action(async (event, data) => {
		const actor = requireCapability(event, 'combat.run');
		const motif = texte(data.motif);
		if (!motif) throw new NpError('INVALID', 'Écris le motif de la rature.');
		await strikePublication(event.locals.db, actor, { id: texte(data.publication), motif });
		return { raye: texte(data.publication) };
	})
};
