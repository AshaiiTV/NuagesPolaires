// Semis idempotent des référentiels (04-architecture §3.4, §3.8) : thèmes (catalogue exact de
// l'audit 07 §3.2) et zones par défaut (audit 03 §10.2 / 05 §3.8). `ON CONFLICT DO NOTHING` sur l'id :
// une ligne déjà présente (éventuellement éditée par un admin) n'est jamais écrasée.
// Le catalogue natif des Serments vit dans `$lib/game/oaths` (04 §3.3) et est semé par `seedOaths`
// à partir des définitions que l'appelant lui transmet, pour ne pas coupler ce paquet au paquet jeu.

import type { Db } from './index';
import { oaths, themes, zones, type NewOath, type NewTheme, type NewZone } from './schema';

// ---------------------------------------------------------------------------
// Thèmes — audit 07 §3.2 (ordre d'affichage `ORDER`, theme-max.js:148) ; noms, descriptions et
// couleurs = `CONFIG` de theme-max.js (« gagne à l'affichage ») ; dates `availableUntil` et
// drapeaux `event` = THEMES_EVENT_BUILTIN (main.js:935-940) ; rareté/catégorie = theme-max.js.
// `availableUntil 0` legacy = sans limite → null. Aucun thème n'a de prix (audit 07 §0).
// ---------------------------------------------------------------------------

export const THEME_SEED: readonly NewTheme[] = [
	{
		id: 'dark',
		name: 'Nuages Polaires',
		cssClass: '',
		description:
			'Nuit d’encre, lumière d’aurore et ivoire. La signature visuelle de Nuages Polaires.',
		isEvent: false,
		availableUntil: null,
		visible: true, // toujours visible, l'admin ne peut pas le masquer (audit 07 §3.2)
		autoGrantAll: false, // toujours accordé par règle (ALWAYS_GRANTED_THEME_IDS), pas par distribution
		rarity: 'Base',
		category: 'Base',
		isBuiltin: true,
		preview: {
			colors: ['#091519', '#95cdbb', '#c6b38b'],
			tone: 'dark',
			tagline: 'Mystique polaire — un monde à écrire.'
		}
	},
	{
		id: 'light',
		name: 'Brume Claire',
		cssClass: 'light',
		description: 'Mode clair, propre et doux.',
		isEvent: false,
		availableUntil: null,
		visible: true,
		autoGrantAll: false,
		rarity: 'Base',
		category: 'Base',
		isBuiltin: true,
		preview: {
			colors: ['#f4f5fa', '#3a8fba', '#9a7020'],
			tone: 'light',
			tagline: 'Une lecture plus claire et apaisée.'
		}
	},
	{
		id: 'violet',
		name: 'Galactique',
		cssClass: 'theme-violet',
		description:
			'Un thème spatial franc : ciel profond, étoiles vives, halos stellaires et verre cosmique.',
		isEvent: false,
		availableUntil: null,
		visible: true, // BUILTIN_THEME_IDS : visible par défaut, verrouillé sauf don (audit 07 §3.2)
		autoGrantAll: false,
		rarity: 'Rare',
		category: 'Rares',
		isBuiltin: true,
		preview: {
			colors: ['#03020b', '#9b7cff', '#73d8ff'],
			tone: 'dark',
			tagline: 'Constellations, nébuleuses et lumière d’orbite.'
		}
	},
	{
		id: 'green',
		name: 'Sylvan',
		cssClass: 'theme-green',
		description:
			'Un thème jungle organique : feuillage humide, lianes mouvantes, mousse profonde et lumière dorée filtrée par la canopée.',
		isEvent: false,
		availableUntil: null,
		visible: true,
		autoGrantAll: false,
		rarity: 'Rare',
		category: 'Rares',
		isBuiltin: true,
		preview: {
			colors: ['#031108', '#51c56d', '#d8c16a'],
			tone: 'dark',
			tagline: 'Jungle dense, canopée vivante et sève lumineuse.'
		}
	},
	{
		id: 'aquaris',
		name: 'Aquaris — Royaume englouti',
		cssClass: 'theme-aquaris',
		description: 'Palais noyés, lumière abyssale, cyan profond et or ancien.',
		isEvent: false,
		availableUntil: null,
		visible: true, // visibilité retombe sur true sauf masquage admin (audit 07 §3.2)
		autoGrantAll: false,
		rarity: 'Rare',
		category: 'Rares',
		isBuiltin: true,
		preview: {
			colors: ['#011018', '#48d6ef', '#e5c878'],
			tone: 'dark',
			tagline: 'Royaume englouti, cyan abyssal et or ancien.'
		}
	},
	{
		id: 'easter',
		name: 'Pâques enchantées',
		cssClass: 'theme-easter',
		description: 'Un printemps joyeux : fleurs, herbe, lumière douce et couleurs pastel.',
		isEvent: true,
		availableUntil: new Date(1777593600000), // 1er mai 2026 00:00 UTC (échu) — main.js:935-940
		visible: true,
		autoGrantAll: false,
		rarity: 'Saisonnier',
		category: 'Saisonniers',
		isBuiltin: true,
		preview: {
			colors: ['#f7fff2', '#7fdc82', '#ffd86b', '#ffb6d8'],
			tone: 'light',
			tagline: 'Printemps vivant, mignon et coloré.'
		}
	},
	{
		id: 'halloween',
		name: 'Veille d’Halloween',
		cssClass: 'theme-halloween',
		description: 'Nuit violette, lueur orange et ambiance inquiétante.',
		isEvent: true,
		availableUntil: new Date(1793577600000), // 2 novembre 2026 — main.js:935-940
		visible: true,
		autoGrantAll: false,
		rarity: 'Saisonnier',
		category: 'Saisonniers',
		isBuiltin: true,
		preview: {
			colors: ['#0a0911', '#ff8f2b', '#7c59ff', '#d8d2ff'],
			tone: 'dark',
			tagline: 'Presque creepy, entre citrouille et brume.'
		}
	},
	{
		id: 'noel',
		name: 'Noël en fête',
		cssClass: 'theme-noel',
		description: 'Un Noël lumineux, rouge, vert, doré et enneigé.',
		isEvent: true,
		availableUntil: new Date(1799193600000), // 6 janvier 2027 — main.js:935-940
		visible: true,
		autoGrantAll: false,
		rarity: 'Saisonnier',
		category: 'Saisonniers',
		isBuiltin: true,
		preview: {
			colors: ['#08140d', '#d84a52', '#2ea85f', '#f2c66d'],
			tone: 'dark',
			tagline: 'Festif, chaleureux, rouge, vert et or.'
		}
	},
	{
		id: 'bloodmoon',
		name: 'BloodMoon',
		cssClass: 'theme-bloodmoon',
		description: 'Noir rituel, lune carmine, menace souveraine et éclat cramoisi.',
		isEvent: true, // `event:true`, `availableUntil 0` = toujours ouvert (audit 07 §3.2) ; don admin uniquement
		availableUntil: null,
		visible: true,
		autoGrantAll: false,
		rarity: 'Fondateur',
		category: 'Fondateur',
		isBuiltin: true,
		preview: {
			colors: ['#050102', '#e3133f', '#f0c76f'],
			tone: 'dark',
			tagline: 'Lune rouge souveraine et tension rituelle.'
		}
	}
];

/** Thèmes toujours accordés, quel que soit le compte (audit 07 §3.3, `ALWAYS_GRANTED_THEME_IDS`). */
export const ALWAYS_GRANTED_THEME_IDS: readonly string[] = ['dark', 'light'];

/**
 * Alias hérités d'identifiants de thème → identifiant canonique (audit 05 §3.1 `normalizeThemeId`,
 * audit 07 §3.2 « Thèmes retirés / alias »). `red` est normalisé vers `dark` (main.js:508).
 */
export const THEME_ID_ALIASES: Readonly<Record<string, string>> = {
	default: 'dark',
	themedefault: 'dark',
	'theme-default': 'dark',
	nuagespolaires: 'dark',
	original: 'dark',
	base: 'dark',
	red: 'dark',
	ecarlate: 'dark',
	écarlate: 'dark',
	scarlet: 'dark',
	brumeclaire: 'light',
	modeclair: 'light',
	clair: 'light',
	abyssal: 'violet',
	sylvan: 'green',
	printempseveille: 'easter',
	paques: 'easter',
	christmas: 'noel',
	lunedesang: 'bloodmoon',
	'lune-de-sang': 'bloodmoon',
	'blood-moon': 'bloodmoon',
	aquarius: 'aquaris'
};

// ---------------------------------------------------------------------------
// Zones par défaut — audit 03 §10.2 (`main.js:13854-13860`) : noms de salons Discord ; le libellé
// exact est conservé dans `name` car `beasts.zones` contient ce libellé (pool par zone).
// ---------------------------------------------------------------------------

export const ZONE_SEED: readonly NewZone[] = [
	{
		id: 'foret-aux-lianes',
		name: '[🌳]-forêt-aux-lianes',
		emoji: '🌳',
		isDefault: true,
		position: 0
	},
	{
		id: 'foret-aux-arbres-sombres',
		name: '[🌳]-forêt-aux-arbres-sombres',
		emoji: '🌳',
		isDefault: true,
		position: 1
	},
	{ id: 'arbre-geant', name: '[🌳]-arbre-géant', emoji: '🌳', isDefault: true, position: 2 },
	{ id: 'foret-centre', name: '[🌳]-forêt-centre', emoji: '🌳', isDefault: true, position: 3 },
	{
		id: 'lisiere-du-canyon',
		name: '[🌳]-lisière-du-canyon',
		emoji: '🌳',
		isDefault: true,
		position: 4
	}
];

// ---------------------------------------------------------------------------
// Semis
// ---------------------------------------------------------------------------

export type SeedReport = { themesInserted: number; zonesInserted: number; oathsInserted: number };

/** Sème les thèmes (sans écraser une ligne existante). */
export async function seedThemes(db: Db): Promise<number> {
	const rows = await db
		.insert(themes)
		.values([...THEME_SEED])
		.onConflictDoNothing({ target: themes.id })
		.returning({ id: themes.id });
	return rows.length;
}

/** Sème les zones par défaut (sans écraser une ligne existante). */
export async function seedZones(db: Db): Promise<number> {
	const rows = await db
		.insert(zones)
		.values([...ZONE_SEED])
		.onConflictDoNothing({ target: zones.id })
		.returning({ id: zones.id });
	return rows.length;
}

/**
 * Forme minimale attendue d'une définition de Serment (contrat `$lib/game/oaths` : OathDefinition).
 * Les parents (`evolvesFrom`) sont insérés avant leurs évolutions.
 */
export type OathSeedDefinition = {
	id: string;
	name: string;
	weapon: string;
	growth: { pvN: number; epN: number; emN: number };
	baseDamage: number;
	damageType: string;
	rank: NewOath['rank'];
	hidden: boolean;
	evolvesFrom: string | null;
	icon: string;
	category: NewOath['category'];
	lore: string;
	branches: NewOath['branches'];
};

/** Sème le catalogue de Serments transmis, marqué `is_builtin` (04 §3.3), sans écraser l'existant. */
export async function seedOaths(
	db: Db,
	definitions: readonly OathSeedDefinition[]
): Promise<number> {
	// Ordre : racines d'abord, puis évolutions (FK auto-référencée `evolves_from`).
	const byId = new Map(definitions.map((d) => [d.id, d]));
	const ordered: OathSeedDefinition[] = [];
	const seen = new Set<string>();
	const visit = (d: OathSeedDefinition, depth = 0): void => {
		if (seen.has(d.id) || depth > 12) return; // `getSermFamilyRoot` remonte au plus 12 niveaux (audit 02 §4.1)
		const parent = d.evolvesFrom ? byId.get(d.evolvesFrom) : undefined;
		if (parent) visit(parent, depth + 1);
		seen.add(d.id);
		ordered.push(d);
	};
	for (const d of definitions) visit(d);

	let inserted = 0;
	for (const d of ordered) {
		const rows = await db
			.insert(oaths)
			.values({
				id: d.id,
				name: d.name,
				weapon: d.weapon,
				pvGrowth: d.growth.pvN,
				epGrowth: d.growth.epN,
				emGrowth: d.growth.emN,
				baseDamage: d.baseDamage,
				damageType: d.damageType,
				rank: d.rank,
				hidden: d.hidden,
				evolvesFrom: d.evolvesFrom && byId.has(d.evolvesFrom) ? d.evolvesFrom : null,
				icon: d.icon,
				category: d.category,
				isBuiltin: true,
				lore: d.lore,
				branches: d.branches
			})
			.onConflictDoNothing({ target: oaths.id })
			.returning({ id: oaths.id });
		inserted += rows.length;
	}
	return inserted;
}

/** Semis complet et idempotent : thèmes, zones, et Serments si un catalogue est fourni. */
export async function seedDatabase(
	db: Db,
	options: { oaths?: readonly OathSeedDefinition[] } = {}
): Promise<SeedReport> {
	const themesInserted = await seedThemes(db);
	const zonesInserted = await seedZones(db);
	const oathsInserted = options.oaths ? await seedOaths(db, options.oaths) : 0;
	return { themesInserted, zonesInserted, oathsInserted };
}
