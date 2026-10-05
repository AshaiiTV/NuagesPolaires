// /table/combat/[id] — la Table vue par le MJ (03-vision §5.8, 06-contrats B.6 et C).
// La lecture renvoie l'état complet (MJ, admin) ; les écritures passent par des form actions :
// ?/sauver (état complet + expectedRevision), ?/ajouter (fiches et créatures relues côté serveur),
// ?/montrerChiffres, ?/ignorer (déclaration d'un joueur laissée de côté), ?/terminer (clôture).
import { error, fail, redirect } from '@sveltejs/kit';
import { requireCapability } from '$lib/server/guards';
import { action, type FormValues } from '$lib/server/actions';
import { NpError, isNpError } from '$lib/server/http';
import { closeTable, getTable, saveTable, setShowEnemyNumbers } from '$lib/server/domain/combats';
import { getSheet, listCharacters } from '$lib/server/domain/characters';
import { getBeast, listBeasts } from '$lib/server/domain/beasts';
import { strikeDeclaration } from '$lib/server/domain/declarations';
import { addFighter, isCombatError, type CombatState, type FighterInput } from '$lib/game/combat';
import type { Actions, PageServerLoad } from './$types';

export type FicheParticipant = {
	id: string;
	nom: string;
	niveau: number;
	xp: number;
	xpMax: number;
	pv: { cur: number; max: number };
	ep: { cur: number; max: number };
	em: { cur: number; max: number };
	statuts: string[];
	revision: number;
};

export const load: PageServerLoad = async (event) => {
	const actor = requireCapability(event, 'combat.run');
	const db = event.locals.db;
	let table;
	try {
		table = await getTable(db, actor, event.params.id);
	} catch (e) {
		if (isNpError(e) && e.status === 404)
			error(404, { message: 'Cette Table n’existe pas.', code: 'NOT_FOUND' });
		if (isNpError(e))
			error(e.status, {
				message: 'Cette Table n’a pas pu s’ouvrir : son état enregistré est illisible.',
				code: e.code
			});
		throw e;
	}
	// Une Table repliée se lit dans les Archives.
	if (table.row.status === 'termine') redirect(303, `/table/archives/${table.row.id}`);

	const state = table.state;
	const participants = [
		...new Set(
			state.fighters
				.filter((f) => f.type === 'player' && !f.isSummon && f.characterId)
				.map((f) => f.characterId!)
		)
	];
	const demarre = state.startedAt !== null;
	const [fiches, personnages, creatures] = await Promise.all([
		Promise.all(
			participants.map(async (id): Promise<FicheParticipant | null> => {
				try {
					const s = await getSheet(db, actor, id);
					return {
						id: s.id,
						nom: s.name,
						niveau: s.level,
						xp: s.xp,
						xpMax: s.xpMax,
						pv: s.pv,
						ep: s.ep,
						em: s.em,
						statuts: s.statuses.map((x) => x.id),
						revision: s.revision
					};
				} catch {
					return null;
				}
			})
		),
		// Avant démarrage seulement : de quoi cocher « Élèves du Serment » et « Adversaires ».
		demarre ? Promise.resolve([]) : listCharacters(db, actor, {}),
		demarre ? Promise.resolve([]) : listBeasts(db, actor, {})
	]);

	return {
		table: { state, row: table.row, revision: table.revision },
		declarations: table.pendingDeclarations,
		fiches: fiches.filter((f): f is FicheParticipant => f !== null),
		pseudo: actor.pseudo,
		candidats: {
			personnages: personnages
				.filter((p) => !participants.includes(p.id))
				.map((p) => ({ id: p.id, nom: p.name, serment: p.oath.name, niveau: p.level })),
			creatures: creatures.map((b) => ({
				id: b.id,
				nom: b.name,
				niveau: b.level,
				comportement: b.behavior,
				couleur: b.behaviorColor
			}))
		}
	};
};

function texte(v: FormValues[string]): string {
	return typeof v === 'string' ? v.trim() : '';
}
function liste(v: FormValues[string]): string[] {
	if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string' && x.length > 0);
	return typeof v === 'string' && v ? [v] : [];
}
function json<T>(v: FormValues[string], quoi: string): T {
	try {
		return JSON.parse(texte(v)) as T;
	} catch {
		throw new NpError('INVALID', `${quoi} n’a pas pu être lu.`);
	}
}
/** Un refus du moteur (combattant déjà présent…) devient un refus lisible, jamais une erreur 500. */
function ajout(state: CombatState, input: FighterInput): CombatState {
	try {
		return addFighter(state, input);
	} catch (e) {
		if (isCombatError(e)) throw new NpError('INVALID', e.message);
		throw e;
	}
}
function raison(v: FormValues[string]): 'manual' | 'round' | 'auto' {
	const r = texte(v);
	return r === 'round' || r === 'auto' ? r : 'manual';
}

export const actions: Actions = {
	sauver: action(async (event, data) => {
		const actor = requireCapability(event, 'combat.run');
		const state = json<CombatState>(data.state, 'L’état de la Table');
		const row = await saveTable(event.locals.db, actor, {
			id: event.params.id,
			state,
			expectedRevision: data.expectedRevision as number | undefined,
			reason: raison(data.reason)
		});
		return { sauve: { revision: row.revision, releve: row.savedAt, raison: raison(data.reason) } };
	}),

	ajouter: action(async (event, data) => {
		const actor = requireCapability(event, 'combat.run');
		const db = event.locals.db;
		let state = json<CombatState>(data.state, 'L’état de la Table');
		if (state.startedAt !== null)
			throw new NpError('INVALID', 'Les combattants s’ajoutent avant de démarrer.');
		for (const characterId of liste(data.personnages)) {
			const s = await getSheet(db, actor, characterId);
			const tiers = [...s.tiers.reached, ...s.tiers.next].map((t) => ({
				niv: t.level,
				nom: t.name,
				cout: t.cost,
				desc: t.description
			}));
			state = ajout(state, {
				type: 'player',
				characterId: s.id,
				name: s.name,
				oathName: s.oath.name,
				level: s.level,
				pvCur: s.pv.cur,
				pvMax: s.pv.max,
				epCur: s.ep.cur,
				epMax: s.ep.max,
				emCur: s.em.cur,
				emMax: s.em.max,
				imageUrl: s.portraitUrl || null,
				branch: s.branch ? { name: s.branch, tiers } : null
			});
		}
		for (const [cle, valeur] of Object.entries(data)) {
			if (!cle.startsWith('qte_')) continue;
			const qty = Math.min(30, Number.parseInt(texte(valeur), 10) || 0);
			if (qty <= 0) continue;
			const b = await getBeast(db, actor, cle.slice(4));
			for (let n = 0; n < qty; n++)
				state = ajout(state, {
					type: 'beast',
					beastId: b.id,
					name: b.name,
					level: b.level,
					pv: b.pv,
					ep: b.ep,
					strike: b.strike,
					skill: b.skill,
					behavior: b.behavior,
					gem: b.gem,
					imageUrl: b.imageUrl || null
				});
		}
		const row = await saveTable(db, actor, {
			id: event.params.id,
			state,
			expectedRevision: data.expectedRevision as number | undefined,
			reason: 'manual'
		});
		return { ajoute: { state, revision: row.revision, releve: row.savedAt } };
	}),

	montrerChiffres: action(async (event, data) => {
		const actor = requireCapability(event, 'combat.run');
		const row = await setShowEnemyNumbers(event.locals.db, actor, {
			id: event.params.id,
			value: texte(data.valeur) === 'oui',
			expectedRevision: data.expectedRevision as number | undefined
		});
		return { chiffres: { revision: row.revision, valeur: row.showEnemyNumbers } };
	}),

	ignorer: action(async (event, data) => {
		const actor = requireCapability(event, 'combat.run');
		await strikeDeclaration(event.locals.db, actor, {
			id: texte(data.declaration),
			motif: texte(data.motif) || 'laissée de côté à la Table'
		});
		return { ignoree: texte(data.declaration) };
	}),

	terminer: action(async (event, data) => {
		const actor = requireCapability(event, 'combat.run');
		const db = event.locals.db;
		const state = json<CombatState>(data.state, 'L’état de la Table');
		const consequences = json<
			{
				characterId: string;
				expectedRevision?: number;
				pv: number;
				ep: number;
				em: number;
				statuses: string[];
				xp: number;
				drops: { name: string; beastName: string; qty: number; category: string }[];
				motif: string;
			}[]
		>(data.consequences, 'Les conséquences');
		const titre = texte(data.titre);
		if (!titre) throw new NpError('INVALID', 'Donne un titre au récit.');
		const extraitTexte = texte(data.extrait);
		const publier = texte(data.publier) === 'oui';
		// L'état final est d'abord relevé, puis la clôture le lit sous verrou (une transaction).
		const sauve = await saveTable(db, actor, {
			id: event.params.id,
			state,
			expectedRevision: data.expectedRevision as number | undefined,
			reason: 'manual'
		});
		let recit;
		try {
			recit = await closeTable(db, actor, {
				id: event.params.id,
				expectedRevision: sauve.revision,
				consequences: consequences as never,
				recit: { title: titre, visibleToParticipants: texte(data.lisible) === 'oui' },
				extract: publier
					? {
							text: extraitTexte,
							onHome: texte(data.accueil) === 'oui',
							beastIds: liste(data.creatures)
						}
					: undefined
			});
		} catch (e) {
			// L'état final est relevé mais la clôture est refusée : la page garde la nouvelle révision.
			if (isNpError(e))
				return fail(e.status, {
					code: e.code,
					message: e.message,
					sauve: { revision: sauve.revision, releve: sauve.savedAt }
				});
			throw e;
		}
		return { archive: { id: recit.id, at: recit.at, titre: recit.title } };
	})
};
