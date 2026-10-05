import { describe, expect, it } from 'vitest';
import {
	ALL_ZONES_VALUE,
	CATCHUP_COEF,
	CUMULATIVE_COEF,
	DEFAULT_ZONES,
	MAX_CUSTOM_ZONES,
	NO_ZONE_VALUE,
	SAME_ENCOUNTER_COEF,
	adjustedWeight,
	baseWeight,
	behaviorLabel,
	behaviorMultiplier,
	drawEncounter,
	encounterRecap,
	normalizeZoneList,
	pickWeighted,
	qtyRange,
	resolveZone,
	rollQty,
	transferCombatName,
	weightTone,
	zoneOptions,
	zonePool,
	type SpawnBeast
} from './spawn';

/** Générateur déterministe (LCG) pour les tests de distribution. */
function lcg(seed: number): () => number {
	let s = seed >>> 0;
	return () => {
		s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
		return s / 4294967296;
	};
}

function seq(values: number[]): () => number {
	let i = 0;
	return () => values[i++ % values.length]!;
}

const wolf: SpawnBeast = {
	id: 'b_loup',
	name: 'Loup',
	level: 3,
	behavior: 'Agressif',
	zones: [DEFAULT_ZONES[0]!]
};
const bear: SpawnBeast = {
	id: 'b_ours',
	name: 'Ours',
	level: 5,
	behavior: 'Neutre',
	zones: [DEFAULT_ZONES[0]!]
};
const rabbit: SpawnBeast = {
	id: 'b_lapin',
	name: 'Lapin',
	level: 1,
	behavior: 'Gibier',
	zones: [DEFAULT_ZONES[0]!]
};
const boss: SpawnBeast = {
	id: 'b_boss',
	name: 'Vieux Roi',
	level: 9,
	behavior: 'Boss',
	zones: [DEFAULT_ZONES[1]!]
};
const ghost: SpawnBeast = {
	id: 'b_spectre',
	name: 'Spectre',
	level: 4,
	behavior: 'Passif',
	hidden: true,
	zones: [DEFAULT_ZONES[0]!]
};

describe('coefficients (audit 03 §10.3)', () => {
	it('expose les valeurs exactes du legacy', () => {
		expect(CUMULATIVE_COEF).toBe(0.22);
		expect(CATCHUP_COEF).toBe(0.14);
		expect(SAME_ENCOUNTER_COEF).toBe(0.95);
	});

	it('expose les cinq zones par défaut (legacy main.js:13854-13860)', () => {
		expect(DEFAULT_ZONES).toEqual([
			'[🌳]-forêt-aux-lianes',
			'[🌳]-forêt-aux-arbres-sombres',
			'[🌳]-arbre-géant',
			'[🌳]-forêt-centre',
			'[🌳]-lisière-du-canyon'
		]);
	});
});

describe('behaviorLabel / behaviorMultiplier (legacy main.js:7427-7454, 14019-14029)', () => {
	it('normalise les alias, accents et indices', () => {
		expect(behaviorLabel('tres agressif')).toBe('Très agressif');
		expect(behaviorLabel('Très Agressif')).toBe('Très agressif');
		expect(behaviorLabel('very_aggressive')).toBe('Très agressif');
		expect(behaviorLabel('prey')).toBe('Gibier');
		expect(behaviorLabel('BOSS')).toBe('Boss');
		expect(behaviorLabel(1)).toBe('Gibier');
		expect(behaviorLabel('5')).toBe('Très agressif');
		expect(behaviorLabel('inconnu')).toBeNull();
		expect(behaviorLabel(null)).toBeNull();
	});

	it('applique la table behMult', () => {
		expect(behaviorMultiplier('Gibier')).toBe(1.08);
		expect(behaviorMultiplier('Passif')).toBe(0.92);
		expect(behaviorMultiplier('Neutre')).toBe(1);
		expect(behaviorMultiplier('Agressif')).toBe(1.12);
		expect(behaviorMultiplier('Très agressif')).toBe(1.2);
		expect(behaviorMultiplier('Boss')).toBe(0.4);
		expect(behaviorMultiplier('???')).toBe(1);
	});
});

describe('baseWeight (audit 03 §10.3)', () => {
	it('calcule 96 × behMult × levelFactor arrondi', () => {
		// Agressif niv 3 : levelFactor = 1.42 − 0.18 = 1.24 ; 96 × 1.12 × 1.24 = 133.3 → 133
		expect(baseWeight(wolf)).toBe(133);
		// Neutre niv 1 : 96 × 1 × 1.42 = 136.32 → 136
		expect(baseWeight({ level: 1, behavior: 'Neutre' })).toBe(136);
		// Gibier niv 1 : 96 × 1.08 × 1.42 = 147.2 → 147
		expect(baseWeight(rabbit)).toBe(147);
	});

	it('plancher du levelFactor à 0.24 et plancher global à 8', () => {
		// niv 20 : 1.42 − 19 × 0.09 = −0.29 → 0.24 ; Passif : 96 × 0.92 × 0.24 = 21.2 → 21
		expect(baseWeight({ level: 20, behavior: 'Passif' })).toBe(21);
		// Boss niv 20 : 96 × 0.4 × 0.24 = 9.2 → 9 ; plafond 22 sans effet
		expect(baseWeight({ level: 20, behavior: 'Boss' })).toBe(9);
		// poids explicite dans ]0, 0.5[ : arrondi à 0 sans plancher (quirk legacy main.js:14033 conservé)
		expect(baseWeight({ level: 20, behavior: 'Boss', spawnWeight: 0.2 })).toBe(0);
	});

	it('plafonne le Boss à 22', () => {
		// Boss niv 1 : 96 × 0.4 × 1.42 = 54.5 → min(…, 22) = 22
		expect(baseWeight({ level: 1, behavior: 'Boss' })).toBe(22);
	});

	it('préfère le poids explicite > 0, arrondi', () => {
		expect(baseWeight({ level: 1, behavior: 'Neutre', spawnWeight: 40.6 })).toBe(41);
		expect(baseWeight({ level: 1, behavior: 'Neutre', spawnWeight: 0 })).toBe(136);
		expect(baseWeight({ level: 1, behavior: 'Neutre', spawnWeight: null })).toBe(136);
		expect(baseWeight({ level: 1, behavior: 'Neutre', spawnWeight: -3 })).toBe(136);
	});

	it('niveau invalide ⇒ niveau 1', () => {
		expect(baseWeight({ level: Number.NaN, behavior: 'Neutre' })).toBe(136);
		expect(baseWeight({ level: 0, behavior: 'Neutre' })).toBe(136);
	});
});

describe('qtyRange (audit 03 §10.4)', () => {
	it('utilise les bornes saisies si valides', () => {
		expect(qtyRange({ level: 3, behavior: 'Neutre', qtyMin: 2, qtyMax: 5 })).toEqual({
			min: 2,
			max: 5
		});
		expect(qtyRange({ level: 3, behavior: 'Neutre', qtyMin: 0, qtyMax: 5 })).toEqual({
			min: 1,
			max: 3
		});
		expect(qtyRange({ level: 3, behavior: 'Neutre', qtyMin: 4, qtyMax: 2 })).toEqual({
			min: 1,
			max: 3
		});
		expect(qtyRange({ level: 3, behavior: 'Neutre', qtyMin: null, qtyMax: null })).toEqual({
			min: 1,
			max: 3
		});
	});

	it('table par comportement au niveau 3..6', () => {
		expect(qtyRange({ level: 4, behavior: 'Gibier' })).toEqual({ min: 1, max: 4 });
		expect(qtyRange({ level: 4, behavior: 'Passif' })).toEqual({ min: 1, max: 3 });
		expect(qtyRange({ level: 4, behavior: 'Neutre' })).toEqual({ min: 1, max: 3 });
		expect(qtyRange({ level: 4, behavior: 'Agressif' })).toEqual({ min: 1, max: 2 });
		expect(qtyRange({ level: 4, behavior: 'Très agressif' })).toEqual({ min: 1, max: 2 });
		expect(qtyRange({ level: 4, behavior: 'inconnu' })).toEqual({ min: 1, max: 2 });
	});

	it('niv ≤ 2 : +1 ; Gibier niv ≤ 2 : +1 encore', () => {
		expect(qtyRange({ level: 2, behavior: 'Neutre' })).toEqual({ min: 1, max: 4 });
		expect(qtyRange({ level: 1, behavior: 'Gibier' })).toEqual({ min: 1, max: 6 });
	});

	it('niv ≥ 7 : max = max(2, max − 1)', () => {
		expect(qtyRange({ level: 7, behavior: 'Gibier' })).toEqual({ min: 1, max: 3 });
		expect(qtyRange({ level: 8, behavior: 'Agressif' })).toEqual({ min: 1, max: 2 });
	});

	it('niv ≥ 9 ou Boss : [1, 1]', () => {
		expect(qtyRange({ level: 9, behavior: 'Gibier' })).toEqual({ min: 1, max: 1 });
		expect(qtyRange({ level: 1, behavior: 'Boss' })).toEqual({ min: 1, max: 1 });
		// même avec des bornes saisies invalides
		expect(qtyRange({ level: 12, behavior: 'Neutre', qtyMin: 0, qtyMax: 9 })).toEqual({
			min: 1,
			max: 1
		});
	});
});

describe('zones (audit 03 §10.2)', () => {
	it('normalizeZoneList : défauts en tête, dédoublonnage, 80 max', () => {
		const list = normalizeZoneList([
			'  grotte ',
			DEFAULT_ZONES[2]!,
			'',
			'grotte',
			null as unknown as string
		]);
		expect(list.slice(0, 5)).toEqual([...DEFAULT_ZONES]);
		expect(list).toHaveLength(6);
		expect(list[5]).toBe('grotte');
		const many = Array.from({ length: 200 }, (_, i) => `z${i}`);
		expect(normalizeZoneList(many)).toHaveLength(MAX_CUSTOM_ZONES);
	});

	it('zoneOptions : union custom ∪ zones des créatures visibles, « Sans zone » en dernier', () => {
		const nowhere: SpawnBeast = { id: 'b_x', name: 'X', level: 1, behavior: 'Neutre', zones: [] };
		const opts = zoneOptions(['Zébrure'], [wolf, ghost, nowhere, { ...bear, zones: ['Abysses'] }]);
		const labels = opts.map((o) => o.label);
		expect(labels[labels.length - 1]).toBe('Sans zone');
		expect(opts[opts.length - 1]!.value).toBe(NO_ZONE_VALUE);
		expect(labels).toContain('Abysses');
		expect(labels).toContain('Zébrure');
		for (const z of DEFAULT_ZONES) expect(labels).toContain(z);
		// tri français insensible à la casse/accents : Abysses avant les [🌳]-… ? Non : « [ » trie avant les lettres.
		expect(labels.indexOf('Abysses')).toBeLessThan(labels.indexOf('Zébrure'));
	});

	it('resolveZone : première option si inconnue, __all__ sans option', () => {
		const opts = zoneOptions([], [wolf]);
		expect(resolveZone('nope', opts)).toEqual(opts[0]);
		expect(resolveZone(DEFAULT_ZONES[3], opts).value).toBe(DEFAULT_ZONES[3]);
		expect(resolveZone('x', [])).toEqual({ value: ALL_ZONES_VALUE, label: 'Toutes zones' });
	});

	it('zonePool : créatures visibles de la zone ; masquées et archivées exclues', () => {
		const archived: SpawnBeast = { ...bear, id: 'b_arch', archived: true };
		expect(
			zonePool(DEFAULT_ZONES[0]!, [wolf, bear, rabbit, boss, ghost, archived]).map((b) => b.id)
		).toEqual(['b_loup', 'b_ours', 'b_lapin']);
		expect(zonePool(ALL_ZONES_VALUE, [wolf, boss, ghost]).map((b) => b.id)).toEqual([
			'b_loup',
			'b_boss'
		]);
		const nowhere: SpawnBeast = { id: 'b_x', name: 'X', level: 1, behavior: 'Neutre' };
		expect(zonePool(NO_ZONE_VALUE, [wolf, nowhere]).map((b) => b.id)).toEqual(['b_x']);
	});
});

describe('adjustedWeight (audit 03 §10.3)', () => {
	const pool = [wolf, bear];

	it('sans historique : poids = base, fatigue = rattrapage = 1', () => {
		const w = adjustedWeight(wolf, pool, {});
		expect(w).toMatchObject({
			base: 133,
			count: 0,
			avg: 0,
			fatigue: 1,
			catchup: 1,
			weight: 133,
			eligible: true
		});
	});

	it('fatigue et rattrapage autour de la moyenne du pool', () => {
		// totals loup 6, ours 2 → avg 4 ; loup over 2 → fatigue 1.44 ; ours under 2 → catchup 1.28
		const totals = { b_loup: 6, b_ours: 2 };
		const w = adjustedWeight(wolf, pool, totals);
		expect(w.fatigue).toBeCloseTo(1 + 2 * 0.22, 10);
		expect(w.catchup).toBe(1);
		expect(w.weight).toBeCloseTo(133 / 1.44, 10);
		const o = adjustedWeight(bear, pool, totals);
		expect(o.fatigue).toBe(1);
		expect(o.catchup).toBeCloseTo(1 + 2 * 0.14, 10);
		// Neutre niv 5 : 96 × (1.42 − 0.36 = 1.06) = 101.76 → 102
		expect(o.base).toBe(102);
		expect(o.weight).toBeCloseTo(102 * 1.28, 10);
	});

	it('pénalité de rencontre : /(1 + n × 0.95) puis × 0.55 si pool > 1', () => {
		const w = adjustedWeight(wolf, pool, {}, { b_loup: 2 });
		expect(w.weight).toBeCloseTo((133 / (1 + 2 * 0.95)) * 0.55, 10);
		const solo = adjustedWeight(wolf, [wolf], {}, { b_loup: 2 });
		expect(solo.weight).toBeCloseTo(133 / (1 + 2 * 0.95), 10);
	});

	it('un poids ≤ 0.5 rend le candidat inéligible', () => {
		// base 8 (plancher) avec une fatigue énorme : totals 100 contre une moyenne de 50
		const tiny: SpawnBeast = {
			id: 'b_tiny',
			name: 'T',
			level: 20,
			behavior: 'Boss',
			spawnWeight: 1
		};
		const other: SpawnBeast = { id: 'b_o', name: 'O', level: 1, behavior: 'Neutre' };
		const w = adjustedWeight(tiny, [tiny, other], { b_tiny: 100, b_o: 0 });
		// fatigue = 1 + 50 × 0.22 = 12 ; weight = 1/12 ≈ 0.083
		expect(w.weight).toBeCloseTo(1 / 12, 10);
		expect(w.eligible).toBe(false);
	});
});

describe('pickWeighted / rollQty (legacy main.js:14108-14118, 14164-14170)', () => {
	it('tire proportionnellement avec rng injecté (roll ≤ acc)', () => {
		const list = [
			{ id: 'a', weight: 10 },
			{ id: 'b', weight: 30 }
		];
		expect(pickWeighted(list, () => 0)!.id).toBe('a');
		expect(pickWeighted(list, () => 0.25)!.id).toBe('a'); // 10 ≤ 10
		expect(pickWeighted(list, () => 0.26)!.id).toBe('b');
		expect(pickWeighted(list, () => 0.999)!.id).toBe('b');
		expect(pickWeighted([], () => 0.5)).toBeNull();
		expect(pickWeighted([{ weight: 0 }], () => 0.5)).toBeNull();
	});

	it('rollQty : uniforme entier dans [min, max]', () => {
		expect(rollQty(1, 1, () => 0.7)).toBe(1);
		expect(rollQty(1, 4, () => 0)).toBe(1);
		expect(rollQty(1, 4, () => 0.5)).toBe(3);
		expect(rollQty(1, 4, () => 0.999999)).toBe(4);
		expect(rollQty(2, 3, () => 0.49)).toBe(2);
		expect(rollQty(2, 3, () => 0.5)).toBe(3);
	});
});

describe('drawEncounter (audit 03 §10.5)', () => {
	const beasts = [wolf, bear, rabbit, boss, ghost];

	it('renvoie null si le pool est vide', () => {
		expect(drawEncounter('Nulle part', beasts, { totals: {} }, () => 0.5)).toBeNull();
		expect(drawEncounter(DEFAULT_ZONES[0]!, [ghost], { totals: {} }, () => 0.5)).toBeNull();
	});

	it('exclut du tirage un candidat sous le seuil 0.5 (jamais tiré, prob 0)', () => {
		const tiny: SpawnBeast = {
			id: 'b_tiny',
			name: 'T',
			level: 20,
			behavior: 'Boss',
			spawnWeight: 1,
			zones: ['Z']
		};
		const other: SpawnBeast = {
			id: 'b_o',
			name: 'O',
			level: 20,
			behavior: 'Boss',
			spawnWeight: 1,
			zones: ['Z']
		};
		// moyenne 50 ; tiny over 50 → 1/12 ≈ 0.083 (inéligible) ; other under 50 → 1 × 8 = 8
		const rng = lcg(3);
		for (let i = 0; i < 200; i++) {
			const r = drawEncounter('Z', [tiny, other], { totals: { b_tiny: 100 } }, rng)!;
			expect(r.packs[0]!.id).toBe('b_o');
			expect(r.weights.find((w) => w.beastId === 'b_tiny')).toMatchObject({
				eligible: false,
				prob: 0
			});
			expect(r.weights.find((w) => w.beastId === 'b_o')).toMatchObject({ eligible: true, prob: 1 });
		}
		// Note : avec un pool non vide, « Aucun tirage possible » n'est atteignable que si tous les
		// poids explicites sont dans ]0, 0.5[ (arrondis à 0) : la moyenne du pool garantit sinon
		// au moins un membre sans fatigue, donc de poids ≥ base ≥ 1 > 0.5.
		const zero: SpawnBeast = {
			id: 'b_z',
			name: 'Z',
			level: 1,
			behavior: 'Neutre',
			spawnWeight: 0.3,
			zones: ['Z']
		};
		expect(drawEncounter('Z', [zero], { totals: {} }, () => 0)).toBeNull();
	});

	it('un seul groupe par roll, historique incrémenté de qty, prob renseignée', () => {
		const r = drawEncounter(DEFAULT_ZONES[0]!, beasts, { totals: { b_ours: 2 } }, seq([0, 0.999]));
		expect(r).not.toBeNull();
		expect(r!.packs).toHaveLength(1);
		const pack = r!.packs[0]!;
		// rng 0 → premier candidat du pool (loup) ; rng 0.999 → qty max (Agressif niv 3 → [1,2])
		expect(pack.id).toBe('b_loup');
		expect(pack.qty).toBe(2);
		expect(pack.range).toEqual({ min: 1, max: 2 });
		expect(pack.total).toBe(0);
		expect(pack.behavior).toBe('Agressif');
		expect(pack.hidden).toBe(false);
		expect(pack.baseWeight).toBe(133);
		expect(r!.totals).toEqual({ b_ours: 2, b_loup: 2 });
		const sum = r!.weights.reduce((s, w) => s + (w.eligible ? w.weight : 0), 0);
		expect(pack.prob).toBeCloseTo(pack.weightNow / sum, 10);
		expect(r!.weights.map((w) => w.beastId)).toEqual(['b_loup', 'b_ours', 'b_lapin']);
		expect(r!.weights.reduce((s, w) => s + w.prob, 0)).toBeCloseTo(1, 10);
	});

	it("ne mute pas l'historique fourni et ignore les totaux ≤ 0", () => {
		const history = { totals: { b_loup: 3, b_ours: 0, b_lapin: -2 } };
		const r = drawEncounter(DEFAULT_ZONES[0]!, beasts, history, () => 0.999);
		expect(history.totals).toEqual({ b_loup: 3, b_ours: 0, b_lapin: -2 });
		expect(r!.totals.b_ours).toBeUndefined();
		expect(r!.totals.b_lapin).toBeGreaterThan(0);
	});

	it('distribution : sans historique, les fréquences suivent les poids de base', () => {
		const rng = lcg(42);
		const counts: Record<string, number> = { b_loup: 0, b_ours: 0, b_lapin: 0 };
		const n = 20000;
		for (let i = 0; i < n; i++) {
			const r = drawEncounter(DEFAULT_ZONES[0]!, beasts, { totals: {} }, rng)!;
			counts[r.packs[0]!.id]! += 1;
		}
		const total = 133 + 102 + 147;
		expect(counts.b_loup! / n).toBeCloseTo(133 / total, 1);
		expect(counts.b_ours! / n).toBeCloseTo(102 / total, 1);
		expect(counts.b_lapin! / n).toBeCloseTo(147 / total, 1);
	});

	it('distribution : fatigue / rattrapage rééquilibrent une créature sur-tirée', () => {
		const rng = lcg(7);
		// loup 10 sorties, les autres 0 → avg 3.33 ; loup fatigué ×1/(1+6.67×0.22)=1/2.47, autres boostés ×1.47
		const totals = { b_loup: 10 };
		const counts: Record<string, number> = { b_loup: 0, b_ours: 0, b_lapin: 0 };
		const n = 20000;
		for (let i = 0; i < n; i++) {
			const r = drawEncounter(DEFAULT_ZONES[0]!, beasts, { totals }, rng)!;
			counts[r.packs[0]!.id]! += 1;
		}
		const avg = 10 / 3;
		const wWolf = 133 / (1 + (10 - avg) * 0.22);
		const wBear = 102 * (1 + avg * 0.14);
		const wRabbit = 147 * (1 + avg * 0.14);
		const sum = wWolf + wBear + wRabbit;
		expect(counts.b_loup! / n).toBeCloseTo(wWolf / sum, 1);
		expect(counts.b_ours! / n).toBeCloseTo(wBear / sum, 1);
		expect(counts.b_lapin! / n).toBeCloseTo(wRabbit / sum, 1);
		expect(counts.b_loup!).toBeLessThan(counts.b_ours!);
	});

	it('itérer les tirages en réinjectant totals converge vers un équilibre', () => {
		const rng = lcg(99);
		let totals: Record<string, number> = {};
		for (let i = 0; i < 3000; i++) {
			const r = drawEncounter(DEFAULT_ZONES[0]!, beasts, { totals }, rng)!;
			totals = r.totals;
		}
		const values = Object.values(totals);
		expect(values).toHaveLength(3);
		const max = Math.max(...values);
		const min = Math.min(...values);
		// « un mob qui sort baisse, les autres remontent » : écart relatif contenu
		expect((max - min) / max).toBeLessThan(0.35);
	});
});

describe('présentation', () => {
	it('weightTone : Réduit < 0.94, Boost > 1.06', () => {
		expect(weightTone(100, 93)).toBe('Réduit');
		expect(weightTone(100, 94)).toBe('Stable');
		expect(weightTone(100, 106)).toBe('Stable');
		expect(weightTone(100, 107)).toBe('Boost');
	});

	it('transferCombatName : « Apparition — <zone> — JJ/MM/AA HH:MM — <auteur> »', () => {
		const d = new Date(2026, 8, 30, 21, 5);
		expect(transferCombatName(DEFAULT_ZONES[0]!, d, 'Alice')).toBe(
			'Apparition — [🌳]-forêt-aux-lianes — 30/09/26 21:05 — Alice'
		);
		expect(transferCombatName(NO_ZONE_VALUE, d, 'Bob')).toContain('— Sans zone —');
	});

	it('encounterRecap : format copiable', () => {
		expect(
			encounterRecap(DEFAULT_ZONES[0]!, [
				{ qty: 2, name: 'Loup' },
				{ qty: 1, name: 'Ours' }
			])
		).toBe(
			"**Générateur d'apparitions**\nZone [🌳]-forêt-aux-lianes\n**Roll** — 2x Loup • 1x Ours"
		);
	});
});
