import { describe, it, expect, vi } from 'vitest';
import {
	createCombat,
	addFighter,
	removeFighter,
	setInitiative,
	startCombat,
	declareAction,
	resolveRound,
	undoRound,
	adjustResource,
	applyStatus,
	removeStatus,
	addSummon,
	endCombat,
	isFinished,
	projectForPlayer,
	fromLegacyArchive,
	buildDeclaration,
	actionsMax,
	clearDeclaration,
	STATUS_IDS,
	getAbilityOptions,
	buildTierAbilityOptions,
	rollDrop,
	assignDrop,
	disableShieldCall
} from './index';
import type { CombatState, DeclareOptions, CombatAction, SummonSpec } from './types';
import { BUILTIN_OATHS } from '../oaths';

const rng = () => 0.61;
function fixture(pv = 100): CombatState {
	let s = createCombat({ id: 'c1', name: 'Col des brumes', notes: 'SECRET MJ' });
	s = addFighter(s, {
		type: 'player',
		characterId: 'alice',
		name: 'Alice',
		oathName: 'Duelliste',
		level: 3,
		pvCur: pv,
		pvMax: pv,
		epCur: 100,
		epMax: 100,
		emCur: 100,
		emMax: 100
	});
	s = addFighter(s, {
		type: 'beast',
		beastId: 'wolf',
		name: 'Loup',
		level: 3,
		pv,
		ep: 100,
		strike: 'Morsure 6 dégâts',
		gem: '1–60 : Aucune / 61–90 : Gemme Blanche / 91–100 : Gemme Incarnate'
	});
	return startCombat(s, rng);
}
function act(
	s: CombatState,
	id: string,
	action: CombatAction['action'],
	opts: DeclareOptions = {}
): CombatState {
	if (action === 'annule') throw new Error('test');
	return declareAction(s, id, { action, ...opts });
}
function finishDeclarations(s: CombatState): CombatState {
	while (s.phase === 'declaration') s = act(s, s.order[s.turn]!, 'passer');
	return s;
}
function round(s: CombatState): CombatState {
	return resolveRound(finishDeclarations(s), rng);
}
function p(s: CombatState) {
	return s.fighters[0]!;
}
function b(s: CombatState) {
	return s.fighters[1]!;
}

describe('déclarations, coûts et initiative', () => {
	it.each([
		['frappe', 6, 14, '⚔ Frappe (14)'],
		['pugilat', 6, 7, '👊 Pugilat (7)'],
		['esquive', 8, 0, '🛡 Esquive'],
		['bloquer', 5, 0, '🛡 Bloquer −50%'],
		['parer', 0, 0, '🤜 Parer −25%'],
		['subit', 0, 0, '🩸 Subit'],
		['deplacer', 10, 0, '🏃 Déplacement'],
		['passer', 0, 0, '⏭ Passer']
	] as const)('%s : coût et libellé exact', (action, cost, damage, label) => {
		const s = fixture(),
			d = buildDeclaration(p(s), action);
		expect(d).toMatchObject({ epCost: cost, value: damage, label });
		const next = act(s, p(s).id, action, { target: b(s).id });
		expect(p(next).epCur).toBe(100); // une intention ne paie rien
		expect(p(round(next)).epCur).toBe(100 - cost);
	});
	it.each(['bloquer', 'parer'] as const)('créature %s : 2 EP et 25 %%', (action) => {
		const s = fixture();
		expect(buildDeclaration(b(s), action)).toMatchObject({
			epCost: 2,
			label: '🛡 Bloquer (corps) −25%'
		});
	});
	it('capacités, soin, frappe déchaînée : coût EM et effets', () => {
		let s = fixture();
		s = adjustResource(s, p(s).id, 'pv', -30, 'Blessure');
		s = act(s, p(s).id, 'capacite', {
			target: b(s).id,
			value: 10,
			emCost: 7,
			abilityName: 'Rayon'
		});
		s = act(s, p(s).id, 'soin', { healAmt: 12, emCost: 4 });
		s = act(s, p(s).id, 'frappe_dechainees', {
			target: b(s).id,
			value: 8,
			healAmt: 6,
			healTarget: p(s).id
		});
		s = round(s);
		expect(p(s)).toMatchObject({ pvCur: 88, emCur: 89, epCur: 100 });
		expect(b(s).pvCur).toBe(82);
		expect(s.log.map((e) => e.text)).toContain('💚 Soin auto → Alice +6 PV');
	});
	it('l’initiative MJ reste fixe et ne consomme aucun hasard', () => {
		const s = fixture(),
			random = vi.fn(() => 0.999);
		const prep = { ...s, active: false, startedAt: null, phase: 'idle' as const };
		const a = startCombat(setInitiative(prep, b(s).id), random);
		expect(a.order).toEqual([b(s).id, p(s).id]);
		expect(random).not.toHaveBeenCalled();
		expect(round(a).order).toEqual(a.order);
	});
	it('3 actions + écart débloqué par la première cible ; étourdi et entravé prennent le max', () => {
		let s = fixture();
		s = { ...s, fighters: s.fighters.map((f, i) => (i ? { ...f, level: 1 } : f)) };
		expect(actionsMax(s, p(s).id)).toBe(3);
		s = act(s, p(s).id, 'frappe', { target: b(s).id });
		expect(actionsMax(s, p(s).id)).toBe(5);
		s = applyStatus(applyStatus(s, p(s).id, 'etourdi'), p(s).id, 'entrave');
		expect(actionsMax(s, p(s).id)).toBe(3);
	});
	it('édition efface aussi les déclarations suivantes, mauvais tour et phases refusés', () => {
		let s = fixture();
		expect(() => act(s, b(s).id, 'frappe', { target: p(s).id })).toThrow("Ce n'est pas le tour");
		s = finishDeclarations(s);
		expect(() => act(s, p(s).id, 'deplacer')).toThrow('Phase');
		s = clearDeclaration(s, p(s).id);
		expect(s).toMatchObject({ turn: 0, phase: 'declaration', declarations: { cf1: [], cf2: [] } });
		expect(() => act(s, p(s).id, 'capacite', { consumeActions: 4 })).toThrow('actions restantes');
		expect(() => act(s, p(s).id, 'capacite', { value: NaN })).toThrow('Valeur invalide');
	});
	it('EP insuffisante exécute ; EM insuffisante annule au cumul, sans remboursement', () => {
		let s = fixture();
		s = adjustResource(s, p(s).id, 'ep', -99);
		s = adjustResource(s, p(s).id, 'em', -93);
		s = act(s, p(s).id, 'capacite', { target: b(s).id, value: 10, emCost: 5 });
		s = act(s, p(s).id, 'capacite', { target: b(s).id, value: 50, emCost: 5 });
		s = act(s, p(s).id, 'frappe', { target: b(s).id });
		s = round(s);
		expect(p(s)).toMatchObject({ epCur: 0, emCur: 0 });
		expect(b(s).pvCur).toBe(76);
		expect(s.log.map((l) => l.text)).toContain(
			'⚡ Alice : EP insuffisant (1 dispo, 6 requis) — actions réduites'
		);
	});
	it('démarrage et résolution déterministes, sans horloge globale ni mutation', () => {
		const blank = createCombat({ id: 'test' });
		expect(() => startCombat(blank, rng)).toThrow('Ajoute');
		const s = fixture();
		expect(() => startCombat(s, rng)).toThrow('déjà');
		expect(() => resolveRound(s, rng)).toThrow('déclarations');
		const ready = finishDeclarations(s),
			before = JSON.stringify(ready);
		expect(resolveRound(ready, () => 0)).toEqual(resolveRound(ready, () => 0.999));
		expect(JSON.stringify(ready)).toBe(before);
	});
});

describe('défenses et attaques', () => {
	it.each([
		['esquive', 0],
		['bloquer', 5],
		['parer', 7],
		['subit', 9]
	] as const)('%s sur joueur', (def, damage) => {
		let s = fixture();
		s = act(s, p(s).id, def);
		s = act(s, p(s).id, 'passer');
		s = act(s, b(s).id, 'frappe', { target: p(s).id });
		s = round(s);
		expect(p(s).pvCur).toBe(100 - damage);
	});
	it('défenses séquentielles pour chaque instance de multi-coup', () => {
		let s = fixture();
		s = act(s, p(s).id, 'capacite', { target: b(s).id, value: 11, hits: 3 });
		s = act(s, p(s).id, 'passer');
		s = act(s, b(s).id, 'esquive');
		s = act(s, b(s).id, 'bloquer');
		s = act(s, b(s).id, 'passer');
		s = resolveRound(s, rng);
		expect(b(s).pvCur).toBe(80); // 0 + ceil(11*.75)=9 +11
	});
	it('onlyDodge saute les parades, undefendable ne consomme pas une défense', () => {
		let s = fixture();
		s = act(s, p(s).id, 'capacite', { target: b(s).id, value: 10, undefendable: true });
		s = act(s, p(s).id, 'capacite', { target: b(s).id, value: 10, onlyDodge: true });
		s = act(s, p(s).id, 'frappe', { target: b(s).id });
		s = act(s, b(s).id, 'parer');
		s = act(s, b(s).id, 'esquive');
		s = act(s, b(s).id, 'passer');
		s = resolveRound(s, rng);
		expect(b(s).pvCur).toBe(76); //10 +0 +14
	});
	it('AOE inclut les alliés selon le drapeau ; KO avant son tour supprime ses attaques', () => {
		let s = fixture(20);
		s = act(s, p(s).id, 'capacite', { aoe: true, value: 30 });
		s = act(s, p(s).id, 'passer');
		s = act(s, b(s).id, 'frappe', { target: p(s).id });
		s = round(s);
		expect(p(s).pvCur).toBe(20);
		expect(b(s).pvCur).toBe(0);
		expect(isFinished(s)).toBe(true);
		expect(s.phase).toBe('idle');
	});
	it('AOE alliés, drain, gain, Brise-Armure, bonus PV et narration', () => {
		let s = fixture();
		s = addFighter(s, {
			type: 'player',
			characterId: 'bob',
			name: 'Bob',
			oathName: 'Croisé',
			level: 3,
			pvCur: 30,
			pvMax: 30,
			epCur: 50,
			epMax: 50,
			emCur: 20,
			emMax: 20
		});
		s = act(s, p(s).id, 'capacite', {
			aoe: true,
			aoeIncludesAllies: true,
			value: 10,
			epDrain: 8,
			selfEpGain: 4,
			briseArmure: 5,
			selfPvMaxBonus: 3,
			repulse: true,
			disarm: true
		});
		s = act(s, p(s).id, 'frappe', { target: b(s).id });
		s = round(s);
		expect(b(s)).toMatchObject({ pvCur: 71, epCur: 92, briseArmureBonus: 0 });
		expect(s.fighters[2]).toMatchObject({ pvCur: 20, epCur: 42 });
		expect(p(s)).toMatchObject({ pvMaxBonus: 6, pvMax: 106, epCur: 100 });
	});
});

describe('posture Haute et Fendre la Ligne', () => {
	it.each([
		[10, 20, 12, false, 0],
		[13, 24, 14, false, 0],
		[16, 28, 16, true, 0],
		[20, 32, 20, false, 25]
	] as const)('palier %i de Posture Haute', (level, base, drain, lock, chip) => {
		const s = fixture(),
			f = { ...p(s), level, oathName: 'Claymore' };
		const tiers = BUILTIN_OATHS.find((o) => o.name === 'Claymore')!.branches.bA!.paliers;
		const tier = tiers.find((t) => t.niv === level)!;
		const option = buildTierAbilityOptions(f, tier)[0]!;
		expect(option).toMatchObject({
			emCost: 6,
			kind: 'buff',
			claymorePosture: {
				damage: base + level,
				epCost: 10,
				blockEpDrain: drain,
				noReposition: lock,
				defenseChipPct: chip
			}
		});
	});
	it('entrée en passe utilitaire, persistance, punition du blocage et verrou dynamique', () => {
		let s = fixture(200);
		const owner = p(s).id,
			foe = b(s).id;
		const posture = {
			damage: 52,
			epCost: 10,
			blockEpDrain: 20,
			noReposition: true,
			defenseChipPct: 25,
			desc: 'Posture Haute'
		};
		s = act(s, owner, 'capacite', {
			kind: 'buff',
			claymorePosture: posture,
			emCost: 6,
			abilityName: 'Posture Haute'
		});
		s = round(s);
		expect(p(s).claymorePosture).toEqual(posture);
		s = round(s);
		expect(p(s).claymorePosture).toEqual(posture);
		s = act(s, owner, 'frappe', { target: foe });
		expect(s.declarations[owner]![0]).toMatchObject({
			value: 52,
			epCost: 10,
			consumeClaymorePosture: true
		});
		s = act(s, owner, 'passer');
		s = act(s, foe, 'bloquer');
		s = round(s);
		expect(b(s)).toMatchObject({ pvCur: 161, epCur: 78, noFreeRepositionRound: 4 });
		expect(p(s).claymorePosture).toBeNull();
		s = act(s, owner, 'passer');
		expect(() => act(s, foe, 'deplacer')).toThrow('ne peut pas se déplacer');
	});
	it('impact 25 % traverse esquive et Fendre ajoute blocage, garde et taxes', () => {
		let s = fixture();
		s = act(s, p(s).id, 'capacite', { target: b(s).id, value: 20, defenseChipPct: 25 });
		s = act(s, p(s).id, 'passer');
		s = act(s, b(s).id, 'esquive');
		s = round(s);
		expect(b(s).pvCur).toBe(95);
		s = act(s, p(s).id, 'capacite', {
			target: b(s).id,
			value: 20,
			blockBreakLine: true,
			guardBonusDmg: 4,
			defenseExtraEp: 3,
			nextDefenseTax: 2,
			noReposition: true
		});
		s = act(s, p(s).id, 'passer');
		s = act(s, b(s).id, 'bloquer');
		s = round(s);
		expect(b(s)).toMatchObject({ pvCur: 66, epCur: 87, defenseTaxNext: 2 });
		s = act(s, p(s).id, 'frappe', { target: b(s).id });
		s = act(s, p(s).id, 'passer');
		s = act(s, b(s).id, 'parer');
		s = round(s);
		expect(b(s)).toMatchObject({ epCur: 83, defenseTaxNext: 0, pvCur: 55 });
	});
});

describe('statuts', () => {
	it.each(STATUS_IDS)('%s : durée, effet et expiration', (id) => {
		let s = fixture();
		s = applyStatus(s, p(s).id, id, 2);
		const malus = id === 'etourdi' ? 2 : id === 'entrave' ? 1 : 0;
		expect(actionsMax(s, p(s).id)).toBe(3 - malus);
		const damage = id === 'saignement' ? 3 : id === 'empoisonne' ? 5 : 0;
		s = round(s);
		expect(p(s).pvCur).toBe(100 - damage);
		expect(p(s).statuses).toEqual([{ id, tours: 1 }]);
		s = round(s);
		expect(p(s).pvCur).toBe(100 - damage * 2);
		expect(p(s).statuses).toEqual([]);
		expect(s.log.at(-3)?.text ?? s.log.map((l) => l.text).join(' ')).toBeDefined();
		expect(s.log.some((l) => l.text.endsWith('dissipé'))).toBe(true);
	});
	it('poison arrondi supérieur et min 1 ; retrait ; durée manuelle sans plafond', () => {
		let s = fixture(21);
		s = applyStatus(s, p(s).id, 'empoisonne', 100);
		expect(p(s).statuses[0]!.tours).toBe(100);
		s = round(s);
		expect(p(s).pvCur).toBe(19);
		s = removeStatus(s, p(s).id, 'empoisonne');
		expect(p(s).statuses).toEqual([]);
		s = fixture(1);
		s = applyStatus(s, p(s).id, 'empoisonne', 1);
		s = round(s);
		expect(p(s).pvCur).toBe(0);
	});
	it('pose par capacité durée 2, refresh max, tick immédiat ; statuts KO ne tickent pas', () => {
		let s = fixture();
		s = applyStatus(s, b(s).id, 'saignement', 4);
		s = act(s, p(s).id, 'capacite', { target: b(s).id, value: 1, statusToTarget: 'saignement' });
		s = round(s);
		expect(b(s)).toMatchObject({ pvCur: 96, statuses: [{ id: 'saignement', tours: 3 }] });
		s = adjustResource(s, b(s).id, 'pv', -100);
		s = round(s);
		expect(b(s).statuses[0]!.tours).toBe(3);
	});
});

describe('taunt et invocations', () => {
	const spec: SummonSpec = {
		name: 'Tortue Bipède',
		pv: 25,
		dmg: 7,
		actCost: 6,
		autoInterpose: true,
		rangeType: 'cac',
		ownerCharacterId: 'alice'
	};
	it('Tortue s’interpose ; 2 actions ; unicité et exclusion des outcomes', () => {
		let s = fixture();
		s = addSummon(s, p(s).id, spec);
		const id = s.fighters[2]!.id;
		expect(actionsMax(s, id)).toBe(2);
		expect(s.fighters[2]).toMatchObject({ epCur: 999, emCur: 0 });
		expect(addSummon(s, p(s).id, spec).fighters).toHaveLength(3);
		s = act(s, p(s).id, 'passer');
		s = act(s, b(s).id, 'frappe', { target: p(s).id });
		s = round(s);
		expect(p(s).pvCur).toBe(100);
		expect(s.fighters[2]!.pvCur).toBe(16);
		expect(s.log.some((e) => e.text === "🛡 Alice · Tortue Bipède s'interpose pour Alice")).toBe(
			true
		);
		s = adjustResource(s, id, 'pv', -16);
		expect(addSummon(s, p(s).id, spec).fighters).toHaveLength(3);
		expect(endCombat(s).outcomes.map((o) => o.characterId)).toEqual(['alice']);
	});
	it('invocation déclarée sans tour dans l’ordre ; Crabe ne protège pas', () => {
		let s = fixture();
		s = act(s, p(s).id, 'capacite', {
			kind: 'summon',
			summon: { ...spec, name: 'Crabe Canon', autoInterpose: false, rangeType: 'distance' },
			emCost: 6
		});
		s = act(s, p(s).id, 'passer');
		s = act(s, b(s).id, 'frappe', { target: p(s).id });
		s = round(s);
		expect(p(s).pvCur).toBe(91);
		expect(s.order).not.toContain(s.fighters[2]!.id);
		s = act(s, p(s).id, 'passer');
		s = act(s, b(s).id, 'frappe', { target: p(s).id });
		s = round(s);
		expect(p(s).pvCur).toBe(82);
	});
	it('taunt temporaire 1 round, permanent agressif, bonus par ennemi, désactivation', () => {
		let s = fixture();
		s = { ...s, fighters: s.fighters.map((f, i) => (i ? { ...f, behavior: 'Agressif' } : f)) };
		s = addFighter(s, {
			type: 'beast',
			beastId: 'fox',
			name: 'Renard',
			level: 3,
			pv: 100,
			ep: 100
		});
		s = act(s, p(s).id, 'capacite', { kind: 'buff', provoke: true, perEnemyPvMax: 6 });
		s = round(s);
		expect(p(s)).toMatchObject({ pvCur: 112, pvMax: 112, pvMaxBonus: 12 });
		expect(b(s).taunt?.permanent).toBe(true);
		s = act(s, p(s).id, 'passer');
		s = act(s, b(s).id, 'frappe', { target: s.fighters[2]!.id });
		expect(s.declarations[b(s).id]![0]).toMatchObject({ target: p(s).id, tauntLocked: true });
		s = round(s);
		expect(s.fighters[2]!.taunt).toBeNull();
		expect(b(s).taunt).not.toBeNull();
		expect(endCombat(s).outcomes[0]).toMatchObject({ pvMax: 100, pvCur: 100 });
		s = disableShieldCall(s, p(s).id);
		expect(b(s).taunt).toBeNull();
	});
});

describe('éléments', () => {
	it.each([
		['ice', 'fire', 33, 100, 100],
		['fire', 'ice', 35, 100, 100],
		['thunder', 'water', 30, 100, 100],
		['water', 'thunder', 30, 100, 93]
	] as const)('combo %s → %s', (first, second, damage, ep, foeEp) => {
		let s = fixture();
		for (const elementKey of [first, first, second])
			s = act(s, p(s).id, 'capacite', {
				target: b(s).id,
				value: 10,
				elementKey,
				comboDamage: 3,
				briseArmure: 5,
				comboSelfEpGain: 10,
				comboEpDrain: 7
			});
		s = round(s);
		expect(b(s).pvCur).toBe(100 - damage);
		expect(p(s).epCur).toBe(ep);
		expect(b(s).epCur).toBe(foeEp);
		expect(p(s).elemState).toBeNull();
	});
	it('malus répétition 0,75 / 0,5 / 0,25 / 0,1 et remise à zéro', () => {
		let s = fixture(500);
		s = { ...s, fighters: s.fighters.map((f, i) => (i ? f : { ...f, level: 7 })) };
		for (let i = 0; i < 7; i++)
			s = act(s, p(s).id, 'capacite', { target: b(s).id, value: 10, elementKey: 'fire' });
		s = round(s);
		expect(b(s).pvCur).toBe(462); //10+10+8+5+3+1+1
		s = act(s, p(s).id, 'capacite', { target: b(s).id, value: 10, elementKey: 'fire' });
		s = round(s);
		expect(b(s).pvCur).toBe(452);
	});
});

describe('combat complet, snapshots et conséquences', () => {
	function play(): { states: CombatState[]; declared: CombatState[] } {
		let s = fixture(40);
		const states = [s],
			declared: CombatState[] = [];
		// R1 : Alice frappe ; Loup pare puis frappe : Loup 29, Alice 31.
		s = act(s, p(s).id, 'frappe', { target: b(s).id });
		s = act(s, p(s).id, 'passer');
		s = act(s, b(s).id, 'parer');
		s = act(s, b(s).id, 'frappe', { target: p(s).id });
		s = finishDeclarations(s);
		declared.push(s);
		s = resolveRound(s, rng);
		states.push(s);
		// R2 : Alice pare/frappe ; Loup frappe : Loup 15, Alice 24.
		s = act(s, p(s).id, 'parer');
		s = act(s, p(s).id, 'frappe', { target: b(s).id });
		s = act(s, p(s).id, 'passer');
		s = act(s, b(s).id, 'frappe', { target: p(s).id });
		s = finishDeclarations(s);
		declared.push(s);
		s = resolveRound(s, rng);
		states.push(s);
		// R3 : deux frappes ; Loup KO avant son attaque.
		s = act(s, p(s).id, 'frappe', { target: b(s).id });
		s = act(s, p(s).id, 'frappe', { target: b(s).id });
		s = act(s, p(s).id, 'passer');
		s = act(s, b(s).id, 'frappe', { target: p(s).id });
		s = finishDeclarations(s);
		declared.push(s);
		s = resolveRound(s, rng);
		states.push(s);
		return { states, declared };
	}
	it('3 rounds rejoués avec ressources et journal exacts', () => {
		const { states, declared } = play();
		expect(
			states.slice(1).map((s) => [s.round, p(s).pvCur, p(s).epCur, b(s).pvCur, b(s).epCur])
		).toEqual([
			[2, 31, 94, 29, 92],
			[3, 24, 88, 15, 86],
			[4, 24, 76, 0, 80]
		]);
		expect(play()).toEqual({ states, declared });
		expect(states[3]!.log.map((e) => e.text)).toContain('💥 Alice → Loup : −14 PV (1→0) 💀 KO!');
		expect(states[3]!.log.at(-1)?.text).toBe('🏆 Tous les monstres sont KO !');
		for (let i = 0; i < 3; i++) expect(undoRound(states[i + 1]!)).toEqual(declared[i]);
	});
	it('D100 bornes, attribution différée, XP ceil participation, clôture unique', () => {
		let s = play().states[3]!;
		const before = JSON.stringify(s);
		s = rollDrop(s, b(s).id, () => 0.6);
		expect(s.drops[0]).toMatchObject({ roll: 61, gem: 'Gemme Blanche' });
		s = assignDrop(s, s.drops[0]!.id, 'alice');
		const end = endCombat(s, { participation: { alice: 33 } });
		expect(end.outcomes[0]).toMatchObject({
			pvCur: 24,
			epCur: 76,
			emCur: 100,
			xpGain: 10,
			drops: [{ gem: 'Gemme Blanche', beastName: 'Loup', roll: 61 }]
		});
		expect(end.state).toMatchObject({ active: false, ended: true, phase: 'idle' });
		expect(() => endCombat(end.state)).toThrow('clos');
		expect(() => undoRound(end.state)).toThrow('clos');
		expect(JSON.stringify(play().states[3])).toBe(before);
		for (const [value, roll, gem] of [
			[0, 1, 'Aucune'],
			[0.599, 60, 'Aucune'],
			[0.9, 91, 'Gemme Incarnate'],
			[0.999, 100, 'Gemme Incarnate']
		] as const)
			expect(rollDrop(play().states[3]!, 'cf2', () => value).drops[0]).toMatchObject({ roll, gem });
		expect(() => rollDrop(play().states[3]!, 'cf2', () => 1)).toThrow('[0, 1)');
	});
	it('pureté de toutes les transitions principales et JSON round-trip (undo inclus)', () => {
		const s = fixture(),
			original = JSON.stringify(s),
			id = p(s).id;
		const calls = [
			() => act(s, id, 'frappe', { target: b(s).id }),
			() => clearDeclaration(s, id),
			() => adjustResource(s, id, 'ep', -5, 'Repos'),
			() => applyStatus(s, id, 'gel'),
			() => removeStatus(s, id, 'gel'),
			() => setInitiative(s, id),
			() => removeFighter(s, b(s).id),
			() => endCombat(s),
			() => projectForPlayer(s, 'alice', { showEnemyNumbers: false })
		];
		for (const call of calls) {
			call();
			expect(JSON.stringify(s)).toBe(original);
		}
		const final = play().states[3]!;
		expect(JSON.parse(JSON.stringify(final))).toEqual(final);
		expect(undoRound(JSON.parse(JSON.stringify(final)))).toEqual(undoRound(final));
		const adjusted = adjustResource(s, id, 'ep', -5, 'Repos').log.at(-1)!;
		expect(adjusted).toMatchObject({
			field: 'ep',
			oldValue: 100,
			newValue: 95,
			text: 'Alice : EP 100 → 95 — Repos'
		});
	});
});

describe('projection et archives', () => {
	it('un non-participant ne reçoit pas de projection', () => {
		expect(() => projectForPlayer(fixture(), 'inconnu', { showEnemyNumbers: true })).toThrow(
			"Cette Table n'est pas la tienne."
		);
	});
	it('aucune fuite notes, déclarations, chiffres adverses, historique ou champ JSON réservé', () => {
		let s = fixture();
		s = act(s, p(s).id, 'frappe', { target: b(s).id });
		s = round(s);
		s = {
			...s,
			declarations: { cf2: [{ ...buildDeclaration(b(s), 'frappe'), label: 'SECRET DECL' }] }
		};
		const view = projectForPlayer(s, 'alice', { showEnemyNumbers: false });
		expect(view.self?.resources).toMatchObject({ pvCur: 100, epCur: 94 });
		expect(view.fighters[1]).toMatchObject({ condition: 'LEGER' });
		expect(view.fighters[1]).not.toHaveProperty('resources');
		const text = JSON.stringify(view);
		for (const secret of [
			'SECRET MJ',
			'SECRET DECL',
			'declarations',
			'history',
			'(100→86)',
			'−14 PV',
			'pvMaxBonus',
			'gem',
			'ownerAccountId'
		])
			expect(text).not.toContain(secret);
		expect(
			projectForPlayer(s, 'alice', { showEnemyNumbers: true }).fighters[1]?.resources?.pvCur
		).toBe(86);
		view.self!.statuses.push({ id: 'gel', tours: 2 });
		expect(p(s).statuses).toEqual([]);
	});
	it.each([
		[66, 'LEGER'],
		[65, 'GRAVE'],
		[33, 'GRAVE'],
		[32, 'CRITIQUE'],
		[0, 'CRITIQUE']
	] as const)('seuil %i %%', (pv, condition) => {
		const s = adjustResource(fixture(), 'cf2', 'pv', pv - 100);
		expect(projectForPlayer(s, 'alice', { showEnemyNumbers: false }).fighters[1]?.condition).toBe(
			condition
		);
	});
	it('alliés avec chiffres ; 30 dernières lignes ; journaux privés omis', () => {
		let s = fixture();
		s = addFighter(s, {
			type: 'player',
			characterId: 'bob',
			name: 'Bob',
			oathName: 'Croisé',
			level: 1,
			pvCur: 10,
			pvMax: 30,
			epCur: 12,
			epMax: 50,
			emCur: 2,
			emMax: 20
		});
		for (let i = 0; i < 40; i++) s = adjustResource(s, 'cf1', 'ep', -1, 'Ajustement');
		const view = projectForPlayer(s, 'alice', { showEnemyNumbers: false });
		expect(view.log).toHaveLength(30);
		expect(view.log[0]!.n).toBe(s.log.length - 29);
		expect(view.fighters[2]?.resources?.epCur).toBe(12);
	});
	it('archives §2.7 : chaînes, objets text, HTML conservé en brut, listes encodées', () => {
		const a = fromLegacyArchive({
			id: 'record',
			phase: 'idle',
			log: ['Tour 1', 'Tour 2'],
			fighters: [{ id: 'wolf', pvCur: 0, type: 'beast' }]
		});
		expect(a.log.map((e) => e.text)).toEqual(['Tour 1', 'Tour 2']);
		expect(a.schemaVersion).toBe(2);
		expect(a.fighters[0]?.pvCur).toBe(0);
		const text = '<img src=x onerror="window.archiveXss=1">Fin du combat.';
		const b = fromLegacyArchive(
			JSON.stringify({
				id: 'arc-0',
				name: 'Expédition 00',
				round: 2,
				savedAt: 1700000000000,
				fighters: [{ type: 'player', pid: 'p_alice', name: 'Alice', pvCur: 12, pvMax: 30 }],
				log: [{ text: 'Une trace <b>polaire</b>.' }, { text }]
			})
		);
		expect(b.fighters[0]).toMatchObject({ characterId: 'p_alice', pvCur: 12, pvMax: 30 });
		expect(b.log[1]?.text).toBe(text);
		expect(projectForPlayer(b, 'p_alice', { showEnemyNumbers: true }).log).toEqual([]);
		expect(
			fromLegacyArchive({
				id: 'browser-arc',
				name: 'Browser combat',
				log: ['turn stored'],
				fighters: []
			}).log[0]?.text
		).toBe('turn stored');
		expect(
			fromLegacyArchive({
				active: false,
				round: 1,
				initiative: 0,
				fighters: [],
				log: [],
				id: null,
				order: [],
				decl: {},
				pendingDrops: []
			}).phase
		).toBe('idle');
		expect(() => fromLegacyArchive({ _stub: true })).toThrow('détail');
		expect(() => fromLegacyArchive('invalid')).toThrow('JSON');
		expect(JSON.parse(JSON.stringify(b))).toEqual(b);
	});
	it('archive active : indices → ids, cibles, ressources, statuts et pendingDrops', () => {
		const s = fromLegacyArchive({
			id: 'old',
			active: true,
			phase: 'resolution',
			round: 4,
			initiative: 1,
			order: [1, 0],
			fighters: [
				{
					type: 'player',
					_cid: 'a',
					pid: 'alice',
					name: 'Alice',
					pvMax: 30,
					pvCur: 20,
					statuts: [{ id: 'gel', tours: 3 }]
				},
				{ type: 'beast', _cid: 'b', bid: 'wolf', name: 'Loup', pvCur: 10, pvMax: 20 }
			],
			decl: { 0: [{ action: 'frappe', kind: 'attack', value: 10, target: 1 }] },
			pendingDrops: [{ fi: 1, gem: 'Gemme Blanche', roll: 61, beastName: 'Loup' }]
		});
		expect(s.order).toEqual(['b', 'a']);
		expect(s.initiative).toBe('b');
		expect(s.declarations.a?.[0]?.target).toBe('b');
		expect(s.fighters[0]?.statuses).toEqual([{ id: 'gel', tours: 3 }]);
		expect(s.drops[0]?.fighterId).toBe('b');
	});
	it('archives actives avec summon / posture : mapping profond indépendant de la source', () => {
		const legacy = {
			id: 'old',
			fighters: JSON.stringify([
				{ type: 'player', _cid: 'a', pid: 'alice', name: 'Alice', pvMax: 30, pvCur: 30 }
			]),
			log: JSON.stringify([
				{ text: '🌀 Alice invoque Tortue Bipède [alice:Tortue Bipède]', type: 'summon' }
			]),
			decl: {
				0: [
					{
						action: 'capacite',
						kind: 'summon',
						summon: {
							name: 'Crabe Canon',
							pv: 8,
							dmg: 4,
							actCost: 6,
							ownerPid: 'alice',
							rangeType: 'distance'
						},
						claymorePosture: { damage: 30, epCost: 10, blockEpDrain: 12, desc: 'Posture' }
					}
				]
			}
		};
		const s = fromLegacyArchive(legacy);
		expect(s.declarations.a?.[0]?.summon).toMatchObject({
			ownerCharacterId: 'alice',
			rangeType: 'distance'
		});
		expect(s.usedSummons).toContain('alice:Tortue Bipède');
		s.declarations.a![0]!.summon!.pv = 1;
		expect(legacy.decl[0][0]!.summon.pv).toBe(8);
	});
});

describe('adaptateur des paliers', () => {
	it('déduplique le plus haut palier accessible par nom sans casse', () => {
		let s = fixture();
		s = {
			...s,
			fighters: s.fighters.map((f, i) =>
				i
					? f
					: {
							...f,
							branch: {
								name: 'A',
								tiers: [
									{ niv: 2, nom: 'Taille Double', cout: '5 EM', desc: '5+Niv dégâts' },
									{ niv: 3, nom: 'TAILLE DOUBLE', cout: '5 EM', desc: '8+Niv dégâts' },
									{ niv: 7, nom: 'Rafale de Lames', cout: '8 EM', desc: '1+Niv dégâts' }
								]
							}
						}
			)
		};
		expect(getAbilityOptions(s, p(s).id)).toHaveLength(1);
		expect(getAbilityOptions(s, p(s).id)[0]).toMatchObject({ value: 11, hits: 2, emCost: 5 });
	});
	it('Soin Enchaîné / Jugement : sacrifice et coût de palier ; éléments 6/4', () => {
		const f = p(fixture()),
			tier = {
				niv: 2,
				nom: 'Soin Enchaîné',
				cout: '5 EM',
				desc: '0 action : 4+Niv ; 1 action : 7+Niv ; 2 actions : 10+Niv'
			};
		expect(
			buildTierAbilityOptions({ ...f, oathName: 'Conjurateur' }, tier, 2).map((a) => [
				a.healAmt,
				a.consumeActions,
				a.emCost
			])
		).toEqual([
			[7, 1, 5],
			[10, 2, 5]
		]);
		expect(
			buildTierAbilityOptions({ ...f, oathName: 'Flécheur' }, { ...tier, nom: 'Jugement' }).map(
				(a) => a.value
			)
		).toEqual([7, 10, 13]);
		for (const desc of ['Feu 8 Glace 5 bonus 7 armure 10', 'Foudre 6 Eau 4 gain 10 drain -5'])
			expect(
				buildTierAbilityOptions(
					{ ...f, oathName: 'Elementaliste' },
					{ ...tier, nom: 'Poings', desc }
				).map((a) => a.emCost)
			).toEqual([6, 4]);
	});
	it('compétence de créature : branche temporelle et dégâts statiques sans +niveau', () => {
		let s = fixture();
		s = {
			...s,
			fighters: s.fighters.map((f, i) =>
				i
					? {
							...f,
							skill:
								'Souffle — Première action du combat : 12 dégâts. En cours de combat : 6 dégâts. 5 EP, 2 actions. zone poison'
						}
					: f
			)
		};
		expect(getAbilityOptions(s, b(s).id)[0]).toMatchObject({
			value: 12,
			epCost: 5,
			consumeActions: 2,
			statusToTarget: 'empoisonne',
			aoe: true,
			dmgStatic: true
		});
		expect(getAbilityOptions({ ...s, round: 2 }, b(s).id)[0]?.value).toBe(6);
	});
});
