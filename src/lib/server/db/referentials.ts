// Référentiels (04-architecture §3.3, §3.4, §3.8, §3.12, §10.10) : données et rendu SQL.
//
// Ces lignes doivent exister dès que les migrations DDL ont tourné, quel que soit le lanceur
// (`drizzle-kit migrate`, `npx tsx src/lib/server/db/migrate.ts`, base locale de développement) :
// `accounts.selected_theme` vaut `dark` par défaut avec une FK RESTRICT vers `themes`, et
// `characters.oath_id` exige un Serment. Elles sont donc écrites par la migration de DONNÉES
// `drizzle/0001_referentiels.sql`, rendue par buildReferentialsSql() à partir de ce module et du
// catalogue natif (`BUILTIN_OATHS`), via `npx tsx src/lib/server/db/generate-referentials.ts`.
// seedDatabase() (seed.ts) réécrit les mêmes lignes par Drizzle ; un test vérifie que les deux
// chemins produisent les mêmes données et que le fichier SQL est à jour.
//
// Module PUR (aucune E/S, aucun import du paquet jeu, aucun jeu de démonstration) : le code applicatif
// importe d'ici les identifiants de thèmes, alias et clés de réglages sans tirer seed.ts dans le bundle.
// Les huit tokens des thèmes natifs viennent du catalogue de l'interface (`THEMES` de
// src/lib/ui/themes.ts, données pures) : décision INT-1, colonne `themes.tokens`.

import { getTableColumns, getTableName, type Table } from 'drizzle-orm';
// Import relatif (et non `$lib`) : ce module est aussi exécuté par tsx hors de Vite.
import { THEMES } from '../../ui/themes';
import {
	oaths,
	settings,
	spawnSettings,
	themes,
	zones,
	type NewOath,
	type NewTheme,
	type NewZone,
	type OathBranches
} from './schema';

// ---------------------------------------------------------------------------
// Thèmes — audit 07 §3.2 (ordre d'affichage `ORDER`, theme-max.js:148) ; noms, descriptions et
// couleurs = `CONFIG` de theme-max.js (« gagne à l'affichage ») ; dates `availableUntil` =
// THEMES_EVENT_BUILTIN (main.js:935-940) ; rareté/catégorie = theme-max.js. Le drapeau `isEvent` est celui qui S'AFFICHE : theme-max.js le
// réécrit en `rarity === 'Saisonnier'` (audit 07 §3.1), ce qui l'emporte sur THEMES_EVENT_BUILTIN.
// `availableUntil 0` legacy = sans limite → null. Aucun thème n'a de prix (audit 07 §0).
// ---------------------------------------------------------------------------

const THEME_BASE: readonly Omit<NewTheme, 'tokens'>[] = [
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
		// Le catalogue déclare `event:true`, mais theme-max.js réécrit au démarrage
		// `event = (rarity === 'Saisonnier')` et c'est cette valeur qui s'affiche (audit 07 §3.1) :
		// BloodMoon (Fondateur) n'est donc PAS un événement. Il ne s'obtient que par don admin
		// (§3.2) ; non possédé, sa carte affiche « Indisponible », jamais « À débloquer » (§3.3).
		isEvent: false,
		availableUntil: null, // `availableUntil 0` hérité = sans limite
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

/** Tokens d'un thème natif dans le catalogue de l'interface ; `null` s'il n'y figure pas. */
function nativeTokens(id: string): Record<string, string> | null {
	const found = THEMES.find((t) => t.id === id);
	return found ? { ...found.tokens } : null;
}

/** Les neuf thèmes natifs, avec leurs huit tokens (colonne `themes.tokens`, décision INT-1). */
export const THEME_SEED: readonly NewTheme[] = THEME_BASE.map((t) => ({
	...t,
	tokens: nativeTokens(t.id)
}));

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
// exact est conservé dans `name` : la migration résout par ce libellé les zones héritées d'une
// créature (`beasts.zones` de l'ancien site) en lignes `beast_zones`.
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
// Réglages (04 §3.12, vision §12.6) : clés connues, valeurs vides saisies ensuite par un admin.
// ---------------------------------------------------------------------------

export const SETTING_KEYS = {
	/** Lien d'invitation Discord du colophon. */
	discordInviteUrl: 'discord_invite_url',
	/** Salon Discord proposé par défaut (lien). */
	discordDefaultChannelUrl: 'discord_default_channel_url',
	/** Texte de contact affiché dans « Le site et vos données ». */
	contactText: 'contact_text'
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

/** Lignes de réglages semées : chaque clé connue, valeur vide. */
export const SETTING_SEED: readonly (typeof settings.$inferInsert)[] = Object.values(
	SETTING_KEYS
).map((key) => ({ key, value: '' }));

// ---------------------------------------------------------------------------
// Compteur global des apparitions (04 §10.10) : ligne unique `id = 1`, cumul migré 0 ; la migration
// héritée y écrit `migrated_total_draws`. Total affiché = cumul migré + tirages de `spawn_runs`.
// ---------------------------------------------------------------------------

export const SPAWN_SETTINGS_ID = 1;

export const SPAWN_SETTINGS_SEED: readonly (typeof spawnSettings.$inferInsert)[] = [
	{ id: SPAWN_SETTINGS_ID, migratedTotalDraws: 0 }
];

// ---------------------------------------------------------------------------
// Serments natifs (04 §3.3) : les définitions viennent du paquet jeu (`BUILTIN_OATHS`), passées par
// l'appelant pour ne pas coupler ce module au paquet jeu.
// ---------------------------------------------------------------------------

/**
 * Forme minimale attendue d'une définition de Serment : sous-ensemble structurel de
 * `OathDefinition` (`$lib/game/types`), si bien que `BUILTIN_OATHS` se passe tel quel. `evolvesFrom`
 * est l'identifiant OU le nom du parent (le catalogue natif donne le nom, ex. « Duelliste ») ; il est
 * résolu en identifiant pour la FK.
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
	branches: OathBranches;
	isBuiltin?: boolean;
};

const fold = (s: string): string => s.trim().toLowerCase();

/**
 * Lignes `oaths` à insérer pour un catalogue, dans un ordre où chaque parent précède ses évolutions
 * (FK `evolves_from`). `evolvesFrom` est résolu par identifiant ou nom, dans le catalogue puis parmi
 * `existing` (Serments déjà en base) ; introuvable ou auto-référence ⇒ `NULL`. `is_builtin` vaut
 * `true` sauf mention contraire. Toutes les colonnes sont explicites (aucun défaut de custom).
 */
export function oathRowsFor(
	definitions: readonly OathSeedDefinition[],
	existing: readonly { id: string; name: string }[] = []
): NewOath[] {
	const idByKey = new Map<string, string>();
	for (const o of existing) {
		idByKey.set(fold(o.id), o.id);
		idByKey.set(fold(o.name), o.id);
	}
	for (const d of definitions) {
		idByKey.set(fold(d.name), d.id);
		idByKey.set(fold(d.id), d.id);
	}
	const byId = new Map(definitions.map((d) => [d.id, d]));
	const parentIdOf = (d: OathSeedDefinition): string | null => {
		if (!d.evolvesFrom) return null;
		const id = idByKey.get(fold(d.evolvesFrom)) ?? null;
		return id === d.id ? null : id;
	};

	// Ordre topologique : racines d'abord ; `getSermFamilyRoot` remonte au plus 12 niveaux (audit 02 §4.1).
	const ordered: OathSeedDefinition[] = [];
	const seen = new Set<string>();
	const visit = (d: OathSeedDefinition, depth = 0): void => {
		if (seen.has(d.id) || depth > 12) return;
		const parentId = parentIdOf(d);
		const parent = parentId ? byId.get(parentId) : undefined;
		if (parent) visit(parent, depth + 1);
		seen.add(d.id);
		ordered.push(d);
	};
	for (const d of definitions) visit(d);

	return ordered.map((d) => ({
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
		evolvesFrom: parentIdOf(d),
		icon: d.icon,
		category: d.category,
		isBuiltin: d.isBuiltin ?? true,
		lore: d.lore,
		branches: d.branches
	}));
}

// ---------------------------------------------------------------------------
// Rendu SQL de la migration de données `0001_referentiels`
// ---------------------------------------------------------------------------

/** Nom du fichier de la migration de données, dans `drizzle/`. */
export const REFERENTIALS_MIGRATION_FILE = '0001_referentiels.sql';

/** Séparateur d'instructions du migrateur Drizzle (une instruction par requête). */
const BREAKPOINT = '--> statement-breakpoint';

/** Littéral SQL d'une valeur déjà convertie pour le pilote (chaîne, nombre, booléen, null). */
function sqlLiteral(value: unknown): string {
	if (value === null || value === undefined) return 'NULL';
	if (typeof value === 'boolean') return value ? 'true' : 'false';
	if (typeof value === 'number') {
		if (!Number.isFinite(value)) throw new Error(`Valeur numérique non finie : ${value}`);
		return String(value);
	}
	// Chaîne standard (standard_conforming_strings = on, défaut Postgres) : seule la quote se double.
	// Un littéral non typé est converti vers le type de la colonne (jsonb, timestamptz, enum…).
	if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
	throw new Error(`Valeur non convertible en littéral SQL : ${typeof value}`);
}

const quoteIdent = (name: string): string => `"${name.replace(/"/g, '""')}"`;
const toSnakeCase = (key: string): string => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/**
 * `INSERT … ON CONFLICT DO NOTHING` multi-lignes. Les colonnes et la conversion des valeurs viennent
 * du schéma Drizzle (`mapToDriverValue` : jsonb → JSON, timestamptz → ISO 8601) : le SQL rendu est
 * celui qu'écrirait Drizzle. Colonne absente d'une ligne ⇒ `DEFAULT`.
 */
export function renderInsert(table: Table, rows: readonly Record<string, unknown>[]): string {
	if (rows.length === 0) throw new Error('renderInsert : aucune ligne.');
	const columns = Object.entries(getTableColumns(table)).filter(([key]) =>
		rows.some((r) => r[key] !== undefined)
	);
	const names = columns.map(([key, col]) =>
		quoteIdent(col.keyAsName ? toSnakeCase(key) : col.name)
	);
	const tableName = getTableName(table);
	const values = rows.map((row) => {
		const cells = columns.map(([key, col]) => {
			const v = row[key];
			if (v === undefined) return 'DEFAULT';
			return sqlLiteral(v === null ? null : col.mapToDriverValue(v));
		});
		return `\t(${cells.join(', ')})`;
	});
	return [
		`INSERT INTO ${quoteIdent(tableName)} (${names.join(', ')}) VALUES`,
		values.join(',\n'),
		'ON CONFLICT DO NOTHING;'
	].join('\n');
}

/**
 * Contenu exact de `drizzle/0001_referentiels.sql` pour un catalogue de Serments donné. Rendu
 * déterministe (même entrée ⇒ même texte), fins de ligne `\n`.
 */
export function buildReferentialsSql(oathDefinitions: readonly OathSeedDefinition[]): string {
	const header = [
		'-- Migration de DONNÉES 0001 — référentiels (04-architecture §3.3, §3.8, §3.12, §10.10).',
		'-- GÉNÉRÉE : npx tsx src/lib/server/db/generate-referentials.ts — ne pas éditer à la main.',
		'-- Sources : src/lib/server/db/referentials.ts (thèmes, zones, réglages, compteur global) et',
		'-- BUILTIN_OATHS de src/lib/game/oaths.ts (Serments natifs, parents avant évolutions).',
		'-- ON CONFLICT DO NOTHING : une ligne déjà présente n’est jamais écrasée.'
	].join('\n');
	// Les tokens ne figurent pas dans 0001 : la colonne `themes.tokens` naît en 0002 ; ils sont
	// écrits par la migration de données 0003 (buildThemeTokensSql).
	const themeRows = THEME_SEED.map(({ tokens: _tokens, ...row }) => {
		void _tokens;
		return row;
	});
	const statements = [
		renderInsert(themes, themeRows as readonly Record<string, unknown>[]),
		renderInsert(zones, ZONE_SEED as readonly Record<string, unknown>[]),
		renderInsert(settings, SETTING_SEED as readonly Record<string, unknown>[]),
		renderInsert(spawnSettings, SPAWN_SETTINGS_SEED as readonly Record<string, unknown>[]),
		...(oathDefinitions.length > 0
			? [renderInsert(oaths, oathRowsFor(oathDefinitions) as Record<string, unknown>[])]
			: [])
	];
	return `${header}\n${statements.join(`\n${BREAKPOINT}\n`)}\n`;
}

// ---------------------------------------------------------------------------
// Migration de données `0003_theme_tokens` (décision INT-1)
// ---------------------------------------------------------------------------

/** Nom du fichier de la migration de données des tokens de thèmes, dans `drizzle/`. */
export const THEME_TOKENS_MIGRATION_FILE = '0003_theme_tokens.sql';

/**
 * Contenu exact de `drizzle/0003_theme_tokens.sql` : les huit tokens de chaque thème natif (colonne
 * `themes.tokens`, créée par 0002), sans jamais écraser un thème déjà renseigné ; puis la reprise des
 * marques que les domaines rangeaient dans `extra` avant INT-1 (`characters.extra.struckAt`,
 * `events.extra.announcedAt`, `events.extra.recitId`) vers leurs colonnes, pour une base de
 * développement déjà remplie. Rendu déterministe, fins de ligne `\n`.
 */
export function buildThemeTokensSql(): string {
	const header = [
		'-- Migration de DONNÉES 0003 — tokens des thèmes natifs et reprise des marques `extra` (décision INT-1).',
		'-- GÉNÉRÉE : npx tsx src/lib/server/db/generate-referentials.ts — ne pas éditer à la main.',
		'-- Source : THEMES de src/lib/ui/themes.ts (via THEME_SEED de referentials.ts).',
		'-- Une ligne déjà renseignée (tokens non nuls, colonne déjà posée) n’est jamais écrasée.'
	].join('\n');
	const tokenStatements = THEME_SEED.filter((t) => t.tokens).map(
		(t) =>
			`UPDATE ${quoteIdent(getTableName(themes))} SET "tokens" = ${sqlLiteral(JSON.stringify(t.tokens))} WHERE "id" = ${sqlLiteral(t.id)} AND "tokens" IS NULL;`
	);
	const iso = `'^\\d{4}-\\d{2}-\\d{2}T'`;
	const backfill = [
		`UPDATE "characters" SET "struck_at" = ("extra" ->> 'struckAt')::timestamptz, "struck_motif" = "extra" ->> 'struckMotif', "extra" = "extra" - 'struckAt' - 'struckBy' - 'struckMotif' WHERE "struck_at" IS NULL AND ("extra" ->> 'struckAt') ~ ${iso};`,
		`UPDATE "events" SET "announced_at" = ("extra" ->> 'announcedAt')::timestamptz, "extra" = "extra" - 'announcedAt' - 'announcedBy' WHERE "announced_at" IS NULL AND ("extra" ->> 'announcedAt') ~ ${iso};`,
		`UPDATE "events" SET "recit_combat_id" = "extra" ->> 'recitId', "extra" = "extra" - 'recitId' WHERE "recit_combat_id" IS NULL AND EXISTS (SELECT 1 FROM "combats" WHERE "combats"."id" = "events"."extra" ->> 'recitId');`
	];
	return `${header}\n${[...tokenStatements, ...backfill].join(`\n${BREAKPOINT}\n`)}\n`;
}
