// /table/archives/[id] — un récit lu par le MJ : journal complet (lignes réservées comprises), notes du
// MJ, participants et adversaires ; « Publier un extrait » a posteriori ; « Rayer la publication »
// avec motif (03-vision §5.8, §6 moment 8, P7 ; 06-contrats B.6).
import { error } from '@sveltejs/kit';
import { requireCapability } from '$lib/server/guards';
import { action, type FormValues } from '$lib/server/actions';
import { NpError, isNpError } from '$lib/server/http';
import { getRecit, getTable } from '$lib/server/domain/combats';
import { sansEmoji } from '$lib/ui/table/texte';
import {
	listPublications,
	publishExtract,
	strikePublication
} from '$lib/server/domain/publications';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const actor = requireCapability(event, 'combat.run');
	const db = event.locals.db;
	const id = event.params.id;
	let recit, table;
	try {
		[recit, table] = await Promise.all([getRecit(db, actor, id), getTable(db, actor, id)]);
	} catch (e) {
		if (isNpError(e) && e.status === 404)
			error(404, {
				message: 'Ce récit n’existe pas, ou la Table n’est pas repliée.',
				code: 'NOT_FOUND'
			});
		if (isNpError(e))
			error(e.status, {
				message: 'Ce récit n’a pas pu s’ouvrir : son état enregistré est illisible.',
				code: e.code
			});
		throw e;
	}
	const extraits = await listPublications(db, actor, { combatId: id });
	const state = table.state;
	const groupes = new Map<string, { id: string; nom: string; qty: number }>();
	for (const fighter of state.fighters.filter((f) => f.type === 'beast' && f.beastId)) {
		const g = groupes.get(fighter.beastId!) ?? {
			id: fighter.beastId!,
			nom: fighter.baseName || fighter.name,
			qty: 0
		};
		g.qty++;
		groupes.set(g.id, g);
	}
	const adversaires = [...groupes.values()].map((g) => ({
		id: g.id,
		nom: g.nom + (g.qty > 1 ? ' ×' + g.qty : '')
	}));
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
		journal: recit.log
			.filter((e) => !/^Déclaration de\s*:/u.test(sansEmoji(e.text)))
			.map((e) => ({ n: e.n, round: e.round, kind: e.kind, text: e.text, prive: !!e.private })),
		notes: recit.notes ?? '',
		eleves: state.fighters
			.filter((f) => f.type === 'player' && !f.isSummon)
			.map((f) => ({
				id: f.id,
				nom: f.name,
				niveau: f.level,
				pv: `${f.pvCur}/${f.pvMax}`,
				ko: f.pvCur <= 0
			})),
		adversaires,
		ko: state.fighters.filter((f) => f.type === 'beast' && f.pvCur <= 0).map((f) => f.name),
		extraits: extraits.map((x) => ({
			tampon: x.tampon,
			id: x.id,
			texte: x.text,
			accueil: x.onHome,
			at: x.at,
			raye: x.struck,
			rayeA: x.struckAt ?? null,
			creatures: x.creatures.map((c) => c.name)
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
		if (!onHome && !beastIds.length)
			throw new NpError(
				'INVALID',
				'Coche au moins une destination : l’accueil ou la page d’une créature.'
			);
		const pub = await publishExtract(event.locals.db, actor, {
			text,
			onHome,
			beastIds,
			combatId: event.params.id
		});
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
