/**
 * Catalogue natif des 13 Serments et règles associées (rangs, catégories, paliers, branches).
 * Module pur : aucune I/O. Les textes sont VERBATIM (identité du site) —
 * source : `legacy/assets/js/main.js:213-485` (objet SD) et
 * `docs/overhaul/audit/contenu/serments-catalogue.md`.
 *
 * Le catalogue est semé dans la table `oaths` à la première migration (04 §3.3) ;
 * ensuite la base fait foi. Les surcharges héritées (`serments_custom`) sont fusionnées
 * avec `oathFromLegacyCustom` / `mergeOathCatalogue`.
 */

import type { Growth, OathBranch, OathCategory, OathDefinition, OathRank, OathTier } from './types';

// ---------------------------------------------------------------------------
// Rangs
// ---------------------------------------------------------------------------

/** Libellés des rangs (`SERM_LEVELS`, legacy main.js:6096-6104). audit 02 §4.2 */
export const OATH_RANK_LABELS: Readonly<Record<OathRank, string>> = {
	basic: 'Basique',
	seasoned: 'Aguerri',
	emeritus: 'Émérite',
	singular: 'Singulier',
	transcended: 'Transcendé',
	corrupted: 'Corrompu',
	other: 'Autre'
};

/** Alias hérités de rang (`SERM_LEVEL_ALIASES`, legacy main.js:6105-6113). */
export const OATH_RANK_ALIASES: Readonly<Record<string, OathRank>> = {
	base: 'basic',
	found: 'singular',
	unique: 'singular',
	evolved: 'emeritus',
	expert: 'emeritus',
	major: 'transcended',
	divine: 'transcended'
};

/** Rangs proposés dans la vitrine publique (pas `seasoned`, legacy main.js:6185). */
export const PUBLIC_RANKS: readonly OathRank[] = [
	'basic',
	'emeritus',
	'singular',
	'transcended',
	'corrupted'
];

function isOathRank(value: string): value is OathRank {
	return Object.prototype.hasOwnProperty.call(OATH_RANK_LABELS, value);
}

/**
 * Résout un rang brut (`sermLevel` hérité) : alias → clé connue → défaut.
 * Défaut : `basic` pour un natif, `singular` pour un custom (`getSermLevelKey`, legacy main.js:6114-6119).
 */
export function normalizeOathRank(raw: unknown, isBuiltin: boolean): OathRank {
	const key = typeof raw === 'string' ? raw.trim() : '';
	if (key && OATH_RANK_ALIASES[key]) return OATH_RANK_ALIASES[key];
	if (key && isOathRank(key)) return key;
	return isBuiltin ? 'basic' : 'singular';
}

// ---------------------------------------------------------------------------
// Catégories, icônes, couleurs
// ---------------------------------------------------------------------------

/** Libellés des catégories de combat (`getSermCatLabel`, legacy main.js:6146-6148). */
export const OATH_CATEGORY_LABELS: Readonly<Record<OathCategory, string>> = {
	melee: 'Mêlée',
	distance: 'Distance',
	magie: 'Magie',
	soutien: 'Soutien'
};

/**
 * Normalise une catégorie saisie (le sélecteur admin envoie « mêlée », legacy main.js:3484).
 * Inconnue → `melee` (défaut de `renderSermCard`, legacy main.js:6522).
 */
export function normalizeOathCategory(raw: unknown): OathCategory {
	const key = stripAccents(typeof raw === 'string' ? raw : '')
		.toLowerCase()
		.trim();
	if (key === 'melee' || key === 'distance' || key === 'magie' || key === 'soutien') return key;
	return 'melee';
}

/** Icône de repli (`WEAPON_ICONS[...] || "✦"`, legacy main.js:6521). */
export const DEFAULT_OATH_ICON = '✦';

/** Icônes natives par nom, alias d'orthographe inclus (`WEAPON_ICONS`, legacy main.js:6078-6082). */
export const WEAPON_ICONS: Readonly<Record<string, string>> = {
	Duelliste: '⚔',
	Bretteur: '⚔',
	Claymore: '⚔',
	"Lame d'Honneur": '⚔',
	Sauvageon: '🪓',
	Croisé: '🛡',
	Rodeur: '🗡',
	Rôdeur: '🗡',
	Traqueur: '🏹',
	Flecheur: '🏹',
	Flécheur: '🏹',
	Elementaliste: '👊',
	Élémentaliste: '👊',
	Evocateur: '🪄',
	Évocateur: '🪄',
	Conjurateur: '⛓',
	Arcaniste: '🔮'
};

/** Couleurs de style des branches (`STYLE_COLORS`, legacy main.js:6083-6090). audit 02 §4.2 */
export const STYLE_COLORS: Readonly<Record<string, string>> = {
	Brutalité: 'red',
	Fluidité: 'glacier',
	AOE: 'purple',
	Précision: 'purple',
	Offensif: 'red',
	Aggro: 'gold',
	Mêlée: 'red',
	Distance: 'glacier',
	Épuisement: 'purple',
	Contrôle: 'glacier',
	Concentration: 'gold',
	Soin: 'green',
	Tank: 'gold',
	'Équilibre offensif': 'red',
	"Équilibre d'accumulation": 'glacier',
	'AOE Indéfendable': 'red',
	'Précision Défendable': 'glacier'
};

// ---------------------------------------------------------------------------
// Paliers par rang
// ---------------------------------------------------------------------------

/** Niveaux des paliers par rang. audit 02 §4.3, legacy/docs/fusion-xp.md */
export const TIER_LEVELS: Readonly<Record<'basic' | 'seasoned', readonly number[]>> = {
	basic: [2, 5, 7, 10],
	seasoned: [10, 13, 16, 20]
};

/** Noms des paliers (`SERM_PALIERS` / `SERM_PALIERS_SEASONED`, legacy main.js:9299-9300). */
export const TIER_MILESTONES: Readonly<
	Record<'basic' | 'seasoned', readonly { niv: number; nom: string }[]>
> = {
	basic: [
		{ niv: 2, nom: 'Palier I — Éveil' },
		{ niv: 5, nom: 'Palier II — Densité' },
		{ niv: 7, nom: 'Palier III — Maîtrise' },
		{ niv: 10, nom: 'Palier IV — Plénitude' }
	],
	seasoned: [
		{ niv: 10, nom: 'Aguerri I — Éveil' },
		{ niv: 13, nom: 'Aguerri II — Densité' },
		{ niv: 16, nom: 'Aguerri III — Maîtrise' },
		{ niv: 20, nom: 'Aguerri IV — Plénitude' }
	]
};

/**
 * Table de paliers applicable à un rang : `seasoned` → 10/13/16/20, tout autre rang →
 * 2/5/7/10 (l'ancien code ne distingue que « seasoned », `getSermPalierDefsFor`,
 * legacy main.js:9301-9304 ; l'audit ne donne pas d'autre table).
 */
export function tierTableFor(rank: OathRank): 'basic' | 'seasoned' {
	return rank === 'seasoned' ? 'seasoned' : 'basic';
}

/** Niveaux des paliers pour un rang. audit 02 §4.3 */
export function tierLevelsFor(rank: OathRank): readonly number[] {
	return TIER_LEVELS[tierTableFor(rank)];
}

/** Paliers nommés (« Palier I — Éveil »…) pour un rang. legacy main.js:9299-9304 */
export function tierMilestonesFor(rank: OathRank): readonly { niv: number; nom: string }[] {
	return TIER_MILESTONES[tierTableFor(rank)];
}

/** Nom du palier atteint exactement à ce niveau, sinon `null` (`doLvlUp`, legacy main.js:9315). */
export function tierMilestoneAt(rank: OathRank, level: number): string | null {
	const found = tierMilestonesFor(rank).find((m) => m.niv === level);
	return found ? found.nom : null;
}

/**
 * Étiquette d'étape dans la vitrine (`getPalierStageLabel`, legacy main.js:6158-6164) :
 * 1er « Débloqué », dernier « Parachevé », 2e « Renforcé », 3e « Maîtrisé », sinon « Palier n ».
 */
export function tierStageLabel(index: number, total: number): string {
	if (index === 0) return 'Débloqué';
	if (total > 0 && index === total - 1) return 'Parachevé';
	if (index === 1) return 'Renforcé';
	if (index === 2) return 'Maîtrisé';
	return `Palier ${index + 1}`;
}

// ---------------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------------

/** Valeur de `branch` quand aucune branche n'est choisie. audit 02 §1.2 */
export const NO_BRANCH = 'Aucune';

/** Branches d'un Serment dans l'ordre A, B (`getBranches`, legacy main.js:6617-6625). */
export function oathBranches(oath: OathDefinition): OathBranch[] {
	const out: OathBranch[] = [];
	if (oath.branches.bA) out.push(oath.branches.bA);
	if (oath.branches.bB) out.push(oath.branches.bB);
	out.push(...(oath.branches.extraBranches ?? []));
	return out;
}

/** `normalizeBranchLabel` (legacy main.js:6626-6633) : préfixe « Branche A/B — » retiré, casse ignorée. */
export function normalizeBranchLabel(label: string): string {
	return String(label ?? '')
		.replace(/^Branche\s+[AB]\s+—\s*/i, '')
		.replace(/^Branche\s+[AB]\s*-\s*/i, '')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();
}

/**
 * Rapprochement tolérant d'une branche et du libellé stocké sur la fiche
 * (`branchMatchesLabel`, legacy main.js:6634-6643) : égalité stricte, puis égalité ou
 * inclusion des formes normalisées. « Aucune » ne correspond jamais.
 */
export function branchMatchesLabel(branch: OathBranch | null, label: string | null): boolean {
	if (!branch || !label || label === NO_BRANCH) return false;
	const raw = String(label).trim();
	const bnom = String(branch.nom ?? '').trim();
	if (!raw || !bnom) return false;
	if (raw === bnom) return true;
	const nr = normalizeBranchLabel(raw);
	const nb = normalizeBranchLabel(bnom);
	return !!(nr && nb && (nr === nb || nr.includes(nb) || nb.includes(nr)));
}

/** Branche du Serment correspondant au libellé de la fiche, `null` sinon. */
export function findBranch(oath: OathDefinition, label: string | null): OathBranch | null {
	return oathBranches(oath).find((b) => branchMatchesLabel(b, label)) ?? null;
}

/** Résultat de `unlockedTiers`. audit 02 §4.3 */
export type UnlockedTiers = {
	/** Branche reconnue, `null` si « Aucune » ou inconnue. */
	branch: OathBranch | null;
	/** Paliers dont `niv ≤ level`, dans l'ordre. */
	unlocked: OathTier[];
	/** Palier actif : le dernier débloqué (audit 02 §4.3), `null` sans branche. */
	active: OathTier | null;
	/** Prochain palier à atteindre, `null` si tout est débloqué ou sans branche. */
	next: OathTier | null;
};

/**
 * Paliers débloqués par le niveau du personnage sur la branche choisie.
 * Sans branche choisie, aucune capacité n'est active (`cGetFighterSerment`, legacy main.js:11451).
 * Le niveau utilisé est celui du personnage, jamais un niveau de serment (fusion-xp.md).
 */
export function unlockedTiers(
	oath: OathDefinition,
	branch: string | OathBranch | null,
	level: number
): UnlockedTiers {
	const resolved =
		typeof branch === 'string' || branch === null ? findBranch(oath, branch) : branch;
	if (!resolved) return { branch: null, unlocked: [], active: null, next: null };
	const lvl = Math.max(1, Math.floor(Number.isFinite(level) ? level : 1));
	const sorted = [...resolved.paliers].sort((a, b) => a.niv - b.niv);
	const unlocked = sorted.filter((t) => t.niv <= lvl);
	const next = sorted.find((t) => t.niv > lvl) ?? null;
	return {
		branch: resolved,
		unlocked,
		active: unlocked.length ? unlocked[unlocked.length - 1] : null,
		next
	};
}

// ---------------------------------------------------------------------------
// Identifiants et recherche
// ---------------------------------------------------------------------------

function stripAccents(value: string): string {
	return value.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Slug stable d'un nom de Serment : « Lame d'Honneur » → `lame-d-honneur`. */
export function oathSlug(name: string): string {
	return stripAccents(String(name ?? ''))
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/** Forme de comparaison tolérante d'un nom (accents et casse ignorés). */
function nameKey(value: string): string {
	return stripAccents(String(value ?? ''))
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Retrouve un Serment par identifiant (slug) ou par nom. Le nom est comparé d'abord
 * exactement, puis sans accents ni casse (« Élémentaliste » → Elementaliste,
 * « Rodeur » → Rôdeur : alias tolérés par `WEAPON_ICONS`, legacy main.js:6079-6081).
 */
export function findOath(
	idOrName: string | null | undefined,
	catalogue: readonly OathDefinition[] = BUILTIN_OATHS
): OathDefinition | null {
	if (!idOrName) return null;
	const raw = String(idOrName).trim();
	if (!raw) return null;
	const byId = catalogue.find((o) => o.id === raw);
	if (byId) return byId;
	const byName = catalogue.find((o) => o.name === raw);
	if (byName) return byName;
	const key = nameKey(raw);
	return catalogue.find((o) => nameKey(o.name) === key || o.id === oathSlug(raw)) ?? null;
}

// ---------------------------------------------------------------------------
// Surcharges héritées (`serments_custom`)
// ---------------------------------------------------------------------------

/** Forme d'une entrée héritée de `serments_custom` (audit 02 §4.4, legacy main.js:6729-6738). */
export type LegacyCustomOath = {
	arme?: unknown;
	lore?: unknown;
	pvN?: unknown;
	epN?: unknown;
	emN?: unknown;
	dmg?: unknown;
	type?: unknown;
	cat?: unknown;
	sermLevel?: unknown;
	hidden?: unknown;
	evolvesFrom?: unknown;
	icon?: unknown;
	branches?: unknown;
	bA?: unknown;
	bB?: unknown;
};

function finiteOr(value: unknown, fallback: number): number {
	if (value === null || value === undefined || value === '') return fallback;
	const n = Number(value);
	return Number.isFinite(n) ? n : fallback;
}

function textOr(value: unknown, fallback: string): string {
	return typeof value === 'string' ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function tierFromLegacy(raw: unknown): OathTier | null {
	if (!isRecord(raw)) return null;
	return {
		niv: Math.max(1, Math.floor(finiteOr(raw.niv, 1))),
		nom: textOr(raw.nom, ''),
		cout: textOr(raw.cout, ''),
		desc: textOr(raw.desc, '')
	};
}

function branchFromLegacy(raw: unknown): OathBranch | null {
	if (!isRecord(raw)) return null;
	const paliers = Array.isArray(raw.paliers)
		? raw.paliers.map(tierFromLegacy).filter((t): t is OathTier => t !== null)
		: [];
	const branch: OathBranch = { nom: textOr(raw.nom, ''), style: textOr(raw.style, ''), paliers };
	if (typeof raw.descPhys === 'string') branch.descPhys = raw.descPhys;
	if (typeof raw.flavor === 'string') branch.flavor = raw.flavor;
	if (typeof raw.desc === 'string') branch.desc = raw.desc;
	return branch;
}

/**
 * Convertit une entrée `serments_custom` en `OathDefinition`, avec la sémantique de
 * `getAllSD()` : le custom REMPLACE le natif de même nom (legacy main.js:1620-1626).
 * Replis : icône `WEAPON_ICONS[nom] || "✦"` et catégorie `SERM_CATS[nom] || "melee"`
 * (legacy main.js:6509-6510), rang `basic` si un natif de ce nom existe, sinon `singular`
 * (`getSermLevelKey`), branches `branches[]` (A, B) sinon `bA`/`bB` (`getBranches`).
 *
 * Écart assumé : un champ ABSENT du custom reprend la valeur du natif de même nom (comme
 * `effectiveDefinition` le fait pour la croissance, progression.js:22-26) au lieu de laisser
 * `undefined` ; sans natif, défauts de création de l'atelier : pvN 3, epN 5, emN 2, dmg 8
 * (audit 02 §4.4). Un champ présent (même `""`) est conservé tel quel.
 */
export function oathFromLegacyCustom(
	name: string,
	custom: LegacyCustomOath,
	native: OathDefinition | null = findOath(name)
): OathDefinition {
	const trimmed = String(name ?? '').trim();
	const fromArray = Array.isArray(custom.branches)
		? custom.branches.map(branchFromLegacy).filter((b): b is OathBranch => b !== null)
		: [];
	const hasOwnBranches = fromArray.length > 0 || isRecord(custom.bA) || isRecord(custom.bB);
	const bA = fromArray.length
		? (fromArray[0] ?? null)
		: hasOwnBranches
			? branchFromLegacy(custom.bA)
			: (native?.branches.bA ?? null);
	const bB = fromArray.length
		? (fromArray[1] ?? null)
		: hasOwnBranches
			? branchFromLegacy(custom.bB)
			: (native?.branches.bB ?? null);
	const iconRaw = typeof custom.icon === 'string' ? custom.icon.trim() : '';
	const evolvesFrom =
		typeof custom.evolvesFrom === 'string' && custom.evolvesFrom.trim()
			? custom.evolvesFrom.trim()
			: custom.evolvesFrom === undefined
				? (native?.evolvesFrom ?? null)
				: null;
	return {
		id: native?.id ?? oathSlug(trimmed),
		name: native?.name ?? trimmed,
		weapon: textOr(custom.arme, native?.weapon ?? ''),
		growth: {
			pvN: finiteOr(custom.pvN, native?.growth.pvN ?? 3),
			epN: finiteOr(custom.epN, native?.growth.epN ?? 5),
			emN: finiteOr(custom.emN, native?.growth.emN ?? 2)
		},
		baseDamage: finiteOr(custom.dmg, native?.baseDamage ?? 8),
		damageType: textOr(custom.type, native?.damageType ?? ''),
		rank:
			native && (custom.sermLevel === undefined || custom.sermLevel === '')
				? native.rank
				: normalizeOathRank(custom.sermLevel, native !== null),
		hidden: custom.hidden === undefined ? (native?.hidden ?? false) : !!custom.hidden,
		evolvesFrom,
		icon: iconRaw || WEAPON_ICONS[trimmed] || native?.icon || DEFAULT_OATH_ICON,
		category:
			custom.cat === undefined || custom.cat === null || custom.cat === ''
				? (native?.category ?? 'melee')
				: normalizeOathCategory(custom.cat),
		lore: textOr(custom.lore, native?.lore ?? ''),
		branches: { bA, bB, extraBranches: fromArray.length ? fromArray.slice(2) : hasOwnBranches ? [] : (native?.branches.extraBranches ?? []) },
		isBuiltin: false
	};
}

/**
 * Fusion catalogue natif ⊕ surcharges héritées : un custom de même nom remplace le natif
 * (position conservée), les autres sont ajoutés à la suite (`getAllSD`, legacy main.js:1620-1626).
 */
export function mergeOathCatalogue(
	builtin: readonly OathDefinition[],
	customs: Readonly<Record<string, LegacyCustomOath | null | undefined>>
): OathDefinition[] {
	const out = builtin.map((o) => ({ ...o }));
	for (const [name, custom] of Object.entries(customs)) {
		if (!isRecord(custom)) continue;
		const native = findOath(name, builtin);
		const merged = oathFromLegacyCustom(name, custom, native);
		const idx = native ? out.findIndex((o) => o.id === native.id) : -1;
		if (idx >= 0) out[idx] = merged;
		else out.push(merged);
	}
	return out;
}

// ---------------------------------------------------------------------------
// Catalogue natif — VERBATIM legacy main.js:213-485
// ---------------------------------------------------------------------------

function builtin(
	id: string,
	name: string,
	weapon: string,
	growth: Growth,
	baseDamage: number,
	damageType: string,
	meta: {
		rank?: OathRank;
		hidden?: boolean;
		evolvesFrom?: string;
		icon: string;
		category: OathCategory;
	},
	lore: string,
	bA: OathBranch,
	bB: OathBranch
): OathDefinition {
	return {
		id,
		name,
		weapon,
		growth,
		baseDamage,
		damageType,
		rank: meta.rank ?? 'basic',
		hidden: meta.hidden ?? false,
		evolvesFrom: meta.evolvesFrom ?? null,
		icon: meta.icon,
		category: meta.category,
		lore,
		branches: { bA, bB },
		isBuiltin: true
	};
}

/** Les 13 Serments natifs (SD, legacy main.js:213-485). audit 02 §5 */
export const BUILTIN_OATHS: readonly OathDefinition[] = [
	// ----- Duelliste — Basique, Mêlée, ⚔ (main.js:214-233) -----
	builtin(
		'duelliste',
		'Duelliste',
		'Épée moyenne du serment',
		{ pvN: 6, epN: 6, emN: 2 },
		11,
		'Tranchant',
		{ icon: '⚔', category: 'melee' },
		"Le Duelliste n'est pas appelé par la violence. Il est appelé par l'instant juste. Ce serment choisit les êtres capables de garder une ligne claire quand le combat devient confus, ceux qui savent que la victoire se joue parfois dans un demi-pas, une respiration retenue, un angle refusé. Son épée moyenne du serment ne cherche pas à impressionner : elle répond. Elle se place dans la main comme une décision ancienne, sobre, précise, presque familière. Le Duelliste est le combattant de la mesure et de l'exigence. Pas le plus brutal, pas le plus spectaculaire, mais celui qui transforme chaque mouvement en phrase nette. Face à lui, l'adversaire ne combat pas seulement une lame : il combat une lecture.",
		{
			nom: "Branche A — L'Élan Tranchant",
			style: 'Brutalité',
			descPhys:
				"De loin, le sol crisse sous une impulsion brusque. Le corps s'élance, bas, rapide, et la lame arrive avec lui — avant même que l'adversaire ait compris ce qui s'est passé. De près : aucun élan. La lame s'enfonce plein centre, et dans le même geste, le porteur pousse — bras, épaule, poids du corps. L'adversaire part en arrière, les pieds quittent le sol une fraction de seconde.",
			flavor:
				"Cette branche donne au Duelliste son autorité la plus simple : décider de la distance. De loin, il transforme l'espace en accélération. De près, il transforme l'impact en recul forcé. L'adversaire ne choisit plus vraiment où se tient le combat ; il découvre seulement où le Duelliste l'a déplacé.",
			paliers: [
				{
					niv: 2,
					nom: 'Élan Tranchant',
					cout: '6 EM — 1 action',
					desc: "À distance : dash vers la cible + frappe 6+Niv. Au corps à corps : frappe 10+Niv + repousse l'adversaire à distance (les deux doivent utiliser une action de déplacement pour se rapprocher)."
				},
				{
					niv: 5,
					nom: 'Élan Tranchant',
					cout: '6 EM — 1 action',
					desc: 'À distance : 10+Niv. Au corps à corps : 14+Niv + repousse.'
				},
				{
					niv: 7,
					nom: 'Élan Tranchant',
					cout: '6 EM — 1 action',
					desc: 'À distance : 14+Niv. Au corps à corps : 18+Niv + repousse.'
				},
				{
					niv: 10,
					nom: 'Élan Tranchant',
					cout: '6 EM — 1 action',
					desc: 'À distance : 18+Niv. Au corps à corps : 22+Niv + repousse.'
				}
			]
		},
		{
			nom: 'Branche B — Taille Double',
			style: 'Fluidité',
			descPhys:
				"La lame trace une première ligne, puis revient sans pause dans l'autre sens. Deux mouvements qui n'en font qu'un — fluides, enchaînés, comme écrits d'avance.",
			flavor:
				"Taille Double n'est pas une pluie de coups. C'est une phrase en deux syllabes. La première oblige la défense à se révéler, la seconde punit l'espace qu'elle vient d'ouvrir. Le Duelliste ne frappe pas plus vite pour faire joli : il coupe le temps de réaction adverse en deux.",
			paliers: [
				{
					niv: 2,
					nom: 'Taille Double',
					cout: '5 EM — 1 action',
					desc: "2 frappes consécutives traitées individuellement. L'adversaire doit dépenser une défense séparée pour chacune. 5+Niv par frappe (total : 10+Niv×2)."
				},
				{
					niv: 5,
					nom: 'Taille Double',
					cout: '5 EM — 1 action',
					desc: '8+Niv par frappe (total : 16+Niv×2).'
				},
				{
					niv: 7,
					nom: 'Taille Double',
					cout: '5 EM — 1 action',
					desc: '11+Niv par frappe (total : 22+Niv×2).'
				},
				{
					niv: 10,
					nom: 'Taille Double',
					cout: '5 EM — 1 action',
					desc: '14+Niv par frappe (total : 28+Niv×2).'
				}
			]
		}
	),

	// ----- Bretteur — Aguerri, masqué, évolution de Duelliste, Mêlée, ⚔ (main.js:235-254) -----
	builtin(
		'bretteur',
		'Bretteur',
		'Épée fine du serment',
		{ pvN: 5, epN: 7, emN: 3 },
		12,
		'Tranchant',
		{ rank: 'seasoned', hidden: true, evolvesFrom: 'Duelliste', icon: '⚔', category: 'melee' },
		"Le Bretteur est ce que devient le Duelliste quand la maîtrise cesse d'être droite et devient insaisissable. Il ne cherche plus seulement l'ouverture : il la fabrique. Sa lame fine du serment vit dans les appuis, les feintes, les micro-reculs, les gestes qui ressemblent à des erreurs jusqu'à ce qu'il soit trop tard. Le Bretteur impose un rythme nerveux, presque insolent. Il provoque une défense, la déplace d'un souffle, puis frappe exactement là où l'adversaire vient de se trahir. On ne le tient jamais tout à fait. On croit l'avoir lu, et c'est souvent à cet instant précis qu'il a déjà changé de phrase.",
		{
			nom: 'Branche A — Feinte de Fer',
			style: 'Précision',
			descPhys:
				"La lame part trop tôt, trop visible — presque volontairement. L'adversaire réagit, et c'est là que le vrai coup arrive, décalé d'un souffle, porté dans l'angle que la défense vient d'abandonner.",
			flavor:
				"Le Bretteur vend une erreur comme d'autres vendent une menace. Il donne à l'adversaire quelque chose à défendre, puis retire le sens du geste au dernier moment. La cible ne tombe pas dans un piège grossier ; elle tombe dans sa propre bonne réaction.",
			paliers: [
				{
					niv: 10,
					nom: 'Feinte de Fer',
					cout: '6 EM — 1 action',
					desc: 'Frappe 8+Niv. Si la cible utilise une défense, elle dépense 2 EP supplémentaires. Si elle ne défend pas, la frappe gagne +4 dégâts.'
				},
				{
					niv: 13,
					nom: 'Feinte de Fer',
					cout: '6 EM — 1 action',
					desc: 'Frappe 12+Niv. Défense adverse : +3 EP dépensés. Sans défense : +6 dégâts.'
				},
				{
					niv: 16,
					nom: 'Feinte de Fer',
					cout: '6 EM — 1 action',
					desc: 'Frappe 16+Niv. Défense adverse : +4 EP dépensés. Sans défense : +8 dégâts.'
				},
				{
					niv: 20,
					nom: 'Feinte de Fer',
					cout: '6 EM — 1 action',
					desc: 'Frappe 20+Niv. Défense adverse : +5 EP dépensés. Sans défense : +10 dégâts.'
				}
			]
		},
		{
			nom: 'Branche B — Pas Rompu',
			style: 'Fluidité',
			descPhys:
				"Le Bretteur pivote au dernier instant. Le corps se décale, la lame accompagne le mouvement, et l'attaque adverse glisse dans le vide pendant qu'une ligne nette apparaît en retour.",
			flavor:
				"Pas Rompu n'est pas une fuite. C'est une disparition minuscule. Le Bretteur laisse l'attaque passer à l'endroit où il était, puis revient dans l'angle mort avec la cruauté tranquille de quelqu'un qui avait prévu le coup avant son départ.",
			paliers: [
				{
					niv: 10,
					nom: 'Pas Rompu',
					cout: '5 EM — réaction',
					desc: "Lorsqu'une attaque ciblée est esquivée, le Bretteur peut riposter : 5+Niv dégâts. Utilisable 1 fois par tour."
				},
				{
					niv: 13,
					nom: 'Pas Rompu',
					cout: '5 EM — réaction',
					desc: 'Riposte après esquive : 8+Niv dégâts. Le Bretteur peut aussi se replacer à distance courte.'
				},
				{
					niv: 16,
					nom: 'Pas Rompu',
					cout: '5 EM — réaction',
					desc: 'Riposte après esquive : 11+Niv dégâts. La prochaine attaque du Bretteur contre cette cible coûte -1 EP.'
				},
				{
					niv: 20,
					nom: 'Pas Rompu',
					cout: '5 EM — réaction',
					desc: 'Riposte après esquive : 14+Niv dégâts. Si la cible a raté son attaque, elle perd 1 action de déplacement ce tour.'
				}
			]
		}
	),

	// ----- Claymore — Aguerri, masqué, évolution de Duelliste, Mêlée, ⚔ (main.js:256-275) -----
	builtin(
		'claymore',
		'Claymore',
		'Claymore du serment',
		{ pvN: 7, epN: 4, emN: 2 },
		16,
		'Tranchant lourd',
		{ rank: 'seasoned', hidden: true, evolvesFrom: 'Duelliste', icon: '⚔', category: 'melee' },
		"Le Claymore naît quand un Duelliste renonce à la finesse comme unique réponse et choisit le poids. Ce serment ne récompense pas la vitesse : il récompense l'engagement total. Sa grande lame du serment impose une question simple à chaque adversaire : es-tu vraiment prêt à recevoir ça ? Le porteur avance peu, mais chaque pas change la géographie du combat. Il lève la lame comme on lève une menace, accepte d'être lisible, et transforme cette lisibilité en terreur. Le Claymore ne surprend pas par l'angle. Il prévient, puis frappe quand même. Sa force est là : l'adversaire voit venir le coup et doute malgré tout de pouvoir l'arrêter.",
		{
			nom: 'Branche A — Posture Haute',
			style: 'Pression lourde',
			descPhys:
				"Le porteur remonte l'espadon au-dessus de l'épaule. La garde paraît ouverte, presque provocante, mais la lame suspendue annonce un coup si lourd que l'adversaire doit décider avant même qu'il parte.",
			flavor:
				"Posture Haute fait de la préparation une arme. Le Claymore annonce le danger, garde la lame suspendue, et force l'adversaire à vivre une seconde entière sous la promesse de l'impact. Ce n'est pas discret. C'est pire : c'est inévitable.",
			paliers: [
				{
					niv: 10,
					nom: 'Posture Haute',
					cout: '6 EM — 1 action',
					desc: "Entre en posture jusqu'au prochain tour. La prochaine Frappe Haute coûte 10 EP, inflige 20+Niv dégâts et retire 12 EP si la cible bloque."
				},
				{
					niv: 13,
					nom: 'Posture Haute',
					cout: '6 EM — 1 action',
					desc: 'Frappe Haute : 24+Niv dégâts, 10 EP. Si la cible bloque, elle perd 14 EP.'
				},
				{
					niv: 16,
					nom: 'Posture Haute',
					cout: '6 EM — 1 action',
					desc: 'Frappe Haute : 28+Niv dégâts, 10 EP. Si la cible bloque, elle perd 16 EP et ne peut pas se déplacer au prochain round.'
				},
				{
					niv: 20,
					nom: 'Posture Haute',
					cout: '6 EM — 1 action',
					desc: 'Frappe Haute : 32+Niv dégâts, 10 EP. Si la cible bloque, elle perd 20 EP. Sur défense réussie, la cible subit tout de même 25% des dégâts sous forme d\'impact.'
				}
			]
		},
		{
			nom: 'Branche B — Fendre la Ligne',
			style: 'Brise-ligne',
			descPhys:
				"L'espadon part en arc large, lent, plein. Ce n'est pas une coupe élégante : c'est une masse de métal qui traverse la garde, les appuis et la certitude de tenir bon.",
			flavor:
				"Fendre la Ligne n'est pas fait pour courir après les fuyards. C'est une réponse aux gardes, aux fronts, aux certitudes. Le Claymore frappe là où l'ennemi pensait tenir, jusqu'à ce que la position cesse d'être une protection et devienne un piège.",
			paliers: [
				{
					niv: 10,
					nom: 'Fendre la Ligne',
					cout: '7 EM — 1 action',
					desc: 'Frappe 10+Niv dégâts. Brise-ligne : si la cible bloque, le coup traverse le blocage et ajoute en dégâts le bonus que le blocage aurait retiré. Si la cible a déjà défendu ce tour, elle dépense +3 EP pour défendre cette attaque.'
				},
				{
					niv: 13,
					nom: 'Fendre la Ligne',
					cout: '7 EM — 1 action',
					desc: 'Frappe 14+Niv dégâts. Brise-ligne : si la cible bloque, le coup traverse le blocage et ajoute en dégâts le bonus que le blocage aurait retiré. Contre une cible en garde, parade ou protection, ajoute +4 dégâts.'
				},
				{
					niv: 16,
					nom: 'Fendre la Ligne',
					cout: '7 EM — 1 action',
					desc: 'Frappe 18+Niv dégâts. Brise-ligne : si la cible bloque, le coup traverse le blocage et ajoute en dégâts le bonus que le blocage aurait retiré. Une défense réussie ne permet pas à la cible de se replacer gratuitement.'
				},
				{
					niv: 20,
					nom: 'Fendre la Ligne',
					cout: '7 EM — 1 action',
					desc: "Frappe 22+Niv dégâts. Brise-ligne : si la cible bloque, le coup traverse le blocage et ajoute en dégâts le bonus que le blocage aurait retiré. Si la cible défend, sa prochaine défense coûte +2 EP jusqu'à la fin du tour suivant."
				}
			]
		}
	),

	// ----- Lame d'Honneur — Aguerri, masqué, évolution de Duelliste, Mêlée, ⚔ (main.js:277-296) -----
	builtin(
		'lame-d-honneur',
		"Lame d'Honneur",
		'Épée claire du serment',
		{ pvN: 7, epN: 5, emN: 3 },
		10,
		'Tranchant',
		{ rank: 'seasoned', hidden: true, evolvesFrom: 'Duelliste', icon: '⚔', category: 'melee' },
		"La Lame d'Honneur ne protège pas le monde entier. Elle choisit une cible et transforme ce choix en serment. Là où d'autres combattants dispersent leur attention, elle resserre le champ de bataille jusqu'à ce qu'il ne reste qu'un duel, une faute à punir, une promesse à tenir. Sa lame claire ne brille pas pour faire joli : elle désigne. Une fois le duel juré, la Lame d'Honneur devient terrifiante contre l'adversaire choisi et presque volontairement médiocre contre le reste. Ce n'est pas une faiblesse accidentelle, c'est le prix de sa foi. Elle gagne en puissance parce qu'elle accepte de n'avoir qu'une obsession.",
		{
			nom: 'Branche A — Duel Juré',
			style: 'Duel',
			descPhys:
				"La Lame d'Honneur pointe une cible. Le monde ne disparaît pas, mais tout semble se resserrer entre deux corps, deux souffles, deux volontés. Chaque pas hors de ce duel paraît plus lourd, presque moins légitime.",
			flavor:
				"Duel Juré ferme la porte. L'EM investi devient une mise à prix spirituelle : il ne revient pas simplement avec le temps, parce qu'il appartient désormais à la promesse. La Lame d'Honneur gagne le droit de frapper sa cible comme une sentence, mais tout ce qui n'est pas cette cible devient secondaire, presque indigne de sa lame.",
			paliers: [
				{
					niv: 10,
					nom: 'Duel Juré',
					cout: '5 EM — 1 action — EM non régénérable',
					desc: "Désigne une cible jusqu'à sa mort, la fin du combat ou rupture validée staff. Contre elle : +40% dégâts. Contre toute autre cible : -60% dégâts. Si la cible meurt, récupère jusqu'à 6 EP dépensés pendant ce duel."
				},
				{
					niv: 13,
					nom: 'Duel Juré',
					cout: '5 EM — 1 action — EM non régénérable',
					desc: "Contre la cible jurée : +55% dégâts. Contre les autres : -70% dégâts. Si la cible meurt, récupère jusqu'à 9 EP dépensés pendant ce duel."
				},
				{
					niv: 16,
					nom: 'Duel Juré',
					cout: '5 EM — 1 action — EM non régénérable',
					desc: "Contre la cible jurée : +70% dégâts. Contre les autres : -80% dégâts. Si la cible meurt, récupère jusqu'à 12 EP dépensés pendant ce duel."
				},
				{
					niv: 20,
					nom: 'Duel Juré',
					cout: '5 EM — 1 action — EM non régénérable',
					desc: "Contre la cible jurée : +90% dégâts. Contre les autres : -90% dégâts. Si la cible meurt, récupère toute l'EP dépensée pendant ce duel, dans la limite de son maximum d'EP."
				}
			]
		},
		{
			nom: 'Branche B — Sentence du Duel',
			style: 'Exécution',
			descPhys:
				"La lame claire ne cherche plus les ouvertures générales. Elle revient toujours vers la même présence, le même angle, la même faute. Chaque coup ressemble moins à une attaque qu'à une ligne de plus dans une condamnation.",
			flavor:
				"Sentence du Duel est la partie la plus froide du serment. Pas de panache inutile, pas de grande protection héroïque : seulement la même cible, encore, jusqu'à rupture. Chaque frappe rappelle que la Lame d'Honneur a choisi son ennemi et que ce choix doit aller au bout.",
			paliers: [
				{
					niv: 10,
					nom: 'Sentence du Duel',
					cout: '4 EM — 1 action — cible jurée uniquement',
					desc: 'Frappe 10+Niv dégâts. Si la cible est sous Duel Juré, ajoute +4 dégâts et marque 1 EP dépensé comme récupérable si elle meurt.'
				},
				{
					niv: 13,
					nom: 'Sentence du Duel',
					cout: '4 EM — 1 action — cible jurée uniquement',
					desc: 'Frappe 14+Niv dégâts. Si la cible est sous Duel Juré, ajoute +7 dégâts et marque 2 EP dépensés comme récupérables si elle meurt.'
				},
				{
					niv: 16,
					nom: 'Sentence du Duel',
					cout: '4 EM — 1 action — cible jurée uniquement',
					desc: 'Frappe 18+Niv dégâts. Si la cible est sous Duel Juré, ajoute +10 dégâts. Si elle défend, sa défense coûte +2 EP.'
				},
				{
					niv: 20,
					nom: 'Sentence du Duel',
					cout: '4 EM — 1 action — cible jurée uniquement',
					desc: "Frappe 22+Niv dégâts. Si la cible est sous Duel Juré, ajoute +14 dégâts. Si cette attaque tue la cible, la récupération d'EP du Duel Juré se déclenche immédiatement."
				}
			]
		}
	),

	// ----- Sauvageon — Basique, Mêlée, 🪓 (main.js:297-316) -----
	builtin(
		'sauvageon',
		'Sauvageon',
		'Hache à deux mains du serment',
		{ pvN: 5, epN: 8, emN: 1 },
		14,
		'Tranchant',
		{ icon: '🪓', category: 'melee' },
		"Le Sauvageon est le serment de ceux qui ont appris à vivre avant d'apprendre à se tenir droits. Il ne leur offre pas la brutalité : il la reconnaît déjà là, enfouie dans les épaules, dans la mâchoire, dans cette façon d'avancer quand tout conseille de reculer. Sa hache à deux mains du serment est une évidence primitive, lourde, presque insultante dans sa simplicité. Elle ne promet ni élégance ni pardon. Elle promet que quelque chose va céder. Le Sauvageon n'est pas seulement fort : il est habité par une survie ancienne, une rage utile, une endurance qui donne l'impression que le monde l'a cogné longtemps sans réussir à le coucher.",
		{
			nom: 'Branche A — Spirale Brisante',
			style: 'AOE',
			descPhys:
				"La hache s'abat sur le sol avec tout le poids du porteur. Le sol se fissure sous l'impact. Une onde de choc se propage en cercle — quiconque se tient à portée sent le sol lui échapper sous les pieds.",
			flavor:
				"Spirale Brisante est une décision sans nuance. Le Sauvageon ne demande pas au champ de bataille de se ranger proprement : il frappe le point qui doit exploser et accepte que tout ce qui traîne trop près paie le prix. C'est violent, dangereux, parfois sale, mais jamais hésitant.",
			paliers: [
				{
					niv: 2,
					nom: 'Spirale Brisante',
					cout: '5 EM — 1 action',
					desc: 'Frappe le sol. Toutes entités au corps à corps — ennemies ET alliées — subissent 8+Niv dégâts contondants.'
				},
				{
					niv: 5,
					nom: 'Spirale Brisante',
					cout: '5 EM — 1 action',
					desc: '12+Niv à toutes entités au CAC.'
				},
				{
					niv: 7,
					nom: 'Spirale Brisante',
					cout: '5 EM — 1 action',
					desc: '16+Niv à toutes entités au CAC.'
				},
				{
					niv: 10,
					nom: 'Spirale Brisante',
					cout: '5 EM — 1 action',
					desc: '20+Niv à toutes entités au CAC.'
				}
			]
		},
		{
			nom: 'Branche B — Lancer Bestial',
			style: 'Précision',
			descPhys:
				"Aucune préparation. Aucun calcul apparent. Le Sauvageon saisit sa hache, pivote, et la lâche avec une force brute qui n'a rien d'élégant — et pourtant elle file droit, implacable, comme si la violence elle-même avait décidé de l'endroit où elle devait atterrir.",
			flavor:
				"Lancer Bestial transforme la hache en verdict. Le Sauvageon abandonne volontairement son arme pour envoyer toute sa force en ligne droite. Le risque fait partie de la beauté du geste : pendant un instant, il n'a plus rien en main, mais l'adversaire, lui, doit vivre avec ce qui vient de le percuter.",
			paliers: [
				{
					niv: 2,
					nom: 'Lancer Bestial',
					cout: '8 EM — 1 action',
					desc: "Lance la hache sur une cible à distance : 18+Niv. Après le lancer, le porteur n'a plus son arme — réinvoquer (1 EM, 1 action) ou aller la récupérer (2 actions)."
				},
				{ niv: 5, nom: 'Lancer Bestial', cout: '8 EM — 1 action', desc: '24+Niv.' },
				{ niv: 7, nom: 'Lancer Bestial', cout: '8 EM — 1 action', desc: '30+Niv.' },
				{ niv: 10, nom: 'Lancer Bestial', cout: '8 EM — 1 action', desc: '38+Niv.' }
			]
		}
	),

	// ----- Croisé — Basique, Mêlée, 🛡 (main.js:318-337) -----
	builtin(
		'croise',
		'Croisé',
		'Bouclier du serment',
		{ pvN: 8, epN: 3, emN: 2 },
		6,
		'Contondant',
		{ icon: '🛡', category: 'melee' },
		"Le Croisé est un refus. Refus de reculer, refus de céder la place, refus de laisser le chaos décider seul de ce qui tombe. Ce serment ne cherche pas les âmes douces ; il cherche celles qui portent déjà un devoir trop lourd et qui continuent malgré tout. Son bouclier du serment n'est pas un accessoire défensif. C'est une frontière mobile, un morceau de mur arraché au monde et confié à deux bras. Le Croisé avance avec une gravité presque cérémonielle. Quand il se place, il dit sans parler : ici, ça ne passe plus. Ses victoires ne sont pas toujours rapides, mais elles ont la solidité des choses qu'on n'a pas réussi à faire plier.",
		{
			nom: 'Branche A — Bash Cinglant',
			style: 'Offensif',
			descPhys:
				"Le bouclier s'illumine d'une lueur jaunâtre, brève et sourde. Puis il part en travers — un choc brut, sans élégance. À chaque impact, quelque chose se renforce dans le Croisé — une résistance qui monte, comme si le combat lui-même nourrissait sa capacité à encaisser.",
			flavor:
				"Bash Cinglant rappelle que le bouclier n'est pas un objet passif. Chaque impact est une déclaration : le Croisé ne se contente pas d'encaisser, il répond avec le poids même de sa défense. Plus il frappe, plus son corps semble comprendre qu'il doit rester debout.",
			paliers: [
				{
					niv: 2,
					nom: 'Bash Cinglant',
					cout: '6 EM — 1 action (CAC uniquement)',
					desc: 'Frappe avec le bouclier : 5+Niv dégâts. Chaque hit augmente les PV maximum du Croisé de +3 PV max. Ces PV bonus disparaissent à la fin du combat.'
				},
				{
					niv: 5,
					nom: 'Bash Cinglant',
					cout: '6 EM — 1 action',
					desc: '7+Niv dégâts. +5 PV max par hit.'
				},
				{
					niv: 7,
					nom: 'Bash Cinglant',
					cout: '6 EM — 1 action',
					desc: '10+Niv dégâts. +7 PV max par hit.'
				},
				{
					niv: 10,
					nom: 'Bash Cinglant',
					cout: '6 EM — 1 action',
					desc: '13+Niv dégâts. +10 PV max par hit.'
				}
			]
		},
		{
			nom: 'Branche B — Appel du Bouclier',
			style: 'Aggro',
			descPhys:
				"Le bouclier s'illumine d'une lueur jaunâtre, intense, presque aveuglante. Le Croisé le frappe contre le sol avec fracas. Il se dresse, immobile, regard fixe — et quelque chose dans cette lumière et cette posture dit aux ennemis que c'est lui, et lui seul, qu'ils doivent abattre.",
			flavor:
				"Appel du Bouclier n'est pas un cri pour attirer l'attention. C'est une injonction. Le Croisé devient le problème central de la scène, la cible qu'on ne peut plus ignorer. Chaque ennemi qui mord à l'appel renforce le mur qu'il essaie d'abattre.",
			paliers: [
				{
					niv: 2,
					nom: 'Appel du Bouclier',
					cout: '6 EM — 1 action',
					desc: 'Provoque toutes les entités ennemies à portée. +3+Niv PV max par monstre provoqué. Mobs intelligents : effet 1 tour. Mobs agressifs : permanent. Désactivable sans action.'
				},
				{
					niv: 5,
					nom: 'Appel du Bouclier',
					cout: '6 EM — 1 action',
					desc: '+5+Niv PV max par monstre provoqué.'
				},
				{
					niv: 7,
					nom: 'Appel du Bouclier',
					cout: '6 EM — 1 action',
					desc: '+7+Niv PV max par monstre provoqué.'
				},
				{
					niv: 10,
					nom: 'Appel du Bouclier',
					cout: '6 EM — 1 action',
					desc: '+10+Niv PV max par monstre provoqué.'
				}
			]
		}
	),

	// ----- Rôdeur — Basique, Mêlée, 🗡 (main.js:339-358) -----
	builtin(
		'rodeur',
		'Rôdeur',
		'Dague du serment',
		{ pvN: 2, epN: 5, emN: 3 },
		8,
		'Tranchant',
		{ icon: '🗡', category: 'melee' },
		"Le Rôdeur appartient aux bords du monde : couloirs mal éclairés, routes secondaires, ruines où l'on entend trop tard le pas qui approche. Ce serment choisit les êtres qui survivent par mouvement, par silence, par instinct. Sa dague du serment n'a rien d'une arme glorieuse. Elle est courte, nerveuse, personnelle, faite pour apparaître au moment exact où l'adversaire croyait encore contrôler la distance. Le Rôdeur ne domine pas le combat, il l'échappe. Il glisse hors des prises, revient dans les angles morts, transforme la fragilité en vitesse. Le danger chez lui n'est pas massif : il est soudain.",
		{
			nom: 'Branche A — Rafale de Lames',
			style: 'Mêlée',
			descPhys:
				"La dague ne s'arrête pas. Premier coup, deuxième, troisième — enchaînés sans temps mort, sans respiration. La main du Rôdeur disparaît dans une succession de gestes trop rapides pour être lus séparément.",
			flavor:
				"Rafale de Lames ne cherche pas le coup parfait. Elle noie la défense sous des décisions trop rapprochées. Trois entailles, trois urgences, une seule respiration pour comprendre. Le Rôdeur gagne parce que la cible n'a pas le temps de répondre correctement à tout.",
			paliers: [
				{
					niv: 2,
					nom: 'Rafale de Lames',
					cout: '6 EM — 1 action',
					desc: '3 frappes consécutives sur une même cible. Chaque frappe traitée individuellement (défense séparée pour chacune). 1+Niv par frappe (total : 3+Niv×3).'
				},
				{
					niv: 5,
					nom: 'Rafale de Lames',
					cout: '6 EM — 1 action',
					desc: '3+Niv par frappe (total : 9+Niv×3).'
				},
				{
					niv: 7,
					nom: 'Rafale de Lames',
					cout: '6 EM — 1 action',
					desc: '5+Niv par frappe (total : 15+Niv×3).'
				},
				{
					niv: 10,
					nom: 'Rafale de Lames',
					cout: '6 EM — 1 action',
					desc: '7+Niv par frappe (total : 21+Niv×3).'
				}
			]
		},
		{
			nom: 'Branche B — Lancer Lié',
			style: 'Distance',
			descPhys:
				"La dague quitte la main, frappe, et revient — comme si un fil invisible la ramenait. Le Rôdeur n'attend pas. La lame est déjà de retour avant même que l'adversaire ait compris qu'elle était partie.",
			flavor:
				"Lancer Lié donne au Rôdeur une menace impossible à confisquer. La dague part, mord, revient. L'adversaire ne peut pas compter sur la perte de l'arme pour respirer : elle est déjà revenue, comme une mauvaise nouvelle qui connaît le chemin.",
			paliers: [
				{
					niv: 2,
					nom: 'Lancer Lié',
					cout: '5 EM — 1 action',
					desc: 'Lance la dague sur une cible à distance (hors CAC uniquement). 5+Niv. La dague revient automatiquement et gratuitement.'
				},
				{
					niv: 5,
					nom: 'Lancer Lié',
					cout: '5 EM — 1 action',
					desc: '9+Niv. Retour automatique.'
				},
				{
					niv: 7,
					nom: 'Lancer Lié',
					cout: '5 EM — 1 action',
					desc: '13+Niv. Retour automatique.'
				},
				{
					niv: 10,
					nom: 'Lancer Lié',
					cout: '5 EM — 1 action',
					desc: '17+Niv. Retour automatique.'
				}
			]
		}
	),

	// ----- Traqueur — Basique, Mêlée, 🏹 (main.js:360-379) -----
	builtin(
		'traqueur',
		'Traqueur',
		'Lance du serment',
		{ pvN: 2, epN: 7, emN: 2 },
		8,
		'Tranchant',
		{ icon: '🏹', category: 'melee' },
		"Le Traqueur ne chasse pas pour courir. Il chasse pour réduire les options. Ce serment reconnaît les esprits qui savent attendre, lire les habitudes, rendre chaque fuite un peu plus coûteuse que la précédente. Sa lance du serment n'est pas seulement une arme d'allonge ; c'est un compas froid, une manière de garder l'adversaire à la distance exacte où il souffre le plus. Le Traqueur ne cherche pas forcément la mort rapide. Il préfère l'épuisement, la pression, le terrain qui se referme. Face à lui, on a d'abord l'impression d'avoir encore le choix. Puis l'on comprend que ces choix étaient déjà prévus.",
		{
			nom: 'Branche A — Lance Drainante',
			style: 'Épuisement',
			descPhys:
				'La lance entre, ressort. Mais quelque chose reste — une douleur sourde, diffuse, qui court dans les membres. La cible bouge encore, mais chaque geste lui coûte un peu plus qu\'avant.',
			flavor:
				"Lance Drainante est une blessure qui continue de parler après l'impact. La cible bouge encore, mais chaque geste devient plus lourd, chaque défense moins naturelle. Le Traqueur ne vole pas seulement de l'énergie : il vole la durée du combat.",
			paliers: [
				{
					niv: 2,
					nom: 'Lance Drainante',
					cout: '5 EM — 1 action',
					desc: 'Frappe la cible : 4+Niv dégâts. Simultanément : la cible perd 8 EP.'
				},
				{
					niv: 5,
					nom: 'Lance Drainante',
					cout: '5 EM — 1 action',
					desc: '8+Niv dégâts. Cible perd 12 EP.'
				},
				{
					niv: 7,
					nom: 'Lance Drainante',
					cout: '5 EM — 1 action',
					desc: '12+Niv dégâts. Cible perd 16 EP.'
				},
				{
					niv: 10,
					nom: 'Lance Drainante',
					cout: '5 EM — 1 action',
					desc: '16+Niv dégâts. Cible perd 20 EP.'
				}
			]
		},
		{
			nom: 'Branche B — Tenue de Ligne',
			style: 'Contrôle',
			descPhys:
				"De loin : la lance se tend, précise, contrôlée. Elle atteint sans que le porteur ait bougé d'un pas. De près : la lance s'enfonce avec toute la puissance du Traqueur derrière elle, puis pousse — un mouvement brusque, sec, qui recrée la distance de force.",
			flavor:
				"Tenue de Ligne est la grammaire du Traqueur : loin, il atteint ; près, il repousse. Il ne gagne pas parce qu'il bouge davantage, mais parce qu'il impose à l'autre la distance exacte où la lance a raison.",
			paliers: [
				{
					niv: 2,
					nom: 'Tenue de Ligne',
					cout: '5 EM — 1 action',
					desc: 'À distance : frappe à portée de lance, 4+Niv. Au corps à corps : frappe puissante 10+Niv + repousse la cible à distance (les deux doivent utiliser une action de déplacement).'
				},
				{
					niv: 5,
					nom: 'Tenue de Ligne',
					cout: '5 EM — 1 action',
					desc: 'Distance : 8+Niv. CAC : 16+Niv + repousse.'
				},
				{
					niv: 7,
					nom: 'Tenue de Ligne',
					cout: '5 EM — 1 action',
					desc: 'Distance : 12+Niv. CAC : 22+Niv + repousse.'
				},
				{
					niv: 10,
					nom: 'Tenue de Ligne',
					cout: '5 EM — 1 action',
					desc: 'Distance : 16+Niv. CAC : 28+Niv + repousse.'
				}
			]
		}
	),

	// ----- Flécheur — Basique, Distance, 🏹 (main.js:381-400) -----
	builtin(
		'flecheur',
		'Flécheur',
		'Arc du serment',
		{ pvN: 3, epN: 5, emN: 4 },
		10,
		'Tranchant',
		{ icon: '🏹', category: 'distance' },
		"Le Flécheur est le serment de ceux qui savent attendre sans faiblir. Il ne récompense pas seulement la bonne vue ou la main stable ; il récompense la capacité à garder le monde entier immobile dans sa tête jusqu'à ce que la cible devienne évidente. Son arc du serment n'est pas une arme de panique. C'est une ligne tendue entre patience et conséquence. Le Flécheur paraît souvent distant, presque absent du tumulte, mais cette distance est une concentration. Il voit les trajectoires, les erreurs d'appui, les secondes où l'ennemi cesse de protéger son propre avenir. Quand il tire, ce n'est pas pour participer au combat. C'est pour le corriger.",
		{
			nom: 'Branche A — Salve Aveugle',
			style: 'AOE',
			descPhys:
				"Plusieurs flèches partent en même temps, en arc large. Elles ne cherchent pas une cible précise — elles saturent l'espace. Quiconque se trouve dans la zone reçoit.",
			flavor:
				"Salve Aveugle est le moment où le Flécheur renonce à la perfection pour contrôler une zone entière. Ce n'est pas élégant, pas propre, pas toujours confortable pour les alliés. Mais pendant quelques secondes, le terrain cesse d'appartenir à ceux qui s'y trouvent.",
			paliers: [
				{
					niv: 2,
					nom: 'Salve Aveugle',
					cout: '6 EM — 1 action',
					desc: 'Zone à distance. Toutes entités dans la zone — ennemies ET alliées — subissent 7+Niv.'
				},
				{
					niv: 5,
					nom: 'Salve Aveugle',
					cout: '6 EM — 1 action',
					desc: '9+Niv à toutes entités dans la zone.'
				},
				{
					niv: 7,
					nom: 'Salve Aveugle',
					cout: '6 EM — 1 action',
					desc: '12+Niv à toutes entités dans la zone.'
				},
				{
					niv: 10,
					nom: 'Salve Aveugle',
					cout: '6 EM — 1 action',
					desc: '15+Niv à toutes entités dans la zone.'
				}
			]
		},
		{
			nom: 'Branche B — Flèche de Jugement',
			style: 'Concentration',
			descPhys:
				"Le Flécheur s'immobilise. Tout le reste disparaît — le mouvement, le bruit, les alliés. Il ne reste que la cible et la corde tendue à l'extrême. Plus il attend, plus la flèche porte loin et fort. Quand elle part, c'est une sentence.",
			flavor:
				"Flèche de Jugement transforme l'attente en poids. Chaque action conservée devient de la tension dans la corde, du silence dans le bras, de la certitude dans le tir. Quand la flèche part enfin, elle porte avec elle tout ce que le Flécheur a refusé de faire avant.",
			paliers: [
				{
					niv: 2,
					nom: 'Flèche de Jugement',
					cout: '8 EM — coûte toutes les actions restantes du tour',
					desc: '0 action sacrifiée : 7+Niv. 1 action : 14+Niv. 2 actions : 20+Niv. Interdit en surcadençage.'
				},
				{
					niv: 5,
					nom: 'Flèche de Jugement',
					cout: '8 EM',
					desc: '0 action : 11+Niv. 1 action : 18+Niv. 2 actions : 26+Niv.'
				},
				{
					niv: 7,
					nom: 'Flèche de Jugement',
					cout: '8 EM',
					desc: '0 action : 15+Niv. 1 action : 22+Niv. 2 actions : 32+Niv.'
				},
				{
					niv: 10,
					nom: 'Flèche de Jugement',
					cout: '8 EM',
					desc: '0 action : 19+Niv. 1 action : 28+Niv. 2 actions : 38+Niv.'
				}
			]
		}
	),

	// ----- Elementaliste — Basique, Mêlée, 👊 (clé sans accent, main.js:402-421) -----
	builtin(
		'elementaliste',
		'Elementaliste',
		'Poing américain du serment serti de gemmes',
		{ pvN: 4, epN: 4, emN: 4 },
		7,
		'Contondant',
		{ icon: '👊', category: 'melee' },
		"L'Élémentaliste est choisi par les âmes capables de porter deux catastrophes contraires sans se déchirer. Ce serment ne donne pas le feu, la glace, la foudre ou l'eau à quelqu'un qui veut seulement faire du bruit. Il répond à ceux qui savent alterner, contenir, relâcher, reprendre. Son poing américain serti de gemmes ressemble moins à une arme qu'à un verrou posé sur des forces trop anciennes pour être aimables. Chaque gemme retient une humeur du monde. Chaque frappe ouvre une serrure différente. L'Élémentaliste paraît souvent calme parce qu'il doit l'être : s'il cesse de tenir l'équilibre, ce ne sont plus ses poings qui parlent, mais les éléments qui commencent à le manger vivant.\n\nRÈGLE UNIVERSELLE — LE COMPTEUR ÉLÉMENTAIRE : Quelle que soit la branche choisie, l'Élémentaliste obéit à une loi fondamentale — les éléments exigent l'alternance. Chaque utilisation consécutive d'un même élément fait monter un compteur interne. À ±2, switcher vers l'élément opposé déclenche une combinaison élémentaire. Le compteur revient à 0. Un troisième coup consécutif sans switcher applique un malus de −25% aux dégâts (puis −50%, −75%...). Le corps de l'Élémentaliste trahit toujours son état : à ±2, le dernier élément utilisé commence à recouvrir son corps — flammes, givre, crépitements ou humidité — de plus en plus visible et incontrôlable.",
		{
			nom: 'Branche A — Feu & Glace',
			style: 'Équilibre offensif',
			descPhys:
				"Le poing s'embrase ou se couvre de givre à l'impact. Si le porteur insiste sans alterner, les flammes deviennent incontrôlables sur son bras, ou le givre commence à remonter sur ses articulations. Ce n'est plus lui qui contrôle — c'est l'élément qui le gagne.",
			flavor:
				"Feu & Glace est une danse dangereuse entre morsure et fracture. Le feu donne l'assaut, cher, violent, impatient. La glace répond plus sobrement, mais elle prépare les os, les plaques, les défenses à céder au mauvais moment. GIVRE-BRÛLURE transforme le froid accumulé en brûlure brutale ; EMBRASEMENT laisse la cible fissurée, prête à payer plus cher le prochain impact.",
			paliers: [
				{
					niv: 2,
					nom: 'Poing Ardent (6 EM) / Poing Polaire (4 EM)',
					cout: '6 EM Feu / 4 EM Glace — 1 action CAC',
					desc: 'Feu : 8+Niv (brûlure). Glace : 5+Niv (gel). GIVRE-BRÛLURE : +7+Niv bonus brûlure. EMBRASEMENT : Brise Armure +10 sur prochain coup reçu par la cible.'
				},
				{
					niv: 5,
					nom: 'Poing Ardent / Poing Polaire',
					cout: '6 EM / 4 EM',
					desc: 'Feu : 11+Niv. Glace : 8+Niv. GIVRE-BRÛLURE : +12+Niv. EMBRASEMENT : +16.'
				},
				{
					niv: 7,
					nom: 'Poing Ardent / Poing Polaire',
					cout: '6 EM / 4 EM',
					desc: 'Feu : 14+Niv. Glace : 11+Niv. GIVRE-BRÛLURE : +17+Niv. EMBRASEMENT : +22.'
				},
				{
					niv: 10,
					nom: 'Poing Ardent / Poing Polaire',
					cout: '6 EM / 4 EM',
					desc: 'Feu : 17+Niv. Glace : 14+Niv. GIVRE-BRÛLURE : +24+Niv. EMBRASEMENT : +30.'
				}
			]
		},
		{
			nom: 'Branche B — Foudre & Eau',
			style: "Équilibre d'accumulation",
			descPhys:
				"Le poing crépite ou s'humidifie à l'impact. Si le porteur abuse de la foudre, les crépitements remontent sous sa peau. L'eau en excès commence à peser, à perler, à s'épaissir autour de lui.",
			flavor:
				"Foudre & Eau ne cherche pas seulement à blesser : cette branche dérègle le souffle du combat. La foudre réveille le porteur, relance ses muscles, lui rend de l'élan. L'eau alourdit l'adversaire, s'infiltre dans ses appuis, rend chaque mouvement moins naturel. ÉLECTROCUTION recharge le corps ; NOYADE ÉLECTRIQUE vide celui d'en face. Le duel devient une circulation volée.",
			paliers: [
				{
					niv: 2,
					nom: 'Poing Foudre (4 EM) / Poing Aquatique (6 EM)',
					cout: '4 EM Foudre / 6 EM Eau — 1 action CAC',
					desc: 'Foudre : 6+Niv. Eau : 4+Niv (contondant). ÉLECTROCUTION : porteur regagne +10 EP. NOYADE ÉLECTRIQUE : cible perd -5 EP.'
				},
				{
					niv: 5,
					nom: 'Poing Foudre / Poing Aquatique',
					cout: '4 EM / 6 EM',
					desc: 'Foudre : 9+Niv. Eau : 6+Niv. ÉLECTROCUTION : +16 EP. NOYADE : -8 EP.'
				},
				{
					niv: 7,
					nom: 'Poing Foudre / Poing Aquatique',
					cout: '4 EM / 6 EM',
					desc: 'Foudre : 12+Niv. Eau : 8+Niv. ÉLECTROCUTION : +22 EP. NOYADE : -11 EP.'
				},
				{
					niv: 10,
					nom: 'Poing Foudre / Poing Aquatique',
					cout: '4 EM / 6 EM',
					desc: 'Foudre : 15+Niv. Eau : 10+Niv. ÉLECTROCUTION : +30 EP. NOYADE : -15 EP.'
				}
			]
		}
	),

	// ----- Evocateur — Basique, Magie, 🪄 (clé sans accent, main.js:423-442) -----
	builtin(
		'evocateur',
		'Evocateur',
		"Bâton du serment orné de runes et d'anneaux",
		{ pvN: 2, epN: 3, emN: 6 },
		4,
		'Contondant',
		{ icon: '🪄', category: 'magie' },
		"L'Évocateur n'est jamais complètement seul, même au milieu d'une pièce vide. Ce serment choisit les porteurs capables d'entendre une présence derrière le silence et de lui donner assez de forme pour qu'elle agisse. Il ne s'agit pas de dominer une créature comme un outil. Il s'agit de maintenir un pacte instable : appeler, nourrir, guider, puis assumer ce qui répond. Son bâton orné de runes et d'anneaux tinte parfois sans contact, comme si quelque chose testait déjà la solidité du lien. L'Évocateur ne porte pas toute sa puissance dans ses bras. Il la tient autour de lui, au bord du visible, prête à entrer en scène dès qu'il accepte d'en payer le prix.\n\nRÈGLES DES INVOCATIONS : Chaque invocation ne peut être appelée qu'une seule fois par combat. Si elle tombe, elle ne peut pas être réinvoquée. Les invocations agissent après leur porteur à chaque tour. Elles obéissent aux ordres gratuitement (sans action). En l'absence d'ordre, elles agissent de façon autonome. Elles ne peuvent pas surcadencer (2 actions max). Chaque action coûte de l'EM au porteur. Si le porteur n'a plus assez d'EM, l'invocation disparaît. Elles possèdent leurs propres PV — à 0, elles disparaissent définitivement.",
		{
			nom: 'Branche A — La Tortue Bipède',
			style: 'Tank',
			descPhys:
				"Elle émerge lentement, comme tirée d'un espace qui n'existe pas tout à fait. Sa carapace est dense, presque minérale, parcourue de lignes lumineuses qui pulsent au rythme de son porteur. Elle ne grogne pas. Elle se place. Et quand elle frappe, c'est avec la lenteur pesante de quelque chose qui n'a jamais eu besoin d'être rapide pour être dévastateur.",
			flavor:
				"La Tortue Bipède est une promesse de rempart. Elle ne brille pas par la vitesse, mais par cette certitude calme de se placer là où le danger arrive. En l'absence d'ordre, elle protège d'instinct son porteur. Elle frappe peu, mais chaque coup rappelle que même une défense peut avoir des poings.",
			paliers: [
				{
					niv: 2,
					nom: 'Tortue Bipède',
					cout: '10 EM invoc / 6 EM par action',
					desc: "PV : 8+Niv. Frappe CAC : 4+Niv (contondants). 2 actions/tour. S'interpose automatiquement."
				},
				{
					niv: 5,
					nom: 'Tortue Bipède',
					cout: '8 EM invoc / 5 EM par action',
					desc: 'PV : 14+Niv. Frappe : 5+Niv.'
				},
				{
					niv: 7,
					nom: 'Tortue Bipède',
					cout: '6 EM invoc / 4 EM par action',
					desc: 'PV : 20+Niv. Frappe : 6+Niv.'
				},
				{
					niv: 10,
					nom: 'Tortue Bipède',
					cout: '4 EM invoc / 3 EM par action',
					desc: 'PV : 28+Niv. Frappe : 7+Niv.'
				}
			]
		},
		{
			nom: 'Branche B — Le Crabe Canon',
			style: 'Distance',
			descPhys:
				"Il apparaît en claquant ses pinces — deux masses d'énergie condensée qui crépitent à chaque chargement. Son corps translucide laisse voir les flux d'énergie qui circulent en lui. Quand il tire, le recul le fait reculer d'un pas. Il n'a pas d'yeux à proprement parler — juste deux points lumineux fixés en permanence sur ce que son porteur veut abattre.",
			flavor:
				"Le Crabe Canon est une batterie nerveuse posée sur pattes. Fragile, bruyant, presque ridicule jusqu'au premier tir. Il n'a aucune noblesse de duel, aucune solution au corps à corps : toute son existence est un angle, une ligne, un recul violent après l'impact. En l'absence d'ordre, il vise la menace la plus proche du porteur et transforme la distance en pression constante.",
			paliers: [
				{
					niv: 2,
					nom: 'Crabe Canon',
					cout: '10 EM invoc / 6 EM par action',
					desc: 'PV : 4+Niv. Tir à distance : 5+Niv (contondants). 2 actions/tour. Ne peut pas frapper au CAC.'
				},
				{
					niv: 5,
					nom: 'Crabe Canon',
					cout: '8 EM invoc / 5 EM par action',
					desc: 'PV : 8+Niv. Tir : 6+Niv.'
				},
				{
					niv: 7,
					nom: 'Crabe Canon',
					cout: '6 EM invoc / 4 EM par action',
					desc: 'PV : 12+Niv. Tir : 7+Niv.'
				},
				{
					niv: 10,
					nom: 'Crabe Canon',
					cout: '4 EM invoc / 3 EM par action',
					desc: 'PV : 16+Niv. Tir : 8+Niv.'
				}
			]
		}
	),

	// ----- Conjurateur — Basique, Soutien, ⛓ (main.js:444-463) -----
	builtin(
		'conjurateur',
		'Conjurateur',
		'Chaîne du serment',
		{ pvN: 2, epN: 2, emN: 7 },
		6,
		'Contondant',
		{ icon: '⛓', category: 'soutien' },
		"Le Conjurateur est le serment des liens qui refusent de rompre. Il choisit les porteurs capables de sentir ce qui lâche chez les autres avant que la chute soit visible : une respiration trop courte, une posture qui tremble, une volonté qui se fend. Sa chaîne du serment est froide, lourde, presque brutale, mais elle ne sert pas seulement à frapper. Chaque maillon est un passage. La douleur peut y circuler, la force aussi, la vie parfois. Le Conjurateur combat rarement pour prendre la lumière. Il combat pour que les autres restent dans la scène assez longtemps pour gagner. Là où le champ de bataille disperse, il rattache. Là où les corps cèdent, il insiste.",
		{
			nom: 'Branche A — Frappe Déchaînée',
			style: 'Offensif',
			descPhys:
				"La chaîne siffle dans l'air et frappe avec une précision froide. Au moment de l'impact, un fil de lumière s'échappe du point de contact — invisible à l'œil non averti — et rejoint l'allié désigné. Ce n'est pas de la magie spectaculaire. C'est un transfert silencieux, presque médical.",
			flavor:
				"Frappe Déchaînée transforme l'offensive en circulation vitale. La chaîne blesse devant elle et rend ailleurs ce qu'elle vient d'arracher. Le Conjurateur ne choisit pas entre aider et frapper : il lie les deux gestes dans le même mouvement, comme si chaque impact ouvrait une veine de secours.",
			paliers: [
				{
					niv: 2,
					nom: 'Frappe Déchaînée',
					cout: '5 EM — 1 action',
					desc: 'Frappe : 4+Niv dégâts. Soin automatique : 4 PV sur un allié au choix (même tour, sans action supp.).'
				},
				{
					niv: 5,
					nom: 'Frappe Déchaînée',
					cout: '5 EM — 1 action',
					desc: '6+Niv dégâts. Soin : 6 PV.'
				},
				{
					niv: 7,
					nom: 'Frappe Déchaînée',
					cout: '5 EM — 1 action',
					desc: '8+Niv dégâts. Soin : 8 PV.'
				},
				{
					niv: 10,
					nom: 'Frappe Déchaînée',
					cout: '5 EM — 1 action',
					desc: '10+Niv dégâts. Soin : 10 PV.'
				}
			]
		},
		{
			nom: 'Branche B — Soin Enchaîné',
			style: 'Soin',
			descPhys:
				"Le Conjurateur s'immobilise. La chaîne cesse de siffler — elle pend, tendue, comme si elle retenait quelque chose d'invisible. Plus il attend, plus la lumière qui court le long des maillons s'intensifie. Quand il relâche, ce n'est pas un geste — c'est une libération. La lumière quitte la chaîne d'un coup et rejoint sa cible comme une vague. Ce qui était brisé se referme.",
			flavor:
				"Soin Enchaîné est le refus pur de laisser quelqu'un tomber. Le Conjurateur cesse presque de combattre pour tenir un seul lien à deux mains. Plus il sacrifie de temps, plus la chaîne accumule de lumière, jusqu'à relâcher une vague de réparation massive. Ce n'est pas rapide. C'est obstiné.",
			paliers: [
				{
					niv: 2,
					nom: 'Soin Enchaîné',
					cout: '12 EM — coûte toutes les actions restantes du tour',
					desc: '0 action sacrifiée : 10+Niv PV soignés. 1 action : 18+Niv. 2 actions : 28+Niv. Interdit en surcadençage.'
				},
				{
					niv: 5,
					nom: 'Soin Enchaîné',
					cout: '12 EM',
					desc: '0 action : 15+Niv. 1 action : 25+Niv. 2 actions : 38+Niv.'
				},
				{
					niv: 7,
					nom: 'Soin Enchaîné',
					cout: '12 EM',
					desc: '0 action : 20+Niv. 1 action : 32+Niv. 2 actions : 48+Niv.'
				},
				{
					niv: 10,
					nom: 'Soin Enchaîné',
					cout: '12 EM',
					desc: '0 action : 26+Niv. 1 action : 40+Niv. 2 actions : 60+Niv.'
				}
			]
		}
	),

	// ----- Arcaniste — Basique, Magie, 🔮 (main.js:465-484) -----
	builtin(
		'arcaniste',
		'Arcaniste',
		'Orbe du serment',
		{ pvN: 1, epN: 1, emN: 8 },
		4,
		'Contondant (coup de poing pour les non-magiques)',
		{ icon: '🔮', category: 'magie' },
		"L'Arcaniste voit les coutures. Là où les autres perçoivent un mur, un corps, une trajectoire, lui devine les fils qui tiennent tout cela ensemble et les tensions qui pourraient les défaire. Ce serment ne donne pas une magie spectaculaire par accident : il confie à son porteur le droit terrible de toucher à la structure même des choses. Son orbe renferme une lueur captive, calme en apparence, mais dense comme une étoile tenue sous verre. L'Arcaniste semble souvent absent parce qu'une partie de lui écoute le monde craquer à bas bruit. Quand il agit, le geste peut être presque délicat. Le résultat, lui, ne l'est jamais. Chez lui, la destruction n'est pas une perte de contrôle : c'est une correction appliquée à la réalité.",
		{
			nom: 'Branche A — Domaine Étoilé',
			style: 'AOE Indéfendable',
			descPhys:
				"L'orbe s'illumine d'un blanc froid. Autour du porteur, l'air se troue — de petites perles lumineuses apparaissent, suspendues, presque silencieuses. Elles ne bougent pas. Elles attendent. Puis elles explosent toutes en même temps, dans un souffle sec et aveuglant.",
			flavor:
				"Domaine Étoilé ne vise pas une personne : il condamne un espace. Les défenses classiques n'ont rien à attraper, rien à parer, rien à bloquer. Il reste seulement une question : sortir à temps ou subir l'effondrement lumineux. Alliés et ennemis y sont traités avec la même indifférence cosmique.",
			paliers: [
				{
					niv: 2,
					nom: 'Domaine Étoilé',
					cout: '8 EM — 1 action',
					desc: "Zone ciblée. Toutes entités dans la zone (alliées ET ennemies) : 14+Niv. INDÉFENDABLE — esquive, parade, blocage inefficaces. Seul le déplacement hors zone avant l'explosion permet d'échapper."
				},
				{
					niv: 5,
					nom: 'Domaine Étoilé',
					cout: '8 EM — 1 action',
					desc: '20+Niv. Indéfendable sauf déplacement.'
				},
				{
					niv: 7,
					nom: 'Domaine Étoilé',
					cout: '8 EM — 1 action',
					desc: '26+Niv. Indéfendable sauf déplacement.'
				},
				{
					niv: 10,
					nom: 'Domaine Étoilé',
					cout: '8 EM — 1 action',
					desc: '34+Niv. Indéfendable sauf déplacement.'
				}
			]
		},
		{
			nom: 'Branche B — Rayon Étoilé',
			style: 'Précision Défendable',
			descPhys:
				"L'orbe monte lentement, comme appelé. Au-dessus du porteur, une étoile prend forme — grande, presque tranquille, d'un blanc qui brûle les yeux sans prévenir. L'orbe s'aligne. Il n'y a pas d'hésitation. Le rayon part d'un seul coup, droit, absolu, comme si la distance entre le porteur et sa cible n'avait jamais existé. Ce qui est touché ne l'oublie pas.",
			flavor:
				"Rayon Étoilé est l'inverse du domaine : une seule ligne, une seule cible, une seule erreur possible. La puissance est monstrueuse, mais lisible. La cible peut tout tenter pour survivre. L'Arcaniste accepte ce risque parce qu'un rayon qui passe n'a plus besoin d'explication.",
			paliers: [
				{
					niv: 2,
					nom: 'Rayon Étoilé',
					cout: '10 EM — 1 action',
					desc: 'Rayon unique sur cible précise : 20+Niv. ENTIÈREMENT DÉFENDABLE — la cible peut esquiver, parer ou bloquer normalement. En contrepartie : dégâts les plus élevés du Serment.'
				},
				{
					niv: 5,
					nom: 'Rayon Étoilé',
					cout: '10 EM — 1 action',
					desc: '28+Niv. Entièrement défendable.'
				},
				{
					niv: 7,
					nom: 'Rayon Étoilé',
					cout: '10 EM — 1 action',
					desc: '36+Niv. Entièrement défendable.'
				},
				{
					niv: 10,
					nom: 'Rayon Étoilé',
					cout: '10 EM — 1 action',
					desc: '46+Niv. Entièrement défendable.'
				}
			]
		}
	)
];

/** Serments visibles dans la vitrine publique (`isSermVisibleInLibrary`, legacy main.js:6149-6152). */
export function visibleOaths(catalogue: readonly OathDefinition[] = BUILTIN_OATHS): OathDefinition[] {
	return catalogue.filter((o) => !o.hidden);
}

/**
 * Racine de lignée : remonte `evolvesFrom` jusqu'à 12 niveaux (`getSermFamilyRoot`, audit 02 §4.1).
 */
export function oathFamilyRoot(
	oath: OathDefinition,
	catalogue: readonly OathDefinition[] = BUILTIN_OATHS
): OathDefinition {
	let current = oath;
	for (let depth = 0; depth < 12 && current.evolvesFrom; depth += 1) {
		const parent = findOath(current.evolvesFrom, catalogue);
		if (!parent || parent.id === current.id) break;
		current = parent;
	}
	return current;
}
