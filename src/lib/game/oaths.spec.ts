import { describe, expect, it } from 'vitest';
import {
	BUILTIN_OATHS,
	DEFAULT_OATH_ICON,
	NO_BRANCH,
	OATH_RANK_LABELS,
	PUBLIC_RANKS,
	STYLE_COLORS,
	TIER_LEVELS,
	WEAPON_ICONS,
	branchMatchesLabel,
	findBranch,
	findOath,
	mergeOathCatalogue,
	normalizeBranchLabel,
	normalizeOathCategory,
	normalizeOathRank,
	oathBranches,
	oathFamilyRoot,
	oathFromLegacyCustom,
	oathSlug,
	tierLevelsFor,
	tierMilestoneAt,
	tierMilestonesFor,
	tierStageLabel,
	unlockedTiers,
	visibleOaths
} from './oaths';
import type { OathCategory, OathRank } from './types';

/** Récapitulatif numérique de l'audit 02 §5.14 et du catalogue verbatim. */
const EXPECTED: Array<{
	id: string;
	name: string;
	weapon: string;
	growth: [number, number, number];
	dmg: number;
	type: string;
	rank: OathRank;
	hidden: boolean;
	evolvesFrom: string | null;
	icon: string;
	category: OathCategory;
	level10: [number, number, number];
}> = [
	{
		id: 'duelliste',
		name: 'Duelliste',
		weapon: 'Épée moyenne du serment',
		growth: [6, 6, 2],
		dmg: 11,
		type: 'Tranchant',
		rank: 'basic',
		hidden: false,
		evolvesFrom: null,
		icon: '⚔',
		category: 'melee',
		level10: [84, 104, 38]
	},
	{
		id: 'bretteur',
		name: 'Bretteur',
		weapon: 'Épée fine du serment',
		growth: [5, 7, 3],
		dmg: 12,
		type: 'Tranchant',
		rank: 'seasoned',
		hidden: true,
		evolvesFrom: 'Duelliste',
		icon: '⚔',
		category: 'melee',
		level10: [75, 113, 47]
	},
	{
		id: 'claymore',
		name: 'Claymore',
		weapon: 'Claymore du serment',
		growth: [7, 4, 2],
		dmg: 16,
		type: 'Tranchant lourd',
		rank: 'seasoned',
		hidden: true,
		evolvesFrom: 'Duelliste',
		icon: '⚔',
		category: 'melee',
		level10: [93, 86, 38]
	},
	{
		id: 'lame-d-honneur',
		name: "Lame d'Honneur",
		weapon: 'Épée claire du serment',
		growth: [7, 5, 3],
		dmg: 10,
		type: 'Tranchant',
		rank: 'seasoned',
		hidden: true,
		evolvesFrom: 'Duelliste',
		icon: '⚔',
		category: 'melee',
		level10: [93, 95, 47]
	},
	{
		id: 'sauvageon',
		name: 'Sauvageon',
		weapon: 'Hache à deux mains du serment',
		growth: [5, 8, 1],
		dmg: 14,
		type: 'Tranchant',
		rank: 'basic',
		hidden: false,
		evolvesFrom: null,
		icon: '🪓',
		category: 'melee',
		level10: [75, 122, 29]
	},
	{
		id: 'croise',
		name: 'Croisé',
		weapon: 'Bouclier du serment',
		growth: [8, 3, 2],
		dmg: 6,
		type: 'Contondant',
		rank: 'basic',
		hidden: false,
		evolvesFrom: null,
		icon: '🛡',
		category: 'melee',
		level10: [102, 77, 38]
	},
	{
		id: 'rodeur',
		name: 'Rôdeur',
		weapon: 'Dague du serment',
		growth: [2, 5, 3],
		dmg: 8,
		type: 'Tranchant',
		rank: 'basic',
		hidden: false,
		evolvesFrom: null,
		icon: '🗡',
		category: 'melee',
		level10: [48, 95, 47]
	},
	{
		id: 'traqueur',
		name: 'Traqueur',
		weapon: 'Lance du serment',
		growth: [2, 7, 2],
		dmg: 8,
		type: 'Tranchant',
		rank: 'basic',
		hidden: false,
		evolvesFrom: null,
		icon: '🏹',
		category: 'melee',
		level10: [48, 113, 38]
	},
	{
		id: 'flecheur',
		name: 'Flécheur',
		weapon: 'Arc du serment',
		growth: [3, 5, 4],
		dmg: 10,
		type: 'Tranchant',
		rank: 'basic',
		hidden: false,
		evolvesFrom: null,
		icon: '🏹',
		category: 'distance',
		level10: [57, 95, 56]
	},
	{
		id: 'elementaliste',
		name: 'Elementaliste',
		weapon: 'Poing américain du serment serti de gemmes',
		growth: [4, 4, 4],
		dmg: 7,
		type: 'Contondant',
		rank: 'basic',
		hidden: false,
		evolvesFrom: null,
		icon: '👊',
		category: 'melee',
		level10: [66, 86, 56]
	},
	{
		id: 'evocateur',
		name: 'Evocateur',
		weapon: "Bâton du serment orné de runes et d'anneaux",
		growth: [2, 3, 6],
		dmg: 4,
		type: 'Contondant',
		rank: 'basic',
		hidden: false,
		evolvesFrom: null,
		icon: '🪄',
		category: 'magie',
		level10: [48, 77, 74]
	},
	{
		id: 'conjurateur',
		name: 'Conjurateur',
		weapon: 'Chaîne du serment',
		growth: [2, 2, 7],
		dmg: 6,
		type: 'Contondant',
		rank: 'basic',
		hidden: false,
		evolvesFrom: null,
		icon: '⛓',
		category: 'soutien',
		level10: [48, 68, 83]
	},
	{
		id: 'arcaniste',
		name: 'Arcaniste',
		weapon: 'Orbe du serment',
		growth: [1, 1, 8],
		dmg: 4,
		type: 'Contondant (coup de poing pour les non-magiques)',
		rank: 'basic',
		hidden: false,
		evolvesFrom: null,
		icon: '🔮',
		category: 'magie',
		level10: [39, 59, 92]
	}
];

/** Noms de branches attendus (audit 02 §5). */
const EXPECTED_BRANCHES: Record<string, [string, string]> = {
	Duelliste: ["Branche A — L'Élan Tranchant", 'Branche B — Taille Double'],
	Bretteur: ['Branche A — Feinte de Fer', 'Branche B — Pas Rompu'],
	Claymore: ['Branche A — Posture Haute', 'Branche B — Fendre la Ligne'],
	"Lame d'Honneur": ['Branche A — Duel Juré', 'Branche B — Sentence du Duel'],
	Sauvageon: ['Branche A — Spirale Brisante', 'Branche B — Lancer Bestial'],
	Croisé: ['Branche A — Bash Cinglant', 'Branche B — Appel du Bouclier'],
	Rôdeur: ['Branche A — Rafale de Lames', 'Branche B — Lancer Lié'],
	Traqueur: ['Branche A — Lance Drainante', 'Branche B — Tenue de Ligne'],
	Flécheur: ['Branche A — Salve Aveugle', 'Branche B — Flèche de Jugement'],
	Elementaliste: ['Branche A — Feu & Glace', 'Branche B — Foudre & Eau'],
	Evocateur: ['Branche A — La Tortue Bipède', 'Branche B — Le Crabe Canon'],
	Conjurateur: ['Branche A — Frappe Déchaînée', 'Branche B — Soin Enchaîné'],
	Arcaniste: ['Branche A — Domaine Étoilé', 'Branche B — Rayon Étoilé']
};

describe('BUILTIN_OATHS', () => {
	it('contient exactement les 13 Serments natifs, dans l’ordre de SD, avec des ids uniques', () => {
		expect(BUILTIN_OATHS).toHaveLength(13);
		expect(BUILTIN_OATHS.map((o) => o.name)).toEqual(EXPECTED.map((e) => e.name));
		expect(new Set(BUILTIN_OATHS.map((o) => o.id)).size).toBe(13);
		expect(BUILTIN_OATHS.every((o) => o.isBuiltin)).toBe(true);
	});

	it.each(EXPECTED)('$name porte les valeurs de l’audit 02 §5.14', (e) => {
		const oath = findOath(e.name);
		expect(oath).not.toBeNull();
		if (!oath) return;
		expect(oath.id).toBe(e.id);
		expect(oath.weapon).toBe(e.weapon);
		expect(oath.growth).toEqual({ pvN: e.growth[0], epN: e.growth[1], emN: e.growth[2] });
		expect(oath.baseDamage).toBe(e.dmg);
		expect(oath.damageType).toBe(e.type);
		expect(oath.rank).toBe(e.rank);
		expect(oath.hidden).toBe(e.hidden);
		expect(oath.evolvesFrom).toBe(e.evolvesFrom);
		expect(oath.icon).toBe(e.icon);
		expect(oath.category).toBe(e.category);
		expect(oath.lore.length).toBeGreaterThan(200);
		// Niveau 10 = base + 9 × gain.
		expect([30 + 9 * oath.growth.pvN, 50 + 9 * oath.growth.epN, 20 + 9 * oath.growth.emN]).toEqual(
			e.level10
		);
	});

	it.each(EXPECTED)(
		'$name a deux branches complètes de quatre paliers aux niveaux de son rang',
		(e) => {
			const oath = findOath(e.id);
			if (!oath) throw new Error(`Serment ${e.id} introuvable`);
			const branches = oathBranches(oath);
			expect(branches).toHaveLength(2);
			expect(branches.map((b) => b.nom)).toEqual(EXPECTED_BRANCHES[e.name]);
			for (const branch of branches) {
				expect(branch.style).not.toBe('');
				expect(branch.descPhys ?? '').not.toBe('');
				expect(branch.flavor ?? '').not.toBe('');
				expect(branch.paliers.map((p) => p.niv)).toEqual([...tierLevelsFor(oath.rank)]);
				for (const tier of branch.paliers) {
					expect(tier.nom).not.toBe('');
					expect(tier.cout).not.toBe('');
					expect(tier.desc).not.toBe('');
				}
			}
		}
	);

	it('conserve les textes verbatim (échantillons)', () => {
		const duelliste = findOath('Duelliste');
		expect(duelliste?.lore.startsWith("Le Duelliste n'est pas appelé par la violence.")).toBe(true);
		expect(duelliste?.branches.bA?.style).toBe('Brutalité');
		expect(duelliste?.branches.bA?.paliers[0]).toEqual({
			niv: 2,
			nom: 'Élan Tranchant',
			cout: '6 EM — 1 action',
			desc: "À distance : dash vers la cible + frappe 6+Niv. Au corps à corps : frappe 10+Niv + repousse l'adversaire à distance (les deux doivent utiliser une action de déplacement pour se rapprocher)."
		});
		expect(duelliste?.branches.bB?.paliers[3]?.desc).toBe('14+Niv par frappe (total : 28+Niv×2).');
		expect(findOath('Elementaliste')?.lore).toContain(
			'\n\nRÈGLE UNIVERSELLE — LE COMPTEUR ÉLÉMENTAIRE : Quelle que soit la branche choisie'
		);
		expect(findOath('Evocateur')?.lore).toContain('\n\nRÈGLES DES INVOCATIONS : Chaque invocation');
		expect(findOath('Evocateur')?.branches.bA?.paliers[3]?.cout).toBe(
			'4 EM invoc / 3 EM par action'
		);
		expect(findOath('Elementaliste')?.branches.bB?.paliers[0]?.nom).toBe(
			'Poing Foudre (4 EM) / Poing Aquatique (6 EM)'
		);
		expect(findOath("Lame d'Honneur")?.branches.bA?.paliers[0]?.cout).toBe(
			'5 EM — 1 action — EM non régénérable'
		);
		expect(findOath('Croisé')?.branches.bA?.paliers[0]?.cout).toBe(
			'6 EM — 1 action (CAC uniquement)'
		);
		expect(findOath('Flécheur')?.branches.bB?.paliers[0]?.cout).toBe(
			'8 EM — coûte toutes les actions restantes du tour'
		);
		expect(findOath('Arcaniste')?.branches.bB?.paliers[3]?.desc).toBe(
			'46+Niv. Entièrement défendable.'
		);
	});

	it('expose la vitrine sans les Aguerris masqués et la lignée Duelliste', () => {
		expect(visibleOaths().map((o) => o.name)).toEqual([
			'Duelliste',
			'Sauvageon',
			'Croisé',
			'Rôdeur',
			'Traqueur',
			'Flécheur',
			'Elementaliste',
			'Evocateur',
			'Conjurateur',
			'Arcaniste'
		]);
		const bretteur = findOath('Bretteur');
		if (!bretteur) throw new Error('Bretteur introuvable');
		expect(oathFamilyRoot(bretteur).name).toBe('Duelliste');
		expect(oathFamilyRoot(bretteur).id).toBe('duelliste');
		expect(PUBLIC_RANKS).not.toContain('seasoned');
	});
});

describe('findOath et oathSlug', () => {
	it('retrouve par id, par nom exact, ou sans accents ni casse', () => {
		expect(findOath('duelliste')?.name).toBe('Duelliste');
		expect(findOath('Duelliste')?.id).toBe('duelliste');
		expect(findOath('Élémentaliste')?.id).toBe('elementaliste');
		expect(findOath('Évocateur')?.id).toBe('evocateur');
		expect(findOath('Rodeur')?.id).toBe('rodeur');
		expect(findOath('flécheur')?.id).toBe('flecheur');
		expect(findOath("lame d'honneur")?.id).toBe('lame-d-honneur');
		expect(findOath('  Croisé  ')?.id).toBe('croise');
	});

	it('renvoie null pour un inconnu ou une valeur vide', () => {
		expect(findOath('Glacier')).toBeNull();
		expect(findOath('')).toBeNull();
		expect(findOath(null)).toBeNull();
		expect(findOath(undefined)).toBeNull();
	});

	it('produit des slugs stables', () => {
		expect(oathSlug("Lame d'Honneur")).toBe('lame-d-honneur');
		expect(oathSlug('Rôdeur')).toBe('rodeur');
		expect(oathSlug('  Gardien des Brumes  ')).toBe('gardien-des-brumes');
		expect(BUILTIN_OATHS.every((o) => o.id === oathSlug(o.name))).toBe(true);
	});
});

describe('rangs, catégories, icônes', () => {
	it('normalise les rangs et leurs alias (main.js:6105-6119)', () => {
		expect(normalizeOathRank('base', true)).toBe('basic');
		expect(normalizeOathRank('found', false)).toBe('singular');
		expect(normalizeOathRank('unique', false)).toBe('singular');
		expect(normalizeOathRank('evolved', false)).toBe('emeritus');
		expect(normalizeOathRank('expert', false)).toBe('emeritus');
		expect(normalizeOathRank('major', false)).toBe('transcended');
		expect(normalizeOathRank('divine', false)).toBe('transcended');
		expect(normalizeOathRank('seasoned', true)).toBe('seasoned');
		expect(normalizeOathRank('corrupted', false)).toBe('corrupted');
		expect(normalizeOathRank(undefined, true)).toBe('basic');
		expect(normalizeOathRank(undefined, false)).toBe('singular');
		expect(normalizeOathRank('n’importe quoi', false)).toBe('singular');
		expect(OATH_RANK_LABELS).toEqual({
			basic: 'Basique',
			seasoned: 'Aguerri',
			emeritus: 'Émérite',
			singular: 'Singulier',
			transcended: 'Transcendé',
			corrupted: 'Corrompu',
			other: 'Autre'
		});
	});

	it('normalise les catégories (« mêlée » → melee)', () => {
		expect(normalizeOathCategory('mêlée')).toBe('melee');
		expect(normalizeOathCategory('Distance')).toBe('distance');
		expect(normalizeOathCategory('magie')).toBe('magie');
		expect(normalizeOathCategory('soutien')).toBe('soutien');
		expect(normalizeOathCategory('')).toBe('melee');
		expect(normalizeOathCategory(42)).toBe('melee');
	});

	it('connaît les icônes et les couleurs de style', () => {
		expect(WEAPON_ICONS['Rodeur']).toBe('🗡');
		expect(WEAPON_ICONS['Élémentaliste']).toBe('👊');
		expect(DEFAULT_OATH_ICON).toBe('✦');
		expect(STYLE_COLORS['Brutalité']).toBe('red');
		expect(STYLE_COLORS["Équilibre d'accumulation"]).toBe('glacier');
		expect(Object.keys(STYLE_COLORS)).toHaveLength(17);
	});
});

describe('paliers par rang', () => {
	it('donne 2/5/7/10 pour Basique et 10/13/16/20 pour Aguerri (fusion-xp.md)', () => {
		expect(TIER_LEVELS.basic).toEqual([2, 5, 7, 10]);
		expect(TIER_LEVELS.seasoned).toEqual([10, 13, 16, 20]);
		expect(tierLevelsFor('basic')).toEqual([2, 5, 7, 10]);
		expect(tierLevelsFor('seasoned')).toEqual([10, 13, 16, 20]);
		// Les autres rangs retombent sur la table basique (main.js:9303).
		for (const rank of ['emeritus', 'singular', 'transcended', 'corrupted', 'other'] as const) {
			expect(tierLevelsFor(rank)).toEqual([2, 5, 7, 10]);
		}
	});

	it('nomme les paliers (main.js:9299-9300)', () => {
		expect(tierMilestonesFor('basic').map((m) => m.nom)).toEqual([
			'Palier I — Éveil',
			'Palier II — Densité',
			'Palier III — Maîtrise',
			'Palier IV — Plénitude'
		]);
		expect(tierMilestonesFor('seasoned').map((m) => m.nom)).toEqual([
			'Aguerri I — Éveil',
			'Aguerri II — Densité',
			'Aguerri III — Maîtrise',
			'Aguerri IV — Plénitude'
		]);
		expect(tierMilestoneAt('basic', 5)).toBe('Palier II — Densité');
		expect(tierMilestoneAt('seasoned', 13)).toBe('Aguerri II — Densité');
		expect(tierMilestoneAt('basic', 3)).toBeNull();
		expect(tierMilestoneAt('seasoned', 5)).toBeNull();
	});

	it('étiquette les étapes (main.js:6158-6164)', () => {
		expect([0, 1, 2, 3].map((i) => tierStageLabel(i, 4))).toEqual([
			'Débloqué',
			'Renforcé',
			'Maîtrisé',
			'Parachevé'
		]);
		expect(tierStageLabel(1, 2)).toBe('Parachevé');
		expect(tierStageLabel(3, 6)).toBe('Palier 4');
	});
});

describe('branches', () => {
	const duelliste = findOath('Duelliste');
	if (!duelliste) throw new Error('Duelliste introuvable');
	const branchA = duelliste.branches.bA;

	it('rapproche les libellés de façon tolérante (main.js:6626-6643)', () => {
		expect(normalizeBranchLabel("Branche A — L'Élan Tranchant")).toBe("l'élan tranchant");
		expect(normalizeBranchLabel('Branche B - Taille Double')).toBe('taille double');
		expect(branchMatchesLabel(branchA, "Branche A — L'Élan Tranchant")).toBe(true);
		expect(branchMatchesLabel(branchA, "l'élan tranchant")).toBe(true);
		expect(branchMatchesLabel(branchA, 'Élan Tranchant')).toBe(true);
		expect(branchMatchesLabel(branchA, 'Taille Double')).toBe(false);
		expect(branchMatchesLabel(branchA, NO_BRANCH)).toBe(false);
		expect(branchMatchesLabel(branchA, '')).toBe(false);
		expect(branchMatchesLabel(null, 'Élan Tranchant')).toBe(false);
		expect(findBranch(duelliste, 'Branche B — Taille Double')?.style).toBe('Fluidité');
		expect(findBranch(duelliste, 'Inconnue')).toBeNull();
	});

	it('calcule les paliers débloqués par le niveau du personnage (audit 02 §4.3)', () => {
		const mid = unlockedTiers(duelliste, "Branche A — L'Élan Tranchant", 6);
		expect(mid.branch?.nom).toBe("Branche A — L'Élan Tranchant");
		expect(mid.unlocked.map((t) => t.niv)).toEqual([2, 5]);
		expect(mid.active?.niv).toBe(5);
		expect(mid.next?.niv).toBe(7);

		const start = unlockedTiers(duelliste, 'Taille Double', 1);
		expect(start.unlocked).toEqual([]);
		expect(start.active).toBeNull();
		expect(start.next?.niv).toBe(2);

		const full = unlockedTiers(duelliste, branchA, 12);
		expect(full.unlocked).toHaveLength(4);
		expect(full.active?.niv).toBe(10);
		expect(full.next).toBeNull();
	});

	it('n’active aucune capacité sans branche (main.js:11451)', () => {
		expect(unlockedTiers(duelliste, NO_BRANCH, 10)).toEqual({
			branch: null,
			unlocked: [],
			active: null,
			next: null
		});
		expect(unlockedTiers(duelliste, null, 10).branch).toBeNull();
	});

	it('respecte les niveaux Aguerris pour un Serment seasoned', () => {
		const bretteur = findOath('Bretteur');
		if (!bretteur) throw new Error('Bretteur introuvable');
		const nine = unlockedTiers(bretteur, 'Feinte de Fer', 9);
		expect(nine.unlocked).toEqual([]);
		expect(nine.next?.niv).toBe(10);
		expect(unlockedTiers(bretteur, 'Feinte de Fer', 16).active?.niv).toBe(16);
	});
});

describe('surcharges héritées (serments_custom)', () => {
	it('un custom remplace le natif de même nom et garde sa position', () => {
		const merged = mergeOathCatalogue(BUILTIN_OATHS, {
			Duelliste: {
				pvN: 11,
				epN: 6,
				emN: 2,
				dmg: 11,
				arme: 'Épée moyenne du serment',
				sermLevel: 'basic',
				hidden: true
			}
		});
		expect(merged).toHaveLength(13);
		expect(merged[0]?.id).toBe('duelliste');
		expect(merged[0]?.isBuiltin).toBe(false);
		expect(merged[0]?.growth).toEqual({ pvN: 11, epN: 6, emN: 2 });
		expect(merged[0]?.hidden).toBe(true);
		expect(merged[0]?.icon).toBe('⚔');
		expect(merged[0]?.category).toBe('melee');
		expect(merged[0]?.lore).toBe(findOath('Duelliste')?.lore);
		expect(merged[0]?.branches.bA?.nom).toBe("Branche A — L'Élan Tranchant");
		expect(BUILTIN_OATHS[0]?.isBuiltin).toBe(true);
	});

	it('un custom inédit est ajouté avec les défauts de l’atelier (audit 02 §4.4)', () => {
		const merged = mergeOathCatalogue(BUILTIN_OATHS, {
			'Gardien des Brumes': {
				arme: 'Lanterne du serment',
				lore: 'Un serment de veille.',
				cat: 'mêlée',
				branches: [
					{
						nom: 'Branche A — Veille',
						style: 'Contrôle',
						desc: 'Tient la ligne.',
						paliers: [{ niv: 2, nom: 'Veille', cout: '4 EM — 1 action', desc: 'Tient.' }]
					}
				]
			},
			ignoré: null
		});
		expect(merged).toHaveLength(14);
		const custom = merged[13];
		expect(custom).toMatchObject({
			id: 'gardien-des-brumes',
			name: 'Gardien des Brumes',
			weapon: 'Lanterne du serment',
			growth: { pvN: 3, epN: 5, emN: 2 },
			baseDamage: 8,
			rank: 'singular',
			hidden: false,
			evolvesFrom: null,
			icon: '✦',
			category: 'melee',
			isBuiltin: false
		});
		expect(custom?.branches.bA?.desc).toBe('Tient la ligne.');
		expect(custom?.branches.bA?.paliers).toEqual([
			{ niv: 2, nom: 'Veille', cout: '4 EM — 1 action', desc: 'Tient.' }
		]);
		expect(custom?.branches.bB).toBeNull();
		expect(findOath('Gardien des Brumes', merged)?.id).toBe('gardien-des-brumes');
	});

	it('oathFromLegacyCustom applique alias de rang, icône et branches bA/bB', () => {
		const oath = oathFromLegacyCustom('Bretteur', {
			sermLevel: 'expert',
			icon: '🗡',
			evolvesFrom: '',
			bA: { nom: 'Branche A — Test', style: 'Duel', paliers: [] }
		});
		expect(oath.id).toBe('bretteur');
		expect(oath.rank).toBe('emeritus');
		expect(oath.icon).toBe('🗡');
		expect(oath.evolvesFrom).toBeNull();
		expect(oath.hidden).toBe(true);
		expect(oath.branches.bA?.nom).toBe('Branche A — Test');
		expect(oath.branches.bB).toBeNull();
		expect(oathFromLegacyCustom('Bretteur', {}).rank).toBe('seasoned');
		expect(oathFromLegacyCustom('Bretteur', {}).evolvesFrom).toBe('Duelliste');
	});
});
