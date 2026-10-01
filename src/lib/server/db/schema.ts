// Schéma relationnel de Nuages Polaires (Drizzle, Postgres ; même schéma en développement local).
// Ce module entre dans le bundle de production : il ne nomme jamais le pilote local (04 §10.2,
// scripts/check-bundle.ts).
// Spécification : docs/overhaul/04-architecture.md §3 (tables), §3.12 (tables de la vision « Carnet
// d'encre ») et §10 (amendements après la revue de GPT, qui PRIMENT : contraintes B4, révisions,
// champs hérités, registre de migration, compteurs d'apparitions).
// Formes héritées : docs/overhaul/audit/05-backend-donnees-permissions.md §3 et §15.
// Convention : `casing: 'snake_case'` (drizzle.config.ts et fabrique de connexion) — les propriétés
// camelCase ci-dessous deviennent des colonnes snake_case ; les noms explicites servent aux index et
// contraintes. Identifiants texte stables (04 §3 : nanoid 16 préfixé `a_`, `p_`, `b_`, `e_`, `c_`, `s_`,
// ou identifiants hérités conservés à la migration).
//
// Politiques ON DELETE (04 §10.4) — toutes explicites :
//   CASCADE  : sessions, account_theme_grants, character_items, character_history, event_participants,
//              combat_participants, scene_participants, scene_pins, beast_zones, beast_observations
//              (sur la créature), et les tables possédées par un personnage ou un compte
//              (journal_entries, declarations, validated_facts, reading_marks, publication_beasts,
//              spawn_counters).
//   SET NULL : liens d'auteur ou de contexte (events.created_by, combats.owner_account_id,
//              accounts.character_id, *.actor_account_id, beast_observations.author_account_id,
//              oaths.evolves_from, staff_log.archive_id, characters.struck_by,
//              events.announced_by, events.recit_combat_id, …).
//   RESTRICT : characters.oath_id, accounts.selected_theme, spawn_runs.zone_id.

import { relations, sql, type SQL } from 'drizzle-orm';
import {
	bigint,
	bigserial,
	boolean,
	check,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	varchar,
	type AnyPgColumn
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Types des blocs jsonb (04 §3 : jsonb uniquement pour les blocs libres listés)
// ---------------------------------------------------------------------------

/** Équipement d'un personnage : trois emplacements (audit 02 §7.4, 05 §3.2 : `{helmet, chest, legs}`). */
export type Equipment = {
	helmet: string | null;
	chest: string | null;
	legs: string | null;
};

/** Statut IRP posé sur une fiche (audit 02 §10 : `{ id, desc, posedBy, posedAt }`). */
export type CharacterStatus = {
	id: string;
	desc: string;
	posedBy: string;
	posedAt: number;
};

/** Palier d'une branche de Serment (audit 02 §4.1 : `{ niv, nom, cout, desc }`). */
export type OathTier = {
	niv: number;
	nom: string;
	cout: string;
	desc: string;
};

/** Branche de Serment (audit 02 §4.1 : `{ nom, style, descPhys, flavor, paliers[] }` ; custom : `{ nom, style, desc, paliers }`). */
export type OathBranch = {
	nom: string;
	style?: string;
	descPhys?: string;
	flavor?: string;
	desc?: string;
	paliers: OathTier[];
};

/**
 * Bloc `branches` d'un Serment (04 §3.3 : structure bA/bB conservée telle quelle, purement éditoriale).
 * `null` est accepté : c'est la forme de `OathDefinition` (`$lib/game/types`) pour une branche absente.
 */
export type OathBranches = {
	bA?: OathBranch | null;
	bB?: OathBranch | null;
	extraBranches?: OathBranch[];
};

/** Aperçu d'un thème (audit 07 §3.2 : `colors` = 3 ou 4 couleurs, `tone`, `tagline`). */
export type ThemePreview = {
	colors: string[];
	tone: 'dark' | 'light';
	tagline: string;
};

/**
 * Les huit tokens d'un thème (`--bureau`, `--page`, `--page-2`, `--reglure`, `--encre`, `--encre-2`,
 * `--encre-grise`, `--ruban` → hex), forme de `ThemeTokens` de `src/lib/ui/themes.ts` (décision INT-1 :
 * colonne `themes.tokens`, semée pour les thèmes natifs, écrite par `createTheme`).
 */
export type ThemeTokenMap = Record<string, string>;

/** Résultat d'un participant à la clôture d'un combat (04 §3.6 : PV finaux, récompenses appliquées). */
export type CombatOutcome = {
	pvCur: number;
	pvMax: number;
	epCur: number;
	emCur: number;
	xpGain: number;
	drops: string[];
	statuses?: CharacterStatus[];
};

/** Champs inconnus hérités conservés à la migration (04 §10.12). */
export type LegacyExtra = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** 04 §3.1 ; audit 05 §3.1 (`role` ∈ joueur | mj | designer | admin). */
export const accountRoleEnum = pgEnum('account_role', ['joueur', 'mj', 'designer', 'admin']);
/** 04 §3.1 (`scope` full | reset). */
export const sessionScopeEnum = pgEnum('session_scope', ['full', 'reset']);
/** 04 §3.1 (`kind` unlocked | blocked). */
export const themeGrantKindEnum = pgEnum('theme_grant_kind', ['unlocked', 'blocked']);
/** 04 §3.2 (`type` de l'historique, `scene` ajouté par la vision). */
export const historyTypeEnum = pgEnum('history_type', [
	'xp',
	'gemme',
	'item',
	'level',
	'stat',
	'serment',
	'combat',
	'add',
	'event',
	'scene'
]);
/** 04 §3.12 : champ touché par une conséquence (registre structuré, « la rature »). */
export const historyFieldEnum = pgEnum('history_field', [
	'pv',
	'ep',
	'em',
	'xp',
	'level',
	'item',
	'status',
	'oath',
	'branch',
	'equipment',
	'note'
]);
/** 04 §3.12 : rôle de l'auteur d'une conséquence (`regles` = calcul automatique). */
export const historyActorRoleEnum = pgEnum('history_actor_role', [
	'joueur',
	'mj',
	'designer',
	'admin',
	'regles'
]);
/** Rangs de Serment (audit 02 §4.2, `SERM_LEVELS` legacy main.js:6096-6104). */
export const oathRankEnum = pgEnum('oath_rank', [
	'basic',
	'seasoned',
	'emeritus',
	'singular',
	'transcended',
	'corrupted',
	'other'
]);
/** Catégories de combat (audit 02 §4.2, `SERM_CATS` legacy main.js:6091-6095). */
export const oathCategoryEnum = pgEnum('oath_category', ['melee', 'distance', 'magie', 'soutien']);
/** 04 §3.4 (`status` d'une observation de créature). */
export const observationStatusEnum = pgEnum('observation_status', [
	'proposed',
	'validated',
	'rejected'
]);
/** 04 §3.5 ; audit 05 §3.5 (`EV_TYPES` legacy main.js:15013-15019). */
export const eventTypeEnum = pgEnum('event_type', [
	'combat',
	'exploration',
	'social',
	'evenement',
	'autre'
]);
/** 04 §3.6 (`status` d'un combat). */
export const combatStatusEnum = pgEnum('combat_status', ['preparation', 'en_cours', 'termine']);
/** 04 §3.9 (`status` d'une scène). */
export const sceneStatusEnum = pgEnum('scene_status', ['ouverte', 'close']);
/** 04 §3.9 (`kind` d'une épingle de scène). */
export const scenePinKindEnum = pgEnum('scene_pin_kind', [
	'capacite',
	'regle',
	'objet',
	'creature'
]);
/** 04 §3.12 : ressource visée par une déclaration. */
export const declarationResourceEnum = pgEnum('declaration_resource', ['pv', 'ep', 'em']);
/** 04 §3.12 ; vision §12.4 (`non_reportee` = rature automatique après 7 jours). */
export const declarationStatusEnum = pgEnum('declaration_status', [
	'proposee',
	'annulee',
	'reportee',
	'rayee',
	'non_reportee'
]);
/** 04 §3.12 : nature d'un fait validé. */
export const factKindEnum = pgEnum('fact_kind', [
	'dette',
	'promesse',
	'alliance',
	'consequence',
	'observation'
]);
/** 04 §3.12 : cycle de vie d'un fait validé. */
export const factStatusEnum = pgEnum('fact_status', [
	'proposed',
	'validated',
	'settled',
	'rejected'
]);

// ---------------------------------------------------------------------------
// Colonnes et contraintes communes
// ---------------------------------------------------------------------------

// Horodatage (04 §3 : « `created_at` / `updated_at timestamptz` partout ») :
//   - toute table dont une ligne peut changer après insertion porte `created_at` ET `updated_at` ;
//   - `updated_at` est remis à l'heure par Drizzle à chaque `UPDATE` qui ne le fixe pas lui-même
//     (`$onUpdate`) ; une requête SQL brute doit le poser explicitement ;
//   - les horodatages métier (`ts`, `stamped_at`, `registered_at`…) restent distincts : ils portent
//     la date du fait (éventuellement héritée), `created_at` celle de l'écriture de la ligne ;
//   - seules les tables en ajout seul (journal d'audit, tirages, registre de migration, archives,
//     consommations de récupération, inscriptions) et les tables de liaison pures n'ont que leur
//     horodatage d'événement (liste dans docs/overhaul/05-fondation.md, écarts).
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
	timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date());
/** 04 §3 / §10.13 : `revision integer NOT NULL DEFAULT 1` sur chaque agrégat éditable (contrôle optimiste §6). */
const revision = () => integer('revision').notNull().default(1);
/** 04 §10.12 : champs inconnus hérités. */
const extra = () => jsonb('extra').$type<LegacyExtra>().notNull().default({});
/** 04 §10.4 : `revision >= 1`. */
const revisionCheck = (table: string, column: AnyPgColumn) =>
	check(`${table}_revision_check`, sql`${column} >= 1`);
/** Borne de longueur en caractères (le texte libre reste en `text`). */
const maxChars = (column: AnyPgColumn, max: number): SQL =>
	sql`char_length(${column}) <= ${sql.raw(String(max))}`;

// ---------------------------------------------------------------------------
// 3.8 Thèmes (déclarés d'abord : référencés par accounts)
// ---------------------------------------------------------------------------

export const themes = pgTable(
	'themes',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		cssClass: text('css_class').notNull().default(''),
		description: text('description').notNull().default(''),
		isEvent: boolean('is_event').notNull().default(false),
		/** `availableUntil = 0` legacy = sans limite → NULL (audit 07 §3.1). */
		availableUntil: timestamp('available_until', { withTimezone: true }),
		visible: boolean('visible').notNull().default(true),
		autoGrantAll: boolean('auto_grant_all').notNull().default(false),
		/** Rareté (audit 07 §3.2 : Base, Classique, Saisonnier, Rare, Premium, Fondateur, Mythique, Secret). */
		rarity: text('rarity').notNull().default('Base'),
		/** Catégorie (audit 07 §3.2 : Base, Classiques, Saisonniers, Rares, Fondateur, Secrets). */
		category: text('category').notNull().default('Base'),
		isBuiltin: boolean('is_builtin').notNull().default(false),
		preview: jsonb('preview').$type<ThemePreview>().notNull(),
		/** Les huit tokens du thème (INT-1) ; NULL ⇒ le domaine retombe sur le catalogue de l'interface. */
		tokens: jsonb('tokens').$type<ThemeTokenMap>(),
		revision: revision(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [index('themes_visible_idx').on(t.visible), revisionCheck('themes', t.revision)]
);

// ---------------------------------------------------------------------------
// 3.3 Serments (déclarés avant characters)
// ---------------------------------------------------------------------------

export const oaths = pgTable(
	'oaths',
	{
		/** Slug stable (04 §3.3). */
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		weapon: text('weapon').notNull().default(''),
		/**
		 * Les défauts de colonne sont ceux de la CRÉATION D'UN CUSTOM (audit 02 §4.4) : pvN 3, epN 5,
		 * emN 2, dmg 8, icône ✦, mêlée, rang `singular` (« Singulier »), `is_builtin = false`. Un natif
		 * est toujours inséré avec ses valeurs explicites (migration 0001, seedOaths) ; un Serment
		 * inconnu créé par la migration héritée a une croissance [0,0,0] (04 §10.5).
		 */
		pvGrowth: integer('pv_growth').notNull().default(3),
		epGrowth: integer('ep_growth').notNull().default(5),
		emGrowth: integer('em_growth').notNull().default(2),
		baseDamage: integer('base_damage').notNull().default(8),
		damageType: text('damage_type').notNull().default(''),
		/** Défaut `singular` : rang d'un custom sans rang (`getSermLevelKey`, audit 02 §4.4) ; `basic` ne vaut que pour un natif. */
		rank: oathRankEnum('rank').notNull().default('singular'),
		hidden: boolean('hidden').notNull().default(false),
		/** Lignée : FK vers le Serment parent, mise à null si le parent disparaît (04 §10.4). */
		evolvesFrom: text('evolves_from').references((): AnyPgColumn => oaths.id, {
			onDelete: 'set null'
		}),
		/** Icône par défaut ✦ (audit 02 §4.2, `WEAPON_ICONS`). */
		icon: text('icon').notNull().default('✦'),
		category: oathCategoryEnum('category').notNull().default('melee'),
		isBuiltin: boolean('is_builtin').notNull().default(false),
		lore: text('lore').notNull().default(''),
		branches: jsonb('branches').$type<OathBranches>().notNull().default({}),
		revision: revision(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('oaths_name_lower_uidx').on(sql`lower(${t.name})`),
		index('oaths_hidden_idx').on(t.hidden),
		index('oaths_evolves_from_idx').on(t.evolvesFrom),
		check(
			'oaths_growth_check',
			sql`${t.pvGrowth} >= 0 AND ${t.epGrowth} >= 0 AND ${t.emGrowth} >= 0`
		),
		check('oaths_base_damage_check', sql`${t.baseDamage} >= 0`),
		check(
			'oaths_no_self_evolution_check',
			sql`${t.evolvesFrom} IS NULL OR ${t.evolvesFrom} <> ${t.id}`
		),
		revisionCheck('oaths', t.revision)
	]
);

// ---------------------------------------------------------------------------
// 3.2 Personnages
// ---------------------------------------------------------------------------

export const characters = pgTable(
	'characters',
	{
		id: text('id').primaryKey(),
		/** ≤ 80 caractères (04 §3.2 ; audit 05 §3.2 normalisation `name ≤ 80`). */
		name: varchar('name', { length: 80 }).notNull(),
		/** RESTRICT : un Serment porté ne peut pas être supprimé (04 §10.4). */
		oathId: text('oath_id')
			.notNull()
			.references(() => oaths.id, { onDelete: 'restrict' }),
		/** `'Aucune'` par défaut (04 §3.2 ; audit 02 §1.3). */
		branch: text('branch').notNull().default('Aucune'),
		level: integer('level').notNull().default(1),
		xp: integer('xp').notNull().default(0),
		/** Base PV 30 / EP 50 / EM 20 (audit 02 §1.3, `addPlayer` legacy main.js:9468-9487 ; audit 05 §3.2). */
		pvCur: integer('pv_cur').notNull().default(30),
		pvMax: integer('pv_max').notNull().default(30),
		epCur: integer('ep_cur').notNull().default(50),
		epMax: integer('ep_max').notNull().default(50),
		emCur: integer('em_cur').notNull().default(20),
		emMax: integer('em_max').notNull().default(20),
		weapon: text('weapon').notNull().default(''),
		avatarUrl: text('avatar_url').notNull().default(''),
		/**
		 * Colonne de TRANSITION (04 §3.12) : remplacée par `journal_entries`, conservée le temps de la
		 * migration puis migrée en une première entrée « Avant le carnet ». ≤ 20 000 (borne Zod).
		 */
		journal: text('journal').notNull().default(''),
		/** `progressionVersion: 1` rend la migration v1 idempotente (audit 02 §3). */
		progressionVersion: integer('progression_version').notNull().default(1),
		equipment: jsonb('equipment')
			.$type<Equipment>()
			.notNull()
			.default({ helmet: null, chest: null, legs: null }),
		/** ≤ 64 statuts (04 §3.2), borne appliquée par Zod. */
		statuses: jsonb('statuses').$type<CharacterStatus[]>().notNull().default([]),
		/**
		 * Rature du personnage (03-vision §5.10, décision INT-1) : non nul ⇒ le personnage sort de toutes
		 * les pages ; seul l'export administrateur (`sheetForExport`) le lit encore. Rien n'est supprimé.
		 */
		struckAt: timestamp('struck_at', { withTimezone: true }),
		/** Administrateur qui a rayé (SET NULL : la rature survit au compte). */
		struckBy: text('struck_by').references((): AnyPgColumn => accounts.id, {
			onDelete: 'set null'
		}),
		struckMotif: text('struck_motif'),
		extra: extra(),
		revision: revision(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('characters_name_idx').on(t.name),
		index('characters_struck_at_idx').on(t.struckAt),
		index('characters_oath_id_idx').on(t.oathId),
		/** 04 §10.4 : `level >= 1`, `xp >= 0`, `*_cur >= 0`, `*_max >= 1`. */
		check('characters_level_check', sql`${t.level} >= 1`),
		check('characters_xp_check', sql`${t.xp} >= 0`),
		check(
			'characters_resources_cur_check',
			sql`${t.pvCur} >= 0 AND ${t.epCur} >= 0 AND ${t.emCur} >= 0`
		),
		check(
			'characters_resources_max_check',
			sql`${t.pvMax} >= 1 AND ${t.epMax} >= 1 AND ${t.emMax} >= 1`
		),
		revisionCheck('characters', t.revision)
	]
);

export const characterItems = pgTable(
	'character_items',
	{
		/** Identifiant technique global (04 §10.3). */
		id: text('id').primaryKey(),
		characterId: text('character_id')
			.notNull()
			.references(() => characters.id, { onDelete: 'cascade' }),
		/**
		 * Identifiant de l'objet dans l'ancien site (04 §10.3) : unique PAR personnage seulement.
		 * Toute consommation cherche l'objet dans le personnage de la session, jamais par id global seul.
		 */
		legacyId: text('legacy_id'),
		name: text('name').notNull(),
		/** Catégories legacy : Équipement, Consommable, Gemme, Divers (audit 02 §17). */
		category: text('category').notNull(),
		qty: integer('qty').notNull().default(1),
		description: text('description').notNull().default(''),
		/** Champs inconnus hérités conservés (04 §3.2). */
		extra: extra(),
		position: integer('position').notNull().default(0),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('character_items_character_id_idx').on(t.characterId, t.position),
		uniqueIndex('character_items_character_legacy_uidx').on(t.characterId, t.legacyId),
		/** `qty >= 0` (04 §10.4). */
		check('character_items_qty_check', sql`${t.qty} >= 0`)
	]
);

// ---------------------------------------------------------------------------
// 3.1 Comptes et sessions
// ---------------------------------------------------------------------------

export const accounts = pgTable(
	'accounts',
	{
		id: text('id').primaryKey(),
		/** Regex legacy `^[A-Za-z0-9_\-À-ÿ ]{2,32}$` (audit 05 §3.1), appliquée par Zod ; unicité insensible à la casse ci-dessous. */
		pseudo: varchar('pseudo', { length: 32 }).notNull(),
		/** `scrypt$N$r$p$<sel>$<clé>` ; formats hérités `pbkdf2:…`, `sha256:…`, hex nu conservés jusqu'à la première connexion (04 §3.1). */
		passwordHash: text('password_hash').notNull(),
		role: accountRoleEnum('role').notNull().default('joueur'),
		/** Un personnage n'a qu'un compte (04 §3.1 : FK nullable, unique ; SET NULL §10.4). */
		characterId: text('character_id')
			.unique('accounts_character_id_unique')
			.references(() => characters.id, { onDelete: 'set null' }),
		/** Défaut 0 pour les comptes historiques (audit 05 §3.1). */
		sessionVersion: integer('session_version').notNull().default(0),
		forcePasswordReset: boolean('force_password_reset').notNull().default(false),
		resetExpiresAt: timestamp('reset_expires_at', { withTimezone: true }),
		/** Empreinte scrypt du mot de passe temporaire (04 §4, §10.8), effacée à la finalisation. */
		resetSecretHash: text('reset_secret_hash'),
		/** `dark` toujours accordé (04 §3.8), donc défaut sûr ; RESTRICT (04 §10.4). */
		selectedTheme: text('selected_theme')
			.notNull()
			.default('dark')
			.references(() => themes.id, { onDelete: 'restrict' }),
		discordId: text('discord_id').unique('accounts_discord_id_unique'),
		discordUsername: text('discord_username'),
		/** `last_seen_at` n'incrémente jamais la révision (04 §10.13). */
		lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
		extra: extra(),
		revision: revision(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		/** Unicité insensible à la casse (04 §3.1, §10.4 ; audit 05 §3.1 `auth.js:641, 739`). */
		uniqueIndex('accounts_pseudo_lower_uidx').on(sql`lower(${t.pseudo})`),
		index('accounts_role_idx').on(t.role),
		check('accounts_session_version_check', sql`${t.sessionVersion} >= 0`),
		revisionCheck('accounts', t.revision)
	]
);

/**
 * Sessions (04 §3.1, §10.8). Valide si non expirée, si `session_version` = celle du compte, et si
 * `scope = full` (sauf actions de réinitialisation). Pour `scope = reset`,
 * `expires_at = min(reset_expires_at, now + 1 h)` est calculé par le domaine.
 */
export const sessions = pgTable(
	'sessions',
	{
		/** Empreinte HMAC-SHA-256 du jeton opaque (04 §3.1) : le jeton lui-même n'est jamais stocké. */
		id: text('id').primaryKey(),
		accountId: text('account_id')
			.notNull()
			.references(() => accounts.id, { onDelete: 'cascade' }),
		scope: sessionScopeEnum('scope').notNull().default('full'),
		/** Copie de `accounts.session_version` à la création (04 §3.1). */
		sessionVersion: integer('session_version').notNull(),
		createdAt: createdAt(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
		userAgent: text('user_agent').notNull().default(''),
		ip: text('ip').notNull().default(''),
		updatedAt: updatedAt()
	},
	(t) => [
		index('sessions_account_id_idx').on(t.accountId),
		index('sessions_expires_at_idx').on(t.expiresAt),
		check('sessions_expiry_check', sql`${t.expiresAt} > ${t.createdAt}`),
		check('sessions_session_version_check', sql`${t.sessionVersion} >= 0`)
	]
);

export const accountThemeGrants = pgTable(
	'account_theme_grants',
	{
		accountId: text('account_id')
			.notNull()
			.references(() => accounts.id, { onDelete: 'cascade' }),
		themeId: text('theme_id')
			.notNull()
			.references(() => themes.id, { onDelete: 'cascade' }),
		kind: themeGrantKindEnum('kind').notNull(),
		grantedBy: text('granted_by').references(() => accounts.id, { onDelete: 'set null' }),
		createdAt: createdAt()
	},
	(t) => [
		primaryKey({ name: 'account_theme_grants_pk', columns: [t.accountId, t.themeId, t.kind] })
	]
);

/** 10 tentatives / 15 minutes, scopes `ip`, `login`, `register` (04 §3.1). */
export const authRateLimits = pgTable(
	'auth_rate_limits',
	{
		scope: text('scope').notNull(),
		subject: text('subject').notNull(),
		count: integer('count').notNull().default(0),
		windowStart: timestamp('window_start', { withTimezone: true }).notNull().defaultNow(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		primaryKey({ name: 'auth_rate_limits_pk', columns: [t.scope, t.subject] }),
		check('auth_rate_limits_count_check', sql`${t.count} >= 0`)
	]
);

export const adminRecoveryConsumptions = pgTable('admin_recovery_consumptions', {
	fingerprint: text('fingerprint').primaryKey(),
	pseudo: text('pseudo').notNull(),
	consumedAt: timestamp('consumed_at', { withTimezone: true }).notNull().defaultNow()
});

/** Signet de lecture par compte (04 §3.12 ; vision §6.2 « le ruban, la corne et le marque-page »). */
export const readingMarks = pgTable('reading_marks', {
	accountId: text('account_id')
		.primaryKey()
		.references(() => accounts.id, { onDelete: 'cascade' }),
	/** Tout ce qui est écrit après porte une corne. */
	lastReadAt: timestamp('last_read_at', { withTimezone: true }).notNull().defaultNow(),
	bookmarkText: text('bookmark_text').notNull().default(''),
	bookmarkUrl: text('bookmark_url').notNull().default(''),
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

// ---------------------------------------------------------------------------
// 3.4 Bestiaire et zones
// ---------------------------------------------------------------------------

export const zones = pgTable(
	'zones',
	{
		/** Slug (04 §3.4). */
		id: text('id').primaryKey(),
		/** Libellé exact (nom de salon Discord, audit 03 §10.2) : la migration résout `beasts.zones` hérité par ce libellé. */
		name: text('name').notNull(),
		emoji: text('emoji').notNull().default(''),
		isDefault: boolean('is_default').notNull().default(false),
		position: integer('position').notNull().default(0),
		revision: revision(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('zones_name_uidx').on(t.name),
		index('zones_position_idx').on(t.position),
		revisionCheck('zones', t.revision)
	]
);

export const beasts = pgTable(
	'beasts',
	{
		id: text('id').primaryKey(),
		/** ≤ 80 (audit 05 §3.3). */
		name: varchar('name', { length: 80 }).notNull(),
		subtitle: text('subtitle').notNull().default(''),
		/** Défaut `Neutre` (audit 04 §1, alias `beh`). */
		behavior: text('behavior').notNull().default('Neutre'),
		level: integer('level').notNull().default(1),
		/** `pv ≥ 1` défaut 20, `ep ≥ 0` défaut 20 (audit 04 §1). */
		pv: integer('pv').notNull().default(20),
		ep: integer('ep').notNull().default(20),
		strike: text('strike').notNull().default(''),
		skill: text('skill').notNull().default(''),
		drops: text('drops').notNull().default(''),
		gem: text('gem').notNull().default(''),
		description: text('description').notNull().default(''),
		imageUrl: text('image_url').notNull().default(''),
		style: text('style').notNull().default(''),
		quote: text('quote').notNull().default(''),
		hidden: boolean('hidden').notNull().default(false),
		archived: boolean('archived').notNull().default(false),
		/** `qtyMin 1, qtyMax 3, spawnWeight 1` (audit 05 §3.3, fixture canonique). */
		qtyMin: integer('qty_min').notNull().default(1),
		qtyMax: integer('qty_max').notNull().default(3),
		spawnWeight: integer('spawn_weight').notNull().default(1),
		tags: text('tags').array().notNull().default([]),
		/* Les zones ne sont plus un text[] : voir `beast_zones` (04 §10.4). */
		statuses: jsonb('statuses').$type<unknown[]>().notNull().default([]),
		/** Jamais servi hors staff (04 §3.4). */
		adminNote: text('admin_note').notNull().default(''),
		extra: extra(),
		revision: revision(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('beasts_name_idx').on(t.name),
		index('beasts_visibility_idx').on(t.hidden, t.archived),
		check('beasts_level_check', sql`${t.level} >= 1`),
		check('beasts_pv_ep_check', sql`${t.pv} >= 1 AND ${t.ep} >= 0`),
		/** 04 §10.4 : `spawn_weight >= 0` (0 = jamais tirée), `qty_min >= 1`, `qty_max >= qty_min`. */
		check('beasts_spawn_weight_check', sql`${t.spawnWeight} >= 0`),
		check('beasts_qty_check', sql`${t.qtyMin} >= 1 AND ${t.qtyMax} >= ${t.qtyMin}`),
		revisionCheck('beasts', t.revision)
	]
);

/** Zones où une créature peut apparaître (04 §10.4 : remplace `beasts.zones text[]`). */
export const beastZones = pgTable(
	'beast_zones',
	{
		beastId: text('beast_id')
			.notNull()
			.references(() => beasts.id, { onDelete: 'cascade' }),
		zoneId: text('zone_id')
			.notNull()
			.references(() => zones.id, { onDelete: 'cascade' })
	},
	(t) => [
		primaryKey({ name: 'beast_zones_pk', columns: [t.beastId, t.zoneId] }),
		index('beast_zones_zone_id_idx').on(t.zoneId)
	]
);

// ---------------------------------------------------------------------------
// 3.5 Événements (rendez-vous)
// ---------------------------------------------------------------------------

export const events = pgTable(
	'events',
	{
		id: text('id').primaryKey(),
		title: text('title').notNull(),
		type: eventTypeEnum('type').notNull().default('autre'),
		description: text('description').notNull().default(''),
		startsAt: timestamp('starts_at', { withTimezone: true }),
		/** 0 = illimité (04 §3.5 ; audit 05 §3.5 `max ≥ 0`). */
		capacity: integer('capacity').notNull().default(0),
		hidden: boolean('hidden').notNull().default(false),
		/** « Lien du salon » (vision §6). */
		discordUrl: text('discord_url').notNull().default(''),
		createdBy: text('created_by').references(() => accounts.id, { onDelete: 'set null' }),
		/** Auteur textuel hérité ou conservé après suppression du compte (04 §10.12). */
		createdByLabel: text('created_by_label').notNull().default(''),
		/**
		 * « Prévenir les joueurs » (03-vision §5.6, décision INT-1) : instant de la dernière annonce ; la
		 * corne est calculée par `reading.ts` chez chaque compte relié. NULL = jamais annoncé.
		 */
		announcedAt: timestamp('announced_at', { withTimezone: true }),
		announcedBy: text('announced_by').references(() => accounts.id, { onDelete: 'set null' }),
		/** Récit (combat archivé) rattaché au rendez-vous (« Lire le récit », décision INT-1). */
		recitCombatId: text('recit_combat_id').references((): AnyPgColumn => combats.id, {
			onDelete: 'set null'
		}),
		extra: extra(),
		revision: revision(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('events_starts_at_idx').on(t.startsAt),
		index('events_announced_at_idx').on(t.announcedAt),
		index('events_hidden_idx').on(t.hidden),
		check('events_capacity_check', sql`${t.capacity} >= 0`),
		revisionCheck('events', t.revision)
	]
);

export const eventParticipants = pgTable(
	'event_participants',
	{
		eventId: text('event_id')
			.notNull()
			.references(() => events.id, { onDelete: 'cascade' }),
		characterId: text('character_id')
			.notNull()
			.references(() => characters.id, { onDelete: 'cascade' }),
		registeredAt: timestamp('registered_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		primaryKey({ name: 'event_participants_pk', columns: [t.eventId, t.characterId] }),
		index('event_participants_character_id_idx').on(t.characterId)
	]
);

// ---------------------------------------------------------------------------
// 3.6 Combats (simulateur, Table, archives) et 3.9 Scènes — références croisées
// ---------------------------------------------------------------------------

export const combats = pgTable(
	'combats',
	{
		id: text('id').primaryKey(),
		/** Nullable pour les archives orphelines ou ambiguës, `owner_label` conservé (04 §3.6, §10.10). */
		ownerAccountId: text('owner_account_id').references(() => accounts.id, {
			onDelete: 'set null'
		}),
		ownerLabel: text('owner_label').notNull().default(''),
		name: text('name').notNull().default(''),
		label: text('label').notNull().default(''),
		status: combatStatusEnum('status').notNull().default('preparation'),
		round: integer('round').notNull().default(1),
		/** `phase` legacy (`idle`, … ; audit 05 §3.10). */
		phase: text('phase').notNull().default('idle'),
		/** Format défini par `lib/game/combat` (fighters, order, log, notes, decl, pendingDrops…). */
		state: jsonb('state').$type<Record<string, unknown>>().notNull().default({}),
		savedAt: timestamp('saved_at', { withTimezone: true }),
		manualSaved: boolean('manual_saved').notNull().default(false),
		autosaveAt: timestamp('autosave_at', { withTimezone: true }),
		autosaveReason: text('autosave_reason').notNull().default(''),
		/** La Table (04 §3.6). */
		visibleToParticipants: boolean('visible_to_participants').notNull().default(false),
		/** Lien du salon Discord saisi sur la Table (04 §3.12). */
		discordUrl: text('discord_url').notNull().default(''),
		/** « Montrer les chiffres des adversaires » (04 §3.12) ; sinon état narratif LÉGER/GRAVE/CRITIQUE. */
		showEnemyNumbers: boolean('show_enemy_numbers').notNull().default(false),
		/** Scène ouverte automatiquement pour les participants (04 §3.12, vision §12.3). */
		sceneId: text('scene_id').references((): AnyPgColumn => scenes.id, { onDelete: 'set null' }),
		/** Extrait publié à l'archivage (04 §3.12). */
		publishedExtractId: text('published_extract_id').references(
			(): AnyPgColumn => publications.id,
			{ onDelete: 'set null' }
		),
		/** Clé d'idempotence de clôture : non nul ⇒ refus d'une seconde clôture (04 §10.6). */
		closedAt: timestamp('closed_at', { withTimezone: true }),
		revision: revision(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('combats_owner_saved_at_idx').on(t.ownerAccountId, t.savedAt),
		index('combats_status_idx').on(t.status),
		check('combats_round_check', sql`${t.round} >= 1`),
		/** Un combat clos est forcément terminé. */
		check('combats_closed_status_check', sql`${t.closedAt} IS NULL OR ${t.status} = 'termine'`),
		revisionCheck('combats', t.revision)
	]
);

export const combatParticipants = pgTable(
	'combat_participants',
	{
		combatId: text('combat_id')
			.notNull()
			.references(() => combats.id, { onDelete: 'cascade' }),
		characterId: text('character_id')
			.notNull()
			.references(() => characters.id, { onDelete: 'cascade' }),
		outcome: jsonb('outcome').$type<CombatOutcome>(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		primaryKey({ name: 'combat_participants_pk', columns: [t.combatId, t.characterId] }),
		index('combat_participants_character_id_idx').on(t.characterId)
	]
);

export const scenes = pgTable(
	'scenes',
	{
		id: text('id').primaryKey(),
		title: text('title').notNull(),
		discordUrl: text('discord_url').notNull().default(''),
		status: sceneStatusEnum('status').notNull().default('ouverte'),
		/** « Où nous en sommes », facultatif (04 §3.9). */
		summary: text('summary').notNull().default(''),
		openQuestion: text('open_question').notNull().default(''),
		createdBy: text('created_by').references(() => accounts.id, { onDelete: 'set null' }),
		/** Table qui a ouvert la scène (04 §3.12). */
		combatId: text('combat_id').references((): AnyPgColumn => combats.id, {
			onDelete: 'set null'
		}),
		/** Fermeture automatique après 14 jours d'inactivité (04 §3.12, vision §12.3). */
		lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull().defaultNow(),
		autoClosed: boolean('auto_closed').notNull().default(false),
		closedAt: timestamp('closed_at', { withTimezone: true }),
		revision: revision(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('scenes_status_activity_idx').on(t.status, t.lastActivityAt),
		index('scenes_combat_id_idx').on(t.combatId),
		revisionCheck('scenes', t.revision)
	]
);

export const sceneParticipants = pgTable(
	'scene_participants',
	{
		sceneId: text('scene_id')
			.notNull()
			.references(() => scenes.id, { onDelete: 'cascade' }),
		characterId: text('character_id')
			.notNull()
			.references(() => characters.id, { onDelete: 'cascade' }),
		/** Phrase de reprise personnelle (04 §3.9). */
		bookmarkText: text('bookmark_text').notNull().default(''),
		bookmarkUrl: text('bookmark_url').notNull().default(''),
		pinned: boolean('pinned').notNull().default(false),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		primaryKey({ name: 'scene_participants_pk', columns: [t.sceneId, t.characterId] }),
		index('scene_participants_character_id_idx').on(t.characterId)
	]
);

export const scenePins = pgTable(
	'scene_pins',
	{
		id: text('id').primaryKey(),
		sceneId: text('scene_id')
			.notNull()
			.references(() => scenes.id, { onDelete: 'cascade' }),
		characterId: text('character_id')
			.notNull()
			.references(() => characters.id, { onDelete: 'cascade' }),
		kind: scenePinKindEnum('kind').notNull(),
		/** Identifiant de la capacité, règle, objet ou créature épinglé (04 §3.9). */
		ref: text('ref').notNull(),
		note: text('note').notNull().default(''),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [index('scene_pins_scene_character_idx').on(t.sceneId, t.characterId)]
);

// ---------------------------------------------------------------------------
// 3.12 Publications (« Les Dernières pages publiques ») et observations
// ---------------------------------------------------------------------------

export const publications = pgTable(
	'publications',
	{
		id: text('id').primaryKey(),
		combatId: text('combat_id').references((): AnyPgColumn => combats.id, {
			onDelete: 'set null'
		}),
		/** 2 à 4 lignes (borne Zod) ; jamais vide. */
		text: text('text').notNull(),
		onHome: boolean('on_home').notNull().default(false),
		stampedBy: text('stamped_by').references(() => accounts.id, { onDelete: 'set null' }),
		stampedAt: timestamp('stamped_at', { withTimezone: true }).notNull().defaultNow(),
		struck: boolean('struck').notNull().default(false),
		struckAt: timestamp('struck_at', { withTimezone: true }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('publications_home_idx').on(t.onHome, t.stampedAt),
		index('publications_combat_id_idx').on(t.combatId),
		check('publications_text_check', sql`char_length(${t.text}) >= 1`)
	]
);

export const publicationBeasts = pgTable(
	'publication_beasts',
	{
		publicationId: text('publication_id')
			.notNull()
			.references(() => publications.id, { onDelete: 'cascade' }),
		beastId: text('beast_id')
			.notNull()
			.references(() => beasts.id, { onDelete: 'cascade' })
	},
	(t) => [
		primaryKey({ name: 'publication_beasts_pk', columns: [t.publicationId, t.beastId] }),
		index('publication_beasts_beast_id_idx').on(t.beastId)
	]
);

export const beastObservations = pgTable(
	'beast_observations',
	{
		id: text('id').primaryKey(),
		beastId: text('beast_id')
			.notNull()
			.references(() => beasts.id, { onDelete: 'cascade' }),
		text: text('text').notNull(),
		authorAccountId: text('author_account_id').references(() => accounts.id, {
			onDelete: 'set null'
		}),
		status: observationStatusEnum('status').notNull().default('proposed'),
		validatedBy: text('validated_by').references(() => accounts.id, { onDelete: 'set null' }),
		validatedAt: timestamp('validated_at', { withTimezone: true }),
		combatId: text('combat_id').references(() => combats.id, { onDelete: 'set null' }),
		/** Observation déposée par une publication ciblant la créature (04 §3.12). */
		publicationId: text('publication_id').references(() => publications.id, {
			onDelete: 'set null'
		}),
		/** Motif du tampon de validation ou du refus (décision INT-1). */
		motif: text('motif').notNull().default(''),
		revision: revision(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('beast_observations_beast_status_idx').on(t.beastId, t.status),
		revisionCheck('beast_observations', t.revision)
	]
);

// ---------------------------------------------------------------------------
// 3.12 Carnet : déclarations, historique structuré, journal, faits validés
// ---------------------------------------------------------------------------

/** « Kael déclare −8 EP (Esquive). » — ne modifie jamais les ressources (04 §3.12, vision §6.6). */
export const declarations = pgTable(
	'declarations',
	{
		id: text('id').primaryKey(),
		characterId: text('character_id')
			.notNull()
			.references(() => characters.id, { onDelete: 'cascade' }),
		sceneId: text('scene_id').references(() => scenes.id, { onDelete: 'set null' }),
		combatId: text('combat_id').references(() => combats.id, { onDelete: 'set null' }),
		resource: declarationResourceEnum('resource').notNull(),
		/** Entier signé. */
		delta: integer('delta').notNull(),
		/** Libellé exact : « Esquive », « subis », « soigné de », capacité… */
		word: text('word').notNull().default(''),
		status: declarationStatusEnum('status').notNull().default('proposee'),
		createdAt: createdAt(),
		/**
		 * Fenêtre d'annulation : `cancel_until = created_at + 10 s` (04 §3.12), garanti par une colonne
		 * GÉNÉRÉE (ni insérable ni modifiable) : une ligne datée explicitement (migration, test,
		 * antidatage) a toujours sa fenêtre calée sur SA création. `timestamptz + interval` n'est pas
		 * IMMUTABLE (fuseau de session) : le calcul passe par l'heure UTC, ce qui est exact pour un
		 * intervalle en secondes.
		 */
		cancelUntil: timestamp('cancel_until', { withTimezone: true })
			.notNull()
			.generatedAlwaysAs(
				sql`((created_at AT TIME ZONE 'UTC') + interval '10 seconds') AT TIME ZONE 'UTC'`
			),
		reportedBy: text('reported_by').references(() => accounts.id, { onDelete: 'set null' }),
		reportedAt: timestamp('reported_at', { withTimezone: true }),
		motif: text('motif').notNull().default(''),
		updatedAt: updatedAt()
	},
	(t) => [
		index('declarations_character_created_idx').on(t.characterId, t.createdAt),
		index('declarations_status_idx').on(t.status, t.createdAt),
		index('declarations_scene_id_idx').on(t.sceneId),
		index('declarations_combat_id_idx').on(t.combatId)
	]
);

/**
 * Historique d'un personnage = registre structuré des conséquences (04 §3.2, §3.12). Un **tampon** est
 * une entrée `actor_role ∈ {mj, admin}` avec `motif` non vide ; une **rature** est une nouvelle entrée
 * avec `old_value` = ancienne valeur et `replaces_id` vers l'entrée raturée.
 */
export const characterHistory = pgTable(
	'character_history',
	{
		id: bigserial('id', { mode: 'number' }).primaryKey(),
		characterId: text('character_id')
			.notNull()
			.references(() => characters.id, { onDelete: 'cascade' }),
		ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
		type: historyTypeEnum('type').notNull(),
		/** Texte BRUT, échappé au rendu (04 §3.2, §10.15). */
		text: text('text').notNull(),
		/** `by` legacy : « Système », « MJ <nom> », « <perso> (joueur) » (audit 02 §8). */
		actorName: text('actor_name').notNull().default(''),
		actorAccountId: text('actor_account_id').references(() => accounts.id, {
			onDelete: 'set null'
		}),
		actorRole: historyActorRoleEnum('actor_role'),
		combatId: text('combat_id').references(() => combats.id, { onDelete: 'set null' }),
		/** Remplace `notifDeleted` (04 §3.2). */
		dismissed: boolean('dismissed').notNull().default(false),
		field: historyFieldEnum('field'),
		oldValue: text('old_value'),
		newValue: text('new_value'),
		motif: text('motif').notNull().default(''),
		declarationId: text('declaration_id').references(() => declarations.id, {
			onDelete: 'set null'
		}),
		replacesId: bigint('replaces_id', { mode: 'number' }).references(
			(): AnyPgColumn => characterHistory.id,
			{ onDelete: 'set null' }
		),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		/** 04 §10.4 : `(character_id, ts, id)` — pagination stable de l'historique complet. */
		index('character_history_character_ts_idx').on(t.characterId, t.ts, t.id),
		index('character_history_combat_id_idx').on(t.combatId),
		index('character_history_declaration_id_idx').on(t.declarationId)
	]
);

/** Journal en trois voix (04 §3.12, vision §5.5) : remplace `characters.journal`. */
export const journalEntries = pgTable(
	'journal_entries',
	{
		id: text('id').primaryKey(),
		characterId: text('character_id')
			.notNull()
			.references(() => characters.id, { onDelete: 'cascade' }),
		ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
		/** ≤ 20 000 caractères. */
		text: text('text').notNull(),
		/** « Notée en scène ». */
		inScene: boolean('in_scene').notNull().default(false),
		/** La rature : l'entrée précédente reste lisible. */
		replacesId: text('replaces_id').references((): AnyPgColumn => journalEntries.id, {
			onDelete: 'set null'
		}),
		struck: boolean('struck').notNull().default(false),
		struckAt: timestamp('struck_at', { withTimezone: true }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('journal_entries_character_ts_idx').on(t.characterId, t.ts),
		check('journal_entries_text_check', maxChars(t.text, 20000))
	]
);

/** Faits validés : dettes, promesses, alliances, conséquences, observations (04 §3.12). */
export const validatedFacts = pgTable(
	'validated_facts',
	{
		id: text('id').primaryKey(),
		characterId: text('character_id')
			.notNull()
			.references(() => characters.id, { onDelete: 'cascade' }),
		kind: factKindEnum('kind').notNull(),
		/** Texte libre : « envers Aria ». */
		counterpart: text('counterpart').notNull().default(''),
		text: text('text').notNull(),
		status: factStatusEnum('status').notNull().default('proposed'),
		witness: text('witness').notNull().default(''),
		proposedBy: text('proposed_by').references(() => accounts.id, { onDelete: 'set null' }),
		validatedBy: text('validated_by').references(() => accounts.id, { onDelete: 'set null' }),
		validatedAt: timestamp('validated_at', { withTimezone: true }),
		settledAt: timestamp('settled_at', { withTimezone: true }),
		motif: text('motif').notNull().default(''),
		revision: revision(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('validated_facts_character_status_idx').on(t.characterId, t.status),
		revisionCheck('validated_facts', t.revision)
	]
);

// ---------------------------------------------------------------------------
// 3.7 Apparitions
// ---------------------------------------------------------------------------

export const spawnRuns = pgTable(
	'spawn_runs',
	{
		id: text('id').primaryKey(),
		generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
		actorAccountId: text('actor_account_id').references(() => accounts.id, {
			onDelete: 'set null'
		}),
		/** RESTRICT (04 §10.4) : une zone ayant servi à un tirage ne disparaît pas silencieusement. */
		zoneId: text('zone_id').references(() => zones.id, { onDelete: 'restrict' }),
		/** Groupes tirés (`packs` legacy, audit 03 §10.1). */
		payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
		beastIds: text('beast_ids').array().notNull().default([])
	},
	(t) => [
		index('spawn_runs_generated_at_idx').on(t.generatedAt),
		index('spawn_runs_zone_id_idx').on(t.zoneId)
	]
);

/** Cumuls hérités par créature (04 §10.10) : total affiché = cumul migré + tirages en base. */
export const spawnCounters = pgTable(
	'spawn_counters',
	{
		beastId: text('beast_id')
			.primaryKey()
			.references(() => beasts.id, { onDelete: 'cascade' }),
		migratedDraws: integer('migrated_draws').notNull().default(0),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [check('spawn_counters_migrated_draws_check', sql`${t.migratedDraws} >= 0`)]
);

/**
 * Ligne unique (`id = 1`) : cumul global hérité des tirages (04 §10.10). La ligne EXISTE toujours :
 * elle est créée (cumul 0) par la migration de données `0001_referentiels` ; la migration héritée la
 * met à jour. Total affiché = `migrated_total_draws` + tirages de `spawn_runs`.
 */
export const spawnSettings = pgTable(
	'spawn_settings',
	{
		id: integer('id').primaryKey().default(1),
		migratedTotalDraws: integer('migrated_total_draws').notNull().default(0),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		check('spawn_settings_singleton_check', sql`${t.id} = 1`),
		check('spawn_settings_migrated_total_draws_check', sql`${t.migratedTotalDraws} >= 0`)
	]
);

// ---------------------------------------------------------------------------
// 3.10 Journaux, réglages, registre de migration
// ---------------------------------------------------------------------------

/** Archives du journal staff (04 §10.12). */
export const staffLogArchives = pgTable(
	'staff_log_archives',
	{
		id: text('id').primaryKey(),
		archivedAt: timestamp('archived_at', { withTimezone: true }).notNull().defaultNow(),
		label: text('label').notNull().default(''),
		/** Nom de fichier de l'archive héritée, s'il y en avait un. */
		filename: text('filename').notNull().default('')
	},
	(t) => [index('staff_log_archives_archived_at_idx').on(t.archivedAt)]
);

export const staffLog = pgTable(
	'staff_log',
	{
		id: bigserial('id', { mode: 'number' }).primaryKey(),
		ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
		/** Actions legacy : connexion, liaison, deliaison, compte_supprime, mdp_reset, history_delete, event_* (audit 05 §3.9). */
		action: text('action').notNull(),
		detail: text('detail').notNull().default(''),
		actorAccountId: text('actor_account_id').references(() => accounts.id, {
			onDelete: 'set null'
		}),
		actorName: text('actor_name').notNull().default(''),
		target: text('target').notNull().default(''),
		/** Archive d'appartenance ; NULL = journal courant (04 §10.12 remplace `archived_at`). */
		archiveId: text('archive_id').references(() => staffLogArchives.id, { onDelete: 'set null' }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('staff_log_ts_idx').on(t.ts),
		index('staff_log_archive_id_idx').on(t.archiveId, t.ts)
	]
);

export const auditLog = pgTable(
	'audit_log',
	{
		id: bigserial('id', { mode: 'number' }).primaryKey(),
		ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
		/** `auth` / `db` legacy (audit 05 §15), puis noms de modules de domaine. */
		source: text('source').notNull(),
		action: text('action').notNull(),
		actorAccountId: text('actor_account_id').references(() => accounts.id, {
			onDelete: 'set null'
		}),
		actorPseudo: text('actor_pseudo').notNull().default(''),
		actorRole: text('actor_role').notNull().default(''),
		ip: text('ip').notNull().default(''),
		origin: text('origin').notNull().default(''),
		userAgent: text('user_agent').notNull().default(''),
		details: jsonb('details').$type<Record<string, unknown>>().notNull().default({})
	},
	(t) => [index('audit_log_ts_idx').on(t.ts), index('audit_log_actor_idx').on(t.actorAccountId)]
);

/** Réglages saisis par un administrateur (04 §3.12, vision §12.6). */
export const settings = pgTable('settings', {
	key: text('key').primaryKey(),
	value: text('value').notNull().default(''),
	updatedBy: text('updated_by').references(() => accounts.id, { onDelete: 'set null' }),
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

/**
 * Idempotence de la migration héritée (04 §3.10, §7, §10.10) : clé unique
 * `(source_key, source_id, transformer_version)` ; écriture cible et registre dans la même transaction.
 */
export const migrationRegistry = pgTable(
	'migration_registry',
	{
		sourceKey: text('source_key').notNull(),
		sourceId: text('source_id').notNull(),
		/** Version du transformateur qui a produit la cible (une nouvelle version re-migre proprement). */
		transformerVersion: integer('transformer_version').notNull().default(1),
		targetTable: text('target_table').notNull(),
		targetId: text('target_id').notNull(),
		checksum: text('checksum').notNull(),
		anomalies: jsonb('anomalies').$type<import('../legacy/report').MigrationAnomaly[]>().notNull().default([]),
		migratedAt: timestamp('migrated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		primaryKey({
			name: 'migration_registry_pk',
			columns: [t.sourceKey, t.sourceId, t.transformerVersion]
		}),
		index('migration_registry_target_idx').on(t.targetTable, t.targetId),
		check('migration_registry_transformer_version_check', sql`${t.transformerVersion} >= 1`)
	]
);

// ---------------------------------------------------------------------------
// Relations (API relationnelle Drizzle `db.query.*`)
// ---------------------------------------------------------------------------

export const themesRelations = relations(themes, ({ many }) => ({
	grants: many(accountThemeGrants),
	accounts: many(accounts)
}));

export const oathsRelations = relations(oaths, ({ one, many }) => ({
	parent: one(oaths, {
		fields: [oaths.evolvesFrom],
		references: [oaths.id],
		relationName: 'oath_lineage'
	}),
	evolutions: many(oaths, { relationName: 'oath_lineage' }),
	characters: many(characters)
}));

export const charactersRelations = relations(characters, ({ one, many }) => ({
	oath: one(oaths, { fields: [characters.oathId], references: [oaths.id] }),
	account: one(accounts, { fields: [characters.id], references: [accounts.characterId] }),
	items: many(characterItems),
	history: many(characterHistory),
	journalEntries: many(journalEntries),
	declarations: many(declarations),
	facts: many(validatedFacts),
	eventParticipations: many(eventParticipants),
	combatParticipations: many(combatParticipants),
	sceneParticipations: many(sceneParticipants),
	scenePins: many(scenePins)
}));

export const characterItemsRelations = relations(characterItems, ({ one }) => ({
	character: one(characters, { fields: [characterItems.characterId], references: [characters.id] })
}));

export const characterHistoryRelations = relations(characterHistory, ({ one }) => ({
	character: one(characters, {
		fields: [characterHistory.characterId],
		references: [characters.id]
	}),
	actor: one(accounts, { fields: [characterHistory.actorAccountId], references: [accounts.id] }),
	combat: one(combats, { fields: [characterHistory.combatId], references: [combats.id] }),
	declaration: one(declarations, {
		fields: [characterHistory.declarationId],
		references: [declarations.id]
	}),
	replaces: one(characterHistory, {
		fields: [characterHistory.replacesId],
		references: [characterHistory.id],
		relationName: 'history_rature'
	})
}));

export const journalEntriesRelations = relations(journalEntries, ({ one }) => ({
	character: one(characters, { fields: [journalEntries.characterId], references: [characters.id] }),
	replaces: one(journalEntries, {
		fields: [journalEntries.replacesId],
		references: [journalEntries.id],
		relationName: 'journal_rature'
	})
}));

export const declarationsRelations = relations(declarations, ({ one, many }) => ({
	character: one(characters, { fields: [declarations.characterId], references: [characters.id] }),
	scene: one(scenes, { fields: [declarations.sceneId], references: [scenes.id] }),
	combat: one(combats, { fields: [declarations.combatId], references: [combats.id] }),
	reporter: one(accounts, { fields: [declarations.reportedBy], references: [accounts.id] }),
	history: many(characterHistory)
}));

export const validatedFactsRelations = relations(validatedFacts, ({ one }) => ({
	character: one(characters, { fields: [validatedFacts.characterId], references: [characters.id] }),
	proposer: one(accounts, { fields: [validatedFacts.proposedBy], references: [accounts.id] }),
	validator: one(accounts, { fields: [validatedFacts.validatedBy], references: [accounts.id] })
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
	character: one(characters, { fields: [accounts.characterId], references: [characters.id] }),
	theme: one(themes, { fields: [accounts.selectedTheme], references: [themes.id] }),
	readingMark: one(readingMarks, { fields: [accounts.id], references: [readingMarks.accountId] }),
	sessions: many(sessions),
	themeGrants: many(accountThemeGrants, { relationName: 'grant_target' }),
	combats: many(combats)
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	account: one(accounts, { fields: [sessions.accountId], references: [accounts.id] })
}));

export const readingMarksRelations = relations(readingMarks, ({ one }) => ({
	account: one(accounts, { fields: [readingMarks.accountId], references: [accounts.id] })
}));

export const accountThemeGrantsRelations = relations(accountThemeGrants, ({ one }) => ({
	account: one(accounts, {
		fields: [accountThemeGrants.accountId],
		references: [accounts.id],
		relationName: 'grant_target'
	}),
	theme: one(themes, { fields: [accountThemeGrants.themeId], references: [themes.id] }),
	grantedByAccount: one(accounts, {
		fields: [accountThemeGrants.grantedBy],
		references: [accounts.id],
		relationName: 'grant_author'
	})
}));

export const zonesRelations = relations(zones, ({ many }) => ({
	spawnRuns: many(spawnRuns),
	beastZones: many(beastZones)
}));

export const beastsRelations = relations(beasts, ({ one, many }) => ({
	observations: many(beastObservations),
	zones: many(beastZones),
	publications: many(publicationBeasts),
	spawnCounter: one(spawnCounters, { fields: [beasts.id], references: [spawnCounters.beastId] })
}));

export const beastZonesRelations = relations(beastZones, ({ one }) => ({
	beast: one(beasts, { fields: [beastZones.beastId], references: [beasts.id] }),
	zone: one(zones, { fields: [beastZones.zoneId], references: [zones.id] })
}));

export const beastObservationsRelations = relations(beastObservations, ({ one }) => ({
	beast: one(beasts, { fields: [beastObservations.beastId], references: [beasts.id] }),
	author: one(accounts, { fields: [beastObservations.authorAccountId], references: [accounts.id] }),
	validator: one(accounts, { fields: [beastObservations.validatedBy], references: [accounts.id] }),
	combat: one(combats, { fields: [beastObservations.combatId], references: [combats.id] }),
	publication: one(publications, {
		fields: [beastObservations.publicationId],
		references: [publications.id]
	})
}));

export const spawnCountersRelations = relations(spawnCounters, ({ one }) => ({
	beast: one(beasts, { fields: [spawnCounters.beastId], references: [beasts.id] })
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
	creator: one(accounts, { fields: [events.createdBy], references: [accounts.id] }),
	participants: many(eventParticipants)
}));

export const eventParticipantsRelations = relations(eventParticipants, ({ one }) => ({
	event: one(events, { fields: [eventParticipants.eventId], references: [events.id] }),
	character: one(characters, {
		fields: [eventParticipants.characterId],
		references: [characters.id]
	})
}));

export const combatsRelations = relations(combats, ({ one, many }) => ({
	owner: one(accounts, { fields: [combats.ownerAccountId], references: [accounts.id] }),
	scene: one(scenes, {
		fields: [combats.sceneId],
		references: [scenes.id],
		relationName: 'combat_scene'
	}),
	publishedExtract: one(publications, {
		fields: [combats.publishedExtractId],
		references: [publications.id],
		relationName: 'combat_published_extract'
	}),
	participants: many(combatParticipants),
	history: many(characterHistory),
	declarations: many(declarations),
	publications: many(publications, { relationName: 'publication_combat' })
}));

export const combatParticipantsRelations = relations(combatParticipants, ({ one }) => ({
	combat: one(combats, { fields: [combatParticipants.combatId], references: [combats.id] }),
	character: one(characters, {
		fields: [combatParticipants.characterId],
		references: [characters.id]
	})
}));

export const spawnRunsRelations = relations(spawnRuns, ({ one }) => ({
	actor: one(accounts, { fields: [spawnRuns.actorAccountId], references: [accounts.id] }),
	zone: one(zones, { fields: [spawnRuns.zoneId], references: [zones.id] })
}));

export const scenesRelations = relations(scenes, ({ one, many }) => ({
	creator: one(accounts, { fields: [scenes.createdBy], references: [accounts.id] }),
	combat: one(combats, {
		fields: [scenes.combatId],
		references: [combats.id],
		relationName: 'scene_combat'
	}),
	participants: many(sceneParticipants),
	pins: many(scenePins),
	declarations: many(declarations)
}));

export const sceneParticipantsRelations = relations(sceneParticipants, ({ one }) => ({
	scene: one(scenes, { fields: [sceneParticipants.sceneId], references: [scenes.id] }),
	character: one(characters, {
		fields: [sceneParticipants.characterId],
		references: [characters.id]
	})
}));

export const scenePinsRelations = relations(scenePins, ({ one }) => ({
	scene: one(scenes, { fields: [scenePins.sceneId], references: [scenes.id] }),
	character: one(characters, { fields: [scenePins.characterId], references: [characters.id] })
}));

export const publicationsRelations = relations(publications, ({ one, many }) => ({
	combat: one(combats, {
		fields: [publications.combatId],
		references: [combats.id],
		relationName: 'publication_combat'
	}),
	stamper: one(accounts, { fields: [publications.stampedBy], references: [accounts.id] }),
	beasts: many(publicationBeasts),
	observations: many(beastObservations)
}));

export const publicationBeastsRelations = relations(publicationBeasts, ({ one }) => ({
	publication: one(publications, {
		fields: [publicationBeasts.publicationId],
		references: [publications.id]
	}),
	beast: one(beasts, { fields: [publicationBeasts.beastId], references: [beasts.id] })
}));

export const staffLogArchivesRelations = relations(staffLogArchives, ({ many }) => ({
	entries: many(staffLog)
}));

export const staffLogRelations = relations(staffLog, ({ one }) => ({
	actor: one(accounts, { fields: [staffLog.actorAccountId], references: [accounts.id] }),
	archive: one(staffLogArchives, {
		fields: [staffLog.archiveId],
		references: [staffLogArchives.id]
	})
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
	actor: one(accounts, { fields: [auditLog.actorAccountId], references: [accounts.id] })
}));

export const settingsRelations = relations(settings, ({ one }) => ({
	updater: one(accounts, { fields: [settings.updatedBy], references: [accounts.id] })
}));

// ---------------------------------------------------------------------------
// Types inférés (lignes lues / à insérer)
// ---------------------------------------------------------------------------

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type AccountThemeGrant = typeof accountThemeGrants.$inferSelect;
export type AuthRateLimit = typeof authRateLimits.$inferSelect;
export type AdminRecoveryConsumption = typeof adminRecoveryConsumptions.$inferSelect;
export type ReadingMark = typeof readingMarks.$inferSelect;
export type NewReadingMark = typeof readingMarks.$inferInsert;
export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
export type CharacterItem = typeof characterItems.$inferSelect;
export type NewCharacterItem = typeof characterItems.$inferInsert;
export type CharacterHistoryEntry = typeof characterHistory.$inferSelect;
export type NewCharacterHistoryEntry = typeof characterHistory.$inferInsert;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;
export type Declaration = typeof declarations.$inferSelect;
export type NewDeclaration = typeof declarations.$inferInsert;
export type ValidatedFact = typeof validatedFacts.$inferSelect;
export type NewValidatedFact = typeof validatedFacts.$inferInsert;
export type Oath = typeof oaths.$inferSelect;
export type NewOath = typeof oaths.$inferInsert;
export type Beast = typeof beasts.$inferSelect;
export type NewBeast = typeof beasts.$inferInsert;
export type BeastZone = typeof beastZones.$inferSelect;
export type Zone = typeof zones.$inferSelect;
export type NewZone = typeof zones.$inferInsert;
export type BeastObservation = typeof beastObservations.$inferSelect;
export type NewBeastObservation = typeof beastObservations.$inferInsert;
export type Publication = typeof publications.$inferSelect;
export type NewPublication = typeof publications.$inferInsert;
export type PublicationBeast = typeof publicationBeasts.$inferSelect;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type EventParticipant = typeof eventParticipants.$inferSelect;
export type Combat = typeof combats.$inferSelect;
export type NewCombat = typeof combats.$inferInsert;
export type CombatParticipant = typeof combatParticipants.$inferSelect;
export type SpawnRun = typeof spawnRuns.$inferSelect;
export type SpawnCounter = typeof spawnCounters.$inferSelect;
export type SpawnSettings = typeof spawnSettings.$inferSelect;
export type Theme = typeof themes.$inferSelect;
export type NewTheme = typeof themes.$inferInsert;
export type Scene = typeof scenes.$inferSelect;
export type NewScene = typeof scenes.$inferInsert;
export type SceneParticipant = typeof sceneParticipants.$inferSelect;
export type ScenePin = typeof scenePins.$inferSelect;
export type StaffLogEntry = typeof staffLog.$inferSelect;
export type StaffLogArchive = typeof staffLogArchives.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type MigrationRegistryEntry = typeof migrationRegistry.$inferSelect;
export type NewMigrationRegistryEntry = typeof migrationRegistry.$inferInsert;

export type AccountRole = (typeof accountRoleEnum.enumValues)[number];
export type SessionScope = (typeof sessionScopeEnum.enumValues)[number];
export type HistoryType = (typeof historyTypeEnum.enumValues)[number];
export type HistoryField = (typeof historyFieldEnum.enumValues)[number];
export type HistoryActorRole = (typeof historyActorRoleEnum.enumValues)[number];
export type OathRank = (typeof oathRankEnum.enumValues)[number];
export type OathCategory = (typeof oathCategoryEnum.enumValues)[number];
export type EventType = (typeof eventTypeEnum.enumValues)[number];
export type CombatStatus = (typeof combatStatusEnum.enumValues)[number];
export type SceneStatus = (typeof sceneStatusEnum.enumValues)[number];
export type ScenePinKind = (typeof scenePinKindEnum.enumValues)[number];
export type ObservationStatus = (typeof observationStatusEnum.enumValues)[number];
export type DeclarationResource = (typeof declarationResourceEnum.enumValues)[number];
export type DeclarationStatus = (typeof declarationStatusEnum.enumValues)[number];
export type FactKind = (typeof factKindEnum.enumValues)[number];
export type FactStatus = (typeof factStatusEnum.enumValues)[number];
