import { describe, expect, it } from 'vitest';
import {
	BASE_STATS,
	GEM_NAMES,
	XP_PER_LEVEL,
	adjustLevel,
	applyXp,
	clampResources,
	combatXp,
	combatXpEntryText,
	fuseGems,
	gemKindOf,
	gemStock,
	gemXp,
	growthFor,
	legacyTrack,
	maxAtLevel,
	newProgressionState,
	normalizeLegacyProgression,
	previewXp,
	xpMax
} from './progression';
import type { Growth, InventoryItemLike, ProgressionState } from './types';

/** Fiche de test de `legacy/scripts/test-unified-progression.js:11-16`. */
function legacy(changes: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		id: 'p_alice',
		name: 'Alice',
		classe: 'Duelliste',
		branch: 'Aucune',
		level: 2,
		xp: 15,
		xpMax: 60,
		sLevel: 5,
		sXp: 25,
		sXpMax: 50,
		pvMax: 41,
		pvCur: 31,
		epMax: 56,
		epCur: 20,
		emMax: 22,
		emCur: 7,
		inventory: [],
		history: [],
		...changes
	};
}

function expectUnified(record: Record<string, unknown>, level: number, xp: number): void {
	expect(record.level).toBe(level);
	expect(record.xp).toBe(xp);
	expect(record.xpMax).toBe(level * 30);
	expect(record.progressionVersion).toBe(1);
	expect(Object.hasOwn(record, 'sLevel')).toBe(false);
	expect(Object.hasOwn(record, 'sXp')).toBe(false);
	expect(Object.hasOwn(record, 'sXpMax')).toBe(false);
}

/** Croissances natives attendues (audit 02 §3.1 DEFAULT_GROWTH et §5.14). */
const EXPECTED_GROWTH: Record<string, [number, number, number]> = {
	Duelliste: [6, 6, 2],
	Sauvageon: [5, 8, 1],
	Croisé: [8, 3, 2],
	Rôdeur: [2, 5, 3],
	Traqueur: [2, 7, 2],
	Flécheur: [3, 5, 4],
	Elementaliste: [4, 4, 4],
	Evocateur: [2, 3, 6],
	Conjurateur: [2, 2, 7],
	Arcaniste: [1, 1, 8],
	Bretteur: [5, 7, 3],
	Claymore: [7, 4, 2],
	"Lame d'Honneur": [7, 5, 3]
};

describe('xpMax', () => {
	it('vaut niveau × 30 (audit 02 §2.1)', () => {
		expect(XP_PER_LEVEL).toBe(30);
		expect(xpMax(1)).toBe(30);
		expect(xpMax(2)).toBe(60);
		expect(xpMax(5)).toBe(150);
		expect(xpMax(10)).toBe(300);
	});

	it('tolère les niveaux invalides (plancher 1, partie entière)', () => {
		expect(xpMax(0)).toBe(30);
		expect(xpMax(-3)).toBe(30);
		expect(xpMax(3.9)).toBe(90);
		expect(xpMax(Number.NaN)).toBe(30);
	});
});

describe('growthFor', () => {
	it('renvoie la croissance de chaque Serment natif, par nom et par id', () => {
		for (const [name, [pvN, epN, emN]] of Object.entries(EXPECTED_GROWTH)) {
			expect(growthFor(name), name).toEqual({ pvN, epN, emN });
		}
		expect(growthFor('duelliste')).toEqual({ pvN: 6, epN: 6, emN: 2 });
		expect(growthFor('lame-d-honneur')).toEqual({ pvN: 7, epN: 5, emN: 3 });
		expect(growthFor('Élémentaliste')).toEqual({ pvN: 4, epN: 4, emN: 4 });
	});

	it('renvoie [0,0,0] pour un Serment inconnu ou vide', () => {
		expect(growthFor('Glacier')).toEqual({ pvN: 0, epN: 0, emN: 0 });
		expect(growthFor('')).toEqual({ pvN: 0, epN: 0, emN: 0 });
		expect(growthFor(null)).toEqual({ pvN: 0, epN: 0, emN: 0 });
	});

	it('fusionne une surcharge partielle (test-unified-progression.js:71)', () => {
		expect(growthFor('Duelliste', { Duelliste: { pvN: 10 } })).toEqual({ pvN: 10, epN: 6, emN: 2 });
		expect(growthFor('duelliste', { Duelliste: { pvN: 10 } })).toEqual({ pvN: 10, epN: 6, emN: 2 });
		expect(growthFor('Glacier', { Glacier: { pvN: 11, epN: 0, emN: 7 } })).toEqual({
			pvN: 11,
			epN: 0,
			emN: 7
		});
		expect(growthFor('Duelliste', { Duelliste: null })).toEqual({ pvN: 6, epN: 6, emN: 2 });
		expect(growthFor('Duelliste', { Duelliste: { pvN: Number.NaN } })).toEqual({
			pvN: 6,
			epN: 6,
			emN: 2
		});
	});
});

describe('maxAtLevel et combatXp', () => {
	it('recalcule base + (niveau − 1) × gain (audit 02 §2.3, §5.14)', () => {
		expect(maxAtLevel(1, growthFor('Duelliste'))).toEqual({ pvMax: 30, epMax: 50, emMax: 20 });
		expect(maxAtLevel(10, growthFor('Duelliste'))).toEqual({ pvMax: 84, epMax: 104, emMax: 38 });
		expect(maxAtLevel(10, growthFor('Arcaniste'))).toEqual({ pvMax: 39, epMax: 59, emMax: 92 });
		expect(BASE_STATS).toEqual({ pv: 30, ep: 50, em: 20 });
	});

	it('calcule ceil(niveau_mob × 10 × participation %) (audit 02 §2.4)', () => {
		expect(combatXp(3, 100)).toBe(30);
		expect(combatXp(3, 50)).toBe(15);
		expect(combatXp(1, 33)).toBe(4);
		expect(combatXp(2, 0)).toBe(0);
		expect(combatXp(0, 100)).toBe(10);
		expect(combatXpEntryText(15, 'Loup des brumes', 50)).toBe('+15 XP (Loup des brumes, 50%)');
	});
});

describe('applyXp', () => {
	const growth: Growth = { pvN: 7, epN: 8, emN: 9 };
	const hero: ProgressionState = {
		level: 1,
		xp: 0,
		pvMax: 30,
		pvCur: 12,
		epMax: 50,
		epCur: 15,
		emMax: 20,
		emCur: 8
	};

	it('résout plusieurs niveaux d’un coup avec soin complet (test-gameplay-persistence.js:25-38)', () => {
		const result = applyXp(hero, 90, growth);
		expect(result.levelsGained).toBe(2);
		expect(result.levelsReached).toEqual([2, 3]);
		expect([result.character.level, result.character.xp]).toEqual([3, 0]);
		expect(xpMax(result.character.level)).toBe(90);
		expect([result.character.pvMax, result.character.epMax, result.character.emMax]).toEqual([
			44, 66, 38
		]);
		expect([result.character.pvCur, result.character.epCur, result.character.emCur]).toEqual([
			44, 66, 38
		]);
		expect(result.entries.map((e) => e.text)).toEqual([
			'⬆ Niveau 2 ! PV:37 EP:58 EM:29 — Palier I — Éveil débloqué',
			'⬆ Niveau 3 ! PV:44 EP:66 EM:38'
		]);
		expect(result.entries.every((e) => e.type === 'level' && e.actorName === 'Système')).toBe(true);
	});

	it('conserve l’excédent d’XP (fusion-xp.md)', () => {
		const result = applyXp(hero, 35, growth);
		expect(result.character.level).toBe(2);
		expect(result.character.xp).toBe(5);
		expect(result.levelsGained).toBe(1);
	});

	it('ne modifie pas la fiche d’entrée', () => {
		const before = structuredClone(hero);
		applyXp(hero, 90, growth);
		expect(hero).toEqual(before);
	});

	it('n’ajoute rien sous le seuil', () => {
		const result = applyXp(hero, 10, growth);
		expect(result.character).toEqual({ ...hero, xp: 10 });
		expect(result.levelsGained).toBe(0);
		expect(result.entries).toEqual([]);
	});

	it('laisse les ressources intactes si le Serment est inconnu (main.js:9313 `if(s)`)', () => {
		const result = applyXp(hero, 30, null);
		expect(result.character.level).toBe(2);
		expect([result.character.pvMax, result.character.pvCur]).toEqual([30, 12]);
		expect(result.entries[0]?.text).toBe(
			'⬆ Niveau 2 ! PV:30 EP:50 EM:20 — Palier I — Éveil débloqué'
		);
	});

	it('plancher l’XP à 0 sans descente de niveau pour un montant négatif (audit 02 §2.5)', () => {
		const result = applyXp({ ...hero, level: 3, xp: 10 }, -50, growth);
		expect([result.character.level, result.character.xp]).toEqual([3, 0]);
		expect(result.levelsGained).toBe(0);
	});

	it('nomme les paliers Aguerris pour un rang seasoned (main.js:9300)', () => {
		const result = applyXp({ ...hero, level: 9, xp: 0 }, 270, growth, { rank: 'seasoned' });
		expect(result.character.level).toBe(10);
		expect(result.entries[0]?.text).toContain('— Aguerri I — Éveil débloqué');
	});

	it('peut conserver le déficit au lieu de soigner (option, progression.js:72)', () => {
		const result = applyXp(hero, 30, growth, { healOnLevelUp: false });
		expect([result.character.pvMax, result.character.pvCur]).toEqual([37, 19]);
		expect([result.character.epMax, result.character.epCur]).toEqual([58, 23]);
		const knockedOut = applyXp({ ...hero, pvCur: 0 }, 30, growth, { healOnLevelUp: false });
		expect(knockedOut.character.pvCur).toBe(0);
	});

	it('previewXp donne le même résultat sans effet', () => {
		expect(previewXp(hero, 90)).toEqual({ level: 3, xp: 0, xpMax: 90, levelsGained: 2 });
		expect(previewXp({ level: 2, xp: 50 }, 5)).toEqual({
			level: 2,
			xp: 55,
			xpMax: 60,
			levelsGained: 0
		});
	});
});

describe('adjustLevel', () => {
	const growth: Growth = { pvN: 7, epN: 8, emN: 9 };

	it('recalcule les maxima et transpose la fraction (test-gameplay-persistence.js:39-42)', () => {
		const afterLevelUp: ProgressionState = {
			level: 3,
			xp: 0,
			pvMax: 44,
			pvCur: 44,
			epMax: 66,
			epCur: 66,
			emMax: 38,
			emCur: 38
		};
		const result = adjustLevel(afterLevelUp, -1, growth);
		expect([result.level, result.xp, xpMax(result.level)]).toEqual([2, 0, 60]);
		expect([result.pvMax, result.epMax, result.emMax]).toEqual([37, 58, 29]);
		expect([result.pvCur, result.epCur, result.emCur]).toEqual([37, 58, 29]);
	});

	it('conserve la fraction d’XP avec arrondi supérieur borné à xpMax − 1', () => {
		const state = { ...newProgressionState(), level: 2, xp: 59 };
		const up = adjustLevel(state, 1, growth);
		expect([up.level, up.xp]).toEqual([3, 89]);
		const down = adjustLevel(state, -1, growth);
		expect([down.level, down.xp]).toEqual([1, 29]);
	});

	it('ne descend jamais sous le niveau 1 et ignore les stats sans Serment', () => {
		const state = newProgressionState();
		const result = adjustLevel({ ...state, pvMax: 99 }, -5, null);
		expect(result.level).toBe(1);
		expect(result.pvMax).toBe(99);
	});
});

describe('Gemmes de Sang', () => {
	const items: InventoryItemLike[] = [
		{ name: 'Gemme Blanche', category: 'Gemme', qty: 2 },
		{ name: 'gemme blanche', category: 'Gemme', qty: 3 },
		{ name: 'Blanche', category: 'Gemme', qty: 0 },
		{ name: 'Gemme Écarlate', category: 'Gemme', qty: 1 },
		{ name: 'Gemme Incarnate', category: 'Divers', qty: 4 },
		{ name: 'Potion boréale', category: 'Consommable', qty: 2 }
	];

	it('donne +5 / +20 / +50 XP selon le grade (audit 02 §6)', () => {
		expect(gemXp('blanche')).toBe(5);
		expect(gemXp('incarnate')).toBe(20);
		expect(gemXp('ecarlate')).toBe(50);
		expect(GEM_NAMES).toEqual({
			blanche: 'Gemme Blanche',
			incarnate: 'Gemme Incarnate',
			ecarlate: 'Gemme Écarlate'
		});
	});

	it('reconnaît les gemmes par catégorie et nom normalisé (main.js:9395-9401)', () => {
		expect(gemKindOf({ name: 'Gemme Écarlate', category: 'Gemme' })).toBe('ecarlate');
		expect(gemKindOf({ name: 'ECARLATE', category: 'Gemme' })).toBe('ecarlate');
		expect(gemKindOf({ name: 'Gemme Incarnate', category: 'Divers' })).toBeNull();
		expect(gemKindOf({ name: 'Gemme Noire', category: 'Gemme' })).toBeNull();
	});

	it('compte le stock (qty > 0 uniquement)', () => {
		expect(gemStock(items, 'blanche')).toBe(5);
		expect(gemStock(items, 'ecarlate')).toBe(1);
		expect(gemStock(items, 'incarnate')).toBe(0);
	});

	it('fusionne en retirant le stock objet par objet et crédite l’XP (main.js:9414-9433)', () => {
		const hero = newProgressionState();
		const result = fuseGems(hero, items, 'blanche', 4, growthFor('Duelliste'), {
			actorName: 'MJ Maitre'
		});
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.total).toBe(20);
		expect(result.items.map((i) => i.qty)).toEqual([0, 1, 0, 1, 4, 2]);
		expect(result.character.xp).toBe(20);
		expect(result.levelsGained).toBe(0);
		expect(result.entries).toEqual([
			{ type: 'gemme', text: '+20 XP (fusion de 4× Gemme Blanche)', actorName: 'MJ Maitre' }
		]);
		expect(items[0]?.qty).toBe(2);
	});

	it('enchaîne les montées de niveau après l’entrée gemme', () => {
		const hero = newProgressionState();
		const result = fuseGems(hero, items, 'ecarlate', 1, growthFor('Duelliste'));
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect([result.character.level, result.character.xp]).toEqual([2, 20]);
		expect(result.character.pvMax).toBe(36);
		expect(result.entries.map((e) => e.type)).toEqual(['gemme', 'level']);
		expect(result.entries[0]?.text).toBe('+50 XP (fusion de 1× Gemme Écarlate)');
	});

	it('refuse si le stock est insuffisant sans rien modifier', () => {
		const result = fuseGems(newProgressionState(), items, 'blanche', 6, growthFor('Duelliste'));
		expect(result).toEqual({
			ok: false,
			code: 'GEM_STOCK_INSUFFICIENT',
			message: 'Pas assez de gemmes en inventaire (5 disponible(s)).',
			stock: 5,
			qty: 6
		});
		expect(fuseGems(newProgressionState(), items, 'incarnate', 1, null).ok).toBe(false);
	});

	it('borne la quantité entre 1 et 99', () => {
		const many: InventoryItemLike[] = [{ name: 'Gemme Blanche', category: 'Gemme', qty: 500 }];
		const min = fuseGems(newProgressionState(), many, 'blanche', 0, null);
		expect(min.ok && min.qty).toBe(1);
		const max = fuseGems(newProgressionState(), many, 'blanche', 200, null);
		expect(max.ok && max.qty).toBe(99);
		expect(max.ok && max.total).toBe(495);
	});
});

describe('legacyTrack', () => {
	it('résout les seuils déjà atteints (progression.js:27-44)', () => {
		expect(legacyTrack(1, 30, 30, 30)).toEqual({ level: 2, fraction: 0 });
		// Seuil enregistré 10, puis 20 et 30 : reste 5 XP sur le seuil 40 du niveau 4.
		expect(legacyTrack(1, 65, 10, 10)).toEqual({ level: 4, fraction: 0.125 });
		expect(legacyTrack(5, 25, 50, 10)).toEqual({ level: 5, fraction: 0.5 });
		expect(legacyTrack(2, 15, undefined, 30)).toEqual({ level: 2, fraction: 0.25 });
		expect(legacyTrack('bad', -2, null, 30)).toEqual({ level: 1, fraction: 0 });
	});
});

describe('normalizeLegacyProgression', () => {
	it('reprend les trois exemples de fusion-xp.md', () => {
		expectUnified(
			normalizeLegacyProgression({ level: 5, xp: 30, xpMax: 150, sLevel: 3, sXp: 20, sXpMax: 30 }),
			5,
			30
		);
		expectUnified(
			normalizeLegacyProgression({ level: 3, xp: 60, xpMax: 90, sLevel: 5, sXp: 20, sXpMax: 50 }),
			5,
			60
		);
		expectUnified(
			normalizeLegacyProgression({ level: 5, xp: 30, xpMax: 150, sLevel: 5, sXp: 30, sXpMax: 50 }),
			5,
			90
		);
	});

	it('conserve la piste la plus avancée et les ressources dépensées (test-unified-progression.js:25-36)', () => {
		const source = legacy();
		const before = structuredClone(source);
		const player = normalizeLegacyProgression(source);
		expectUnified(player, 5, 75);
		expect(player.pvMax).toBe(59); // bonus de maximum +5 existant conservé
		expect(player.pvCur).toBe(49);
		expect(player.epMax).toBe(74);
		expect(player.epCur).toBe(38);
		expect(player.emMax).toBe(28);
		expect(player.emCur).toBe(13);
		expect(source).toEqual(before);
	});

	it('n’additionne jamais les deux XP (test-unified-progression.js:38-43)', () => {
		const source = legacy({ level: 7, xp: 105, xpMax: 210, sLevel: 4, sXp: 39, sXpMax: 40 });
		const player = normalizeLegacyProgression(source);
		expectUnified(player, 7, 105);
		expect(player.pvMax).toBe(41);
	});

	it('à niveau égal, garde la fraction la plus avancée', () => {
		expectUnified(normalizeLegacyProgression(legacy({ level: 5, xp: 90, xpMax: 150 })), 5, 90);
		expectUnified(normalizeLegacyProgression(legacy({ level: 5, xp: 30, xpMax: 150 })), 5, 75);
	});

	it('arrondit au point supérieur sans créer de niveau', () => {
		expectUnified(normalizeLegacyProgression(legacy({ sLevel: 5, sXp: 1, sXpMax: 7 })), 5, 22);
		expectUnified(
			normalizeLegacyProgression(legacy({ sLevel: 5, sXp: 999, sXpMax: 1000 })),
			5,
			149
		);
	});

	it('résout les seuils atteints avant de comparer', () => {
		expectUnified(
			normalizeLegacyProgression(
				legacy({ level: 1, xp: 30, xpMax: 30, sLevel: 1, sXp: 0, sXpMax: 10 })
			),
			2,
			0
		);
		expectUnified(
			normalizeLegacyProgression(
				legacy({ level: 1, xp: 0, xpMax: 30, sLevel: 1, sXp: 65, sXpMax: 10 })
			),
			4,
			15
		);
		expectUnified(
			normalizeLegacyProgression(
				legacy({ level: 2, xp: 15, xpMax: undefined, sLevel: 1, sXp: 0, sXpMax: undefined })
			),
			2,
			15
		);
	});

	it('est idempotente et ignore les champs hérités ressuscités', () => {
		const migrated = normalizeLegacyProgression(legacy());
		expect(normalizeLegacyProgression(migrated)).toEqual(migrated);
		expect(normalizeLegacyProgression({ ...migrated, sLevel: 99, sXp: 999, sXpMax: 10 })).toEqual(
			migrated
		);
	});

	it('applique une croissance personnalisée et laisse un KO à 0 PV (test-unified-progression.js:67-76)', () => {
		const player = normalizeLegacyProgression(legacy({ classe: 'Glacier', pvCur: 0 }), () => ({
			pvN: 11,
			epN: 0,
			emN: 7
		}));
		expectUnified(player, 5, 75);
		expect(player.pvMax).toBe(74);
		expect(player.pvCur).toBe(0);
		expect(player.epMax).toBe(56);
		expect(player.epCur).toBe(20);
		expect(player.emMax).toBe(43);
		expect(player.emCur).toBe(28);
	});

	it('utilise growthFor par défaut, avec l’alias class', () => {
		const viaClass = normalizeLegacyProgression(legacy({ classe: undefined, class: 'Duelliste' }));
		expect(viaClass.pvMax).toBe(59);
		const unknown = normalizeLegacyProgression(legacy({ classe: 'Inconnu' }));
		expect(unknown.pvMax).toBe(41);
		expect(unknown.pvCur).toBe(31);
	});

	it('normalise les champs absents, null ou mal formés', () => {
		expectUnified(normalizeLegacyProgression({}), 1, 0);
		expectUnified(normalizeLegacyProgression(null), 1, 0);
		expectUnified(
			normalizeLegacyProgression({
				level: 'bad',
				xp: -2,
				xpMax: null,
				sLevel: -4,
				sXp: Number.POSITIVE_INFINITY
			}),
			1,
			0
		);
		const nulls = normalizeLegacyProgression(
			legacy({ pvMax: null, pvCur: null, epMax: null, epCur: null, emMax: null, emCur: null })
		);
		expectUnified(nulls, 5, 75);
		// Repli : base + gain × (ancien niveau − 1) = 30 + 6, puis + 3 × 6 ; courant = maximum.
		expect([nulls.pvMax, nulls.pvCur]).toEqual([54, 54]);
		expect([nulls.epMax, nulls.epCur]).toEqual([74, 74]);
		expect([nulls.emMax, nulls.emCur]).toEqual([28, 28]);
	});

	it('répare le seuil d’une fiche déjà unifiée sans ressusciter l’XP historique', () => {
		const player = normalizeLegacyProgression(
			legacy({ progressionVersion: 1, level: 3, xp: 10, xpMax: 999, sLevel: 100 })
		);
		expectUnified(player, 3, 10);
		expect(player.pvMax).toBe(41);
		expect(normalizeLegacyProgression(player)).toEqual(player);
		expectUnified(normalizeLegacyProgression(legacy({ progressionVersion: 'legacy' })), 5, 75);
		expect(normalizeLegacyProgression(legacy({ progressionVersion: 3 })).progressionVersion).toBe(
			3
		);
	});
});

describe('clampResources et newProgressionState', () => {
	it('applique les clamps de _normalizePlayerRecord (main.js:713-720)', () => {
		expect(clampResources({})).toEqual({
			level: 1,
			xp: 0,
			xpMax: 30,
			pvMax: 30,
			pvCur: 30,
			epMax: 50,
			epCur: 50,
			emMax: 20,
			emCur: 20
		});
		expect(
			clampResources({ level: 2, pvMax: 0, pvCur: -4, epCur: 12.7, emMax: null, emCur: 5 })
		).toEqual({
			level: 2,
			xp: 0,
			xpMax: 60,
			pvMax: 1,
			pvCur: 0,
			epMax: 12,
			epCur: 12,
			emMax: 5,
			emCur: 5
		});
	});

	it('crée une fiche neuve 1 / 0 XP / 30 / 50 / 20', () => {
		expect(newProgressionState()).toEqual({
			level: 1,
			xp: 0,
			pvCur: 30,
			pvMax: 30,
			epCur: 50,
			epMax: 50,
			emCur: 20,
			emMax: 20
		});
	});
});
