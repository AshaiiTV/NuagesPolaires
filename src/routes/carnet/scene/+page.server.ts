// Le feuillet volant « En scène » (03-vision §5.3 ; 06-contrats §C `/carnet/scene`).
// Lectures : contexte de scène (scène ouverte ou Table), fiche, déclarations en attente.
// Écritures : déclarer, annuler (≤ 10 s), rayer, consommer, noter (en scène), marque-page,
// ouvrir une scène. Aucune écriture ne touche aux chiffres :
// une déclaration est une annotation que le MJ reporte d'un tampon.
import { redirect } from '@sveltejs/kit';
import { action, type FormValues } from '$lib/server/actions';
import { requireCharacter } from '$lib/server/guards';
import { NpError } from '$lib/server/http';
import { getSceneContext, openScene } from '$lib/server/domain/scenes';
import { getPlayerTable } from '$lib/server/domain/combats';
import { consumeOwnItem, getOwnSheet } from '$lib/server/domain/characters';
import {
	cancelDeclaration,
	declare,
	listOwnPending,
	strikeOwnDeclaration
} from '$lib/server/domain/declarations';
import { writeEntry } from '$lib/server/domain/journal';
import { getLastPages, setBookmark } from '$lib/server/domain/reading';
import { ruleCardFor, type RuleCard } from '$lib/game/rules';
import { STATUS_IDS } from '$lib/game/combat/statuses';
import type { StatusId } from '$lib/game/combat/types';
import type { SheetView } from '$lib/schemas/characters';
import type { SceneContextView } from '$lib/schemas/scenes';
import { motsPour, resoudre, RESSOURCES, type Res } from './mots';
import type { Actions, PageServerLoad } from './$types';

const texte = (v: FormValues[string]): string => (typeof v === 'string' ? v : '');

/** La carte de règle selon le contexte (table de correspondance de rules.ts, 03-vision §5.3). */
function carteDuMoment(fiche: SheetView, contexte: SceneContextView): RuleCard {
	if (contexte.table?.phase === 'declaration') {
		const carte = ruleCardFor({ kind: 'declaration' });
		if (carte.id === 'actions')
			return {
				...carte,
				actions: carte.actions
					.filter((a) => a.pour !== 'creature' && (!a.serment || a.serment === fiche.oath.name))
					.map((a) => (a.pour === 'joueur' ? { ...a, conditions: '' } : a))
			};
		return carte;
	}
	const statut = fiche.statuses.find((s) => (STATUS_IDS as readonly string[]).includes(s.id));
	if (statut) return ruleCardFor({ kind: 'status', status: statut.id as StatusId });
	if (fiche.ep.max > 0 && fiche.ep.cur / fiche.ep.max < 0.2)
		return ruleCardFor({ kind: 'recovery' });
	return ruleCardFor({ kind: 'out-of-combat' });
}

export const load: PageServerLoad = async (event) => {
	const { actor } = requireCharacter(event);
	const db = event.locals.db;
	// Lectures attendues l'une après l'autre : la base de la requête se ferme avec la réponse.
	const contexte = await getSceneContext(db, actor);
	const fiche = await getOwnSheet(db, actor);
	const attente = fiche ? await listOwnPending(db, actor) : [];
	// Le marque-page est unique, tenu par compte (03-vision §6.2) : le feuillet montre le même que
	// Dernières pages, jamais une seconde phrase « Tu t'étais arrêté ici ».
	const { bookmark: marquePage } = await getLastPages(db, actor);
	// La Table où figure le personnage, lue à la même source que `/carnet/table/[id]` : la seconde
	// ligne du feuillet et la Table disent la même chose au même instant, et les statuts portent
	// leurs tours (« Saignement 2 t. ») tels que le MJ les tient.
	let etatTable: { active: boolean; round: number; phase: string; status: string } | null = null;
	let tours: Record<string, number> = {};
	if (contexte.table) {
		try {
			const t = await getPlayerTable(db, actor, contexte.table.id);
			const p = t.projection;
			etatTable = { active: p.active, round: p.round, phase: p.phase, status: t.status };
			tours = Object.fromEntries((p.self?.statuses ?? []).map((st) => [st.id, st.tours]));
		} catch (e) {
			// Table refusée ou repliée entre-temps : le feuillet garde la ligne du contexte.
			if (!(e instanceof NpError)) throw e;
		}
	}
	return {
		contexte,
		fiche,
		attente,
		marquePage,
		etatTable,
		tours,
		mots: fiche ? motsPour(fiche) : null,
		carte: fiche ? carteDuMoment(fiche, contexte) : ruleCardFor({ kind: 'out-of-combat' }),
		/** Heure du serveur : le compte à rebours d'annulation se cale dessus. */
		maintenant: new Date().toISOString()
	};
};

/** Page de retour après « Reposer » : chemin interne, jamais le feuillet lui-même. */
function retourSur(brut: string): string {
	const r = brut.trim();
	if (!r.startsWith('/') || r.startsWith('//') || r.startsWith('/\\')) return '/carnet';
	if (r === '/carnet/scene' || r.startsWith('/carnet/scene?') || r.startsWith('/entrer'))
		return '/carnet';
	return r;
}

export const actions: Actions = {
	declarer: action(async (event, data) => {
		const { actor } = requireCharacter(event);
		const db = event.locals.db;
		const ressource = texte(data.ressource) as Res;
		if (!RESSOURCES.includes(ressource)) throw new NpError('INVALID', 'Ressource invalide.', 400);
		const fiche = await getOwnSheet(db, actor);
		if (!fiche)
			throw new NpError('NOT_FOUND', 'Ta fiche n’a pas pu s’ouvrir. Recharge la page.', 404);
		const r = resoudre(
			motsPour(fiche)[ressource],
			texte(data.choix),
			texte(data.chiffre),
			texte(data.mot)
		);
		if (!r.ok) throw new NpError('INVALID', r.erreur, 400);
		const contexte = await getSceneContext(db, actor);
		const declaree = await declare(db, actor, {
			resource: ressource,
			delta: r.delta,
			word: r.word,
			...(contexte.scene ? { sceneId: contexte.scene.id } : {}),
			...(contexte.table ? { combatId: contexte.table.id } : {})
		});
		return { declaree };
	}),

	annuler: action(async (event, data) => {
		const { actor } = requireCharacter(event);
		const annulee = await cancelDeclaration(event.locals.db, actor, { id: texte(data.id) });
		return { annulee };
	}),

	rayer: action(async (event, data) => {
		const { actor } = requireCharacter(event);
		const rayee = await strikeOwnDeclaration(event.locals.db, actor, { id: texte(data.id) });
		return { rayee };
	}),

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

	noter: action(async (event, data) => {
		const { actor } = requireCharacter(event);
		const entree = await writeEntry(event.locals.db, actor, {
			text: texte(data.text),
			inScene: true
		});
		return { notee: entree.id };
	}),

	marquePage: action(async (event, data) => {
		const { actor } = requireCharacter(event);
		const phrase = texte(data.text).trim();
		const lien = texte(data.url).trim();
		// Rien d'écrit : on repose sans toucher au marque-page existant.
		if (phrase || lien) {
			const sceneId = texte(data.sceneId).trim();
			await setBookmark(event.locals.db, actor, {
				text: phrase,
				url: lien,
				...(sceneId ? { sceneId } : {})
			});
		}
		redirect(303, retourSur(texte(data.retour)));
	}),

	ouvrirScene: action(async (event, data) => {
		const { actor } = requireCharacter(event);
		const scene = await openScene(event.locals.db, actor, {
			title: texte(data.title),
			discordUrl: texte(data.discordUrl)
		});
		return { scene: scene.id };
	})
};
