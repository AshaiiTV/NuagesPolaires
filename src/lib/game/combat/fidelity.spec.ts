import { describe, expect, it } from 'vitest';
import {
	addFighter,
	addSummon,
	actionsMax,
	applyStatus,
	buildDeclaration,
	createCombat,
	declareAction,
	fromLegacyArchive,
	removeFighter,
	removeStatus,
	editDeclaration,
	adjustResource,
	resolveRound,
	rollDrop,
	startCombat,
	undoLastGesture,
	undoRound
} from './index';
import type { CombatState } from './types';
import { findBranch, oathBranches, oathFromLegacyCustom } from '../oaths';
import { combatXp, normalizeLegacyProgression } from '../progression';
import { normalizeBeast } from '../../server/legacy/normalize';
import { exportDiscord } from '../../ui/table/texte';
import { combatStateSchema } from '../../schemas/combats';
import { qtyRange } from '../spawn';

function preparation() {
	let s = createCombat({ id: 'fidelite' });
	s = addFighter(s, {
		type: 'player',
		characterId: 'p',
		name: 'Élève',
		oathName: 'Duelliste',
		level: 2,
		pvCur: 30,
		pvMax: 30,
		epCur: 50,
		epMax: 50,
		emCur: 20,
		emMax: 20,
		statuses: [
			{ id: 'etourdi', tours: 2 },
			{ id: 'saignement', tours: 2 }
		]
	});
	return addFighter(s, {
		type: 'beast',
		beastId: 'b',
		name: 'Créature',
		level: 2,
		pv: 100,
		ep: 50,
		strike: '0',
		gem: '1–100 : Gemme Blanche'
	});
}
function round(s: CombatState) {
	while (s.phase === 'declaration') s = declareAction(s, s.order[s.turn]!, 'passer');
	return resolveRound(s, () => 0.5);
}
describe('INT-3 : exemples chiffrés de la revue', () => {
	it('A1 : entrée sans statut, 3 actions et 30 PV au premier round', () => {
		const s = startCombat(preparation());
		expect(s.fighters[0]!.statuses).toEqual([]);
		expect(actionsMax(s, s.fighters[0]!.id)).toBe(3);
		expect(round(s).fighters[0]!.pvCur).toBe(30);
	});
	it('A2 : invocation sans tour, ordre de 2 et adversaire à 100 PV', () => {
		let s = startCombat(preparation());
		s = addSummon(s, s.fighters[0]!.id, {
			name: 'Tortue',
			pv: 10,
			dmg: 6,
			actCost: 1,
			autoInterpose: false,
			rangeType: 'cac',
			ownerCharacterId: 'p'
		});
		expect(s.order).toHaveLength(2);
		expect(round(round(s)).fighters[1]!.pvCur).toBe(100);
	});
	it('A3 : journal d’initiative en préparation, démarrage round 1 autorisé', () => {
		const s = fromLegacyArchive({
			id: 'archive',
			fighters: [
				{ type: 'player', pid: 'p', name: 'Élève', pvMax: 30 },
				{ type: 'beast', bid: 'b', name: 'Loup', pvMax: 100 }
			],
			log: ['★ Initiative'],
			active: false,
			phase: 'idle'
		});
		expect(s.ended).toBe(false);
		expect(s.startedAt).toBeNull();
		expect(startCombat(s)).toMatchObject({ active: true, round: 1 });
	});
	it('A4 : frappe de créature base zéro = 6 + niveau 2', () => {
		expect(buildDeclaration(preparation().fighters[1]!, 'frappe').value).toBe(8);
	});
	it('A5 : trois branches custom, branche C retrouvée', () => {
		const oath = oathFromLegacyCustom('Custom', {
			branches: ['A', 'B', 'C'].map((nom) => ({
				nom,
				paliers: [{ niv: 2, nom: 'Coup', cout: '1 EM', desc: '9+Niv dégâts' }]
			}))
		});
		expect(oathBranches(oath)).toHaveLength(3);
		expect(findBranch(oath, 'C')?.paliers).toHaveLength(1);
	});
	it('A6 : croissance partielle, maxima 39/56/22 et courants 29/46/12', () => {
		const c = normalizeLegacyProgression(
			{
				classe: 'Duelliste',
				level: 1,
				xp: 0,
				sLevel: 2,
				sXp: 0,
				pvMax: 30,
				epMax: 50,
				emMax: 20,
				pvCur: 20,
				epCur: 40,
				emCur: 10
			},
			() => ({ pvN: 9 })
		);
		expect([c.pvMax, c.epMax, c.emMax, c.pvCur, c.epCur, c.emCur]).toEqual([
			39, 56, 22, 29, 46, 12
		]);
	});
	it('A8 : 33,5 % au niveau 3 donnent 10 XP', () => {
		expect(combatXp(3, 33.5)).toBe(10);
	});
	it('A9 : migration quantité saisie 5/5 vers plage effective 1/2', () => {
		expect(
			normalizeBeast({ id: 'b', niv: 3, beh: 'Agressif', qtyMin: 5, qtyMax: 5 }).row
		).toMatchObject({ qtyMin: 1, qtyMax: 2 });
	});
	it('A10 : saignement létal à 3 PV, zéro drop', () => {
		let s = startCombat(preparation());
		s.fighters[1]!.pvCur = 3;
		s = round(applyStatus(s, s.fighters[1]!.id, 'saignement'));
		expect(s.fighters[1]!.pvCur).toBe(0);
		expect(s.drops).toHaveLength(0);
		expect(() => rollDrop(s, s.fighters[1]!.id, () => 0.5)).toThrow('Aucun drop');
	});
	it('A11 : retrait en résolution conserve phase et ramène le curseur hors limites à 0', () => {
		let s = startCombat(preparation());
		while (s.phase === 'declaration') s = declareAction(s, s.order[s.turn]!, 'passer');
		expect(removeFighter(s, s.fighters[1]!.id)).toMatchObject({
			phase: 'resolution',
			turn: 0,
			declarations: {}
		});
	});
	it('A14 : Frappe Déchaînée 0 EM par défaut, durée manuelle 11', () => {
		const s = preparation();
		expect(buildDeclaration(s.fighters[0]!, 'frappe_dechainees').emCost).toBe(0);
		expect(applyStatus(s, s.fighters[0]!.id, 'gel', 11).fighters[0]!.statuses).toEqual([
			{ id: 'gel', tours: 11 }
		]);
	});
	it('A12 : −5 EP après frappe annulé sans revenir au round précédent (round 2, 87 PV, 44 EP)', () => {
		let s = startCombat(preparation());
		s = declareAction(s, s.fighters[0]!.id, 'frappe', { target: s.fighters[1]!.id });
		s = round(s);
		const adjusted = adjustResource(s, s.fighters[0]!.id, 'ep', -5);
		expect(adjusted.fighters[0]!.epCur).toBe(39);
		const restored = undoLastGesture(combatStateSchema.parse(adjusted));
		expect([restored.round, restored.fighters[1]!.pvCur, restored.fighters[0]!.epCur]).toEqual([
			2, 87, 44
		]);
		expect(undoRound(adjusted).round).toBe(1);
	});
	it('A12 : annulation retrait, retrait de statut et retouche restaure chaque photographie', () => {
		const s = startCombat(preparation());
		expect(undoLastGesture(removeFighter(s, s.fighters[1]!.id))).toEqual({
			...s,
			gestureHistory: []
		});
		const marked = applyStatus(s, s.fighters[0]!.id, 'gel', 11);
		expect(undoLastGesture(removeStatus(marked, marked.fighters[0]!.id, 'gel'))).toEqual({
			...marked,
			gestureHistory: []
		});
		const declared = declareAction(s, s.fighters[0]!.id, 'passer');
		expect(undoLastGesture(editDeclaration(declared, declared.fighters[0]!.id))).toEqual({
			...declared,
			gestureHistory: []
		});
	});
	it('A13 : état arrêté round 2, journal hérité −8 PV et notes intégrales', () => {
		const s = fromLegacyArchive({
			id: 'export',
			active: false,
			phase: 'idle',
			round: 2,
			notes: 'Note du MJ',
			log: ['Impact hérité −8 PV', '⚔']
		});
		const text = exportDiscord(s, 0);
		expect(text).toContain('2 rounds');
		expect(text).toContain('Impact hérité −8 PV');
		expect(text).toContain('Note du MJ');
		expect(text).toContain('⚔');
	});
	it('A3 : arrêt automatique round 2 distinct de la clôture explicite', () => {
		const stopped = fromLegacyArchive({
			id: 'stop',
			round: 2,
			active: false,
			phase: 'idle',
			log: ['🏆 Tous les monstres sont KO !']
		});
		expect(stopped).toMatchObject({ ended: false, endedAt: null, startedAt: 0 });
		const closed = fromLegacyArchive({
			id: 'close',
			round: 2,
			active: false,
			phase: 'idle',
			log: [{ text: '🏁 Combat terminé — Round 2' }]
		});
		expect(closed).toMatchObject({ ended: true, endedAt: 0, startedAt: 0 });
	});
	it('A9 : Atelier prioritaire 5/5, spawn hérité 2/4 et indice 3 sans conversion pour le tirage', () => {
		expect(qtyRange({ level: 3, behavior: 'Agressif', qtyMin: 5, qtyMax: 5 })).toEqual({
			min: 5,
			max: 5
		});
		expect(
			normalizeBeast({ niv: 3, beh: 'Agressif', qtyMin: 5, qtyMax: 5, spawnMin: 2, spawnMax: 4 })
				.row
		).toMatchObject({ qtyMin: 2, qtyMax: 4 });
		expect(normalizeBeast({ niv: 3, beh: 3, qtyMin: 5, qtyMax: 5 }).row).toMatchObject({
			behavior: 'Neutre',
			qtyMin: 1,
			qtyMax: 2
		});
	});
	it('A11 : retrait conserve un curseur 1 encore dans l’ordre et la phase', () => {
		let s = startCombat(preparation());
		s = addFighter(s, {
			type: 'beast',
			beastId: 'b2',
			name: 'Deuxième créature',
			level: 2,
			pv: 100,
			ep: 50
		});
		s = declareAction(s, s.fighters[0]!.id, 'passer');
		const removed = removeFighter(s, s.fighters[0]!.id);
		expect(removed).toMatchObject({ phase: 'declaration', turn: 1, declarations: {} });
	});
});
