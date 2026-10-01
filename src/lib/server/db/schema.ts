// Schéma relationnel de Nuages Polaires (Drizzle, Postgres / PGlite).
// Spécification : docs/overhaul/04-architecture.md §3 (tables, colonnes, enums, contraintes).
// Formes héritées : docs/overhaul/audit/05-backend-donnees-permissions.md §3 et §15.
// Convention : `casing: 'snake_case'` (drizzle.config.ts et fabrique de connexion) — les propriétés
// camelCase ci-dessous deviennent des colonnes snake_case ; les noms explicites servent aux index et
// contraintes. Identifiants texte stables (04 §3 : nanoid 16 préfixé `a_`, `p_`, `b_`, `e_`, `c_`, `s_`,
// ou identifiants hérités conservés à la migration).

import { relations, sql } from 'drizzle-orm';
import {
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

/** Bloc `branches` d'un Serment (04 §3.3 : structure bA/bB conservée telle quelle, purement éditoriale). */
export type OathBranches = {
	bA?: OathBranch;
	bB?: OathBranch;
};

/** Aperçu d'un thème (audit 07 §3.2 : `colors` = 3 ou 4 couleurs, `tone`, `tagline`). */
export type ThemePreview = {
	colors: string[];
	tone: 'dark' | 'light';
	tagline: string;
};

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

// ---------------------------------------------------------------------------
// Colonnes communes
// ---------------------------------------------------------------------------

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();
/** 04 §3 : `revision integer NOT NULL DEFAULT 1` sur chaque agrégat modifiable (contrôle optimiste §6). */
const revision = () => integer('revision').notNull().default(1);

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
		revision: revision(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [index('themes_visible_idx').on(t.visible)]
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
		/** Gains par niveau ; défauts de création d'un custom : pvN 3, epN 5, emN 2, dmg 8 (audit 02 §4.4). */
		pvGrowth: integer('pv_growth').notNull().default(3),
		epGrowth: integer('ep_growth').notNull().default(5),
		emGrowth: integer('em_growth').notNull().default(2),
		baseDamage: integer('base_damage').notNull().default(8),
		damageType: text('damage_type').notNull().default(''),
		rank: oathRankEnum('rank').notNull().default('basic'),
		hidden: boolean('hidden').notNull().default(false),
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
		check(
			'oaths_growth_check',
			sql`${t.pvGrowth} >= 0 AND ${t.epGrowth} >= 0 AND ${t.emGrowth} >= 0`
		),
		check('oaths_base_damage_check', sql`${t.baseDamage} >= 0`)
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
		/** ≤ 20 000 caractères, borne appliquée par Zod (04 §3.2). */
		journal: text('journal').notNull().default(''),
		/** `progressionVersion: 1` rend la migration v1 idempotente (audit 02 §3). */
		progressionVersion: integer('progression_version').notNull().default(1),
		equipment: jsonb('equipment')
			.$type<Equipment>()
			.notNull()
			.default({ helmet: null, chest: null, legs: null }),
		/** ≤ 64 statuts (04 §3.2), borne appliquée par Zod. */
		statuses: jsonb('statuses').$type<CharacterStatus[]>().notNull().default([]),
		revision: revision(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('characters_name_idx').on(t.name),
		index('characters_oath_id_idx').on(t.oathId),
		/** `level ≥ 1` (audit 05 §3.2) ; `xp ≥ 0` ; un personnage à 0 PV reste à 0 (audit 05 §3.2) donc PV ≥ 0. */
		check('characters_level_check', sql`${t.level} >= 1`),
		check('characters_xp_check', sql`${t.xp} >= 0`),
		check(
			'characters_resources_check',
			sql`${t.pvCur} >= 0 AND ${t.pvMax} >= 0 AND ${t.epCur} >= 0 AND ${t.epMax} >= 0 AND ${t.emCur} >= 0 AND ${t.emMax} >= 0`
		)
	]
);

export const characterItems = pgTable(
	'character_items',
	{
		id: text('id').primaryKey(),
		characterId: text('character_id')
			.notNull()
			.references(() => characters.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		/** Catégories legacy : Équipement, Consommable, Gemme, Divers (audit 02 §17). */
		category: text('category').notNull(),
		qty: integer('qty').notNull().default(1),
		description: text('description').notNull().default(''),
		/** Champs inconnus hérités conservés (04 §3.2). */
		extra: jsonb('extra').$type<Record<string, unknown>>().notNull().default({}),
		position: integer('position').notNull().default(0),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('character_items_character_id_idx').on(t.characterId, t.position),
		/** `qty ≥ 0` (04 §3.2). */
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
		/** Un personnage n'a qu'un compte (04 §3.1 : FK nullable, unique). */
		characterId: text('character_id')
			.unique('accounts_character_id_unique')
			.references(() => characters.id, { onDelete: 'set null' }),
		/** Défaut 0 pour les comptes historiques (audit 05 §3.1). */
		sessionVersion: integer('session_version').notNull().default(0),
		forcePasswordReset: boolean('force_password_reset').notNull().default(false),
		resetExpiresAt: timestamp('reset_expires_at', { withTimezone: true }),
		/** Empreinte scrypt du mot de passe temporaire (04 §4). */
		resetSecretHash: text('reset_secret_hash'),
		/** `dark` toujours accordé (04 §3.8), donc défaut sûr. */
		selectedTheme: text('selected_theme')
			.notNull()
			.default('dark')
			.references(() => themes.id, { onDelete: 'restrict' }),
		discordId: text('discord_id').unique('accounts_discord_id_unique'),
		discordUsername: text('discord_username'),
		lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
		revision: revision(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		/** Unicité insensible à la casse (04 §3.1 ; audit 05 §3.1 `auth.js:641, 739`). */
		uniqueIndex('accounts_pseudo_lower_uidx').on(sql`lower(${t.pseudo})`),
		index('accounts_role_idx').on(t.role),
		check('accounts_session_version_check', sql`${t.sessionVersion} >= 0`)
	]
);

export const sessions = pgTable(
	'sessions',
	{
		/** Empreinte HMAC-SHA-256 du jeton opaque (04 §3.1). */
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
		ip: text('ip').notNull().default('')
	},
	(t) => [
		index('sessions_account_id_idx').on(t.accountId),
		index('sessions_expires_at_idx').on(t.expiresAt)
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
		windowStart: timestamp('window_start', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [primaryKey({ name: 'auth_rate_limits_pk', columns: [t.scope, t.subject] })]
);

export const adminRecoveryConsumptions = pgTable('admin_recovery_consumptions', {
	fingerprint: text('fingerprint').primaryKey(),
	pseudo: text('pseudo').notNull(),
	consumedAt: timestamp('consumed_at', { withTimezone: true }).notNull().defaultNow()
});

// ---------------------------------------------------------------------------
// 3.4 Bestiaire et zones
// ---------------------------------------------------------------------------

export const zones = pgTable(
	'zones',
	{
		/** Slug (04 §3.4). */
		id: text('id').primaryKey(),
		/** Libellé exact (nom de salon Discord, audit 03 §10.2) : `beasts.zones` contient ce libellé. */
		name: text('name').notNull(),
		emoji: text('emoji').notNull().default(''),
		isDefault: boolean('is_default').notNull().default(false),
		position: integer('position').notNull().default(0),
		revision: revision(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [uniqueIndex('zones_name_uidx').on(t.name), index('zones_position_idx').on(t.position)]
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
		zones: text('zones').array().notNull().default([]),
		statuses: jsonb('statuses').$type<unknown[]>().notNull().default([]),
		/** Jamais servi hors staff (04 §3.4). */
		adminNote: text('admin_note').notNull().default(''),
		extra: jsonb('extra').$type<Record<string, unknown>>().notNull().default({}),
		revision: revision(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('beasts_name_idx').on(t.name),
		index('beasts_visibility_idx').on(t.hidden, t.archived),
		check('beasts_level_check', sql`${t.level} >= 1`),
		check('beasts_pv_ep_check', sql`${t.pv} >= 1 AND ${t.ep} >= 0`),
		/** `spawnWeight` forcé ≥ 1 (audit 04 §1) ; fourchette de quantité cohérente. */
		check(
			'beasts_spawn_check',
			sql`${t.spawnWeight} >= 1 AND ${t.qtyMin} >= 0 AND ${t.qtyMax} >= ${t.qtyMin}`
		)
	]
);

// ---------------------------------------------------------------------------
// 3.5 Événements
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
		discordUrl: text('discord_url').notNull().default(''),
		createdBy: text('created_by').references(() => accounts.id, { onDelete: 'set null' }),
		revision: revision(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('events_starts_at_idx').on(t.startsAt),
		index('events_hidden_idx').on(t.hidden),
		check('events_capacity_check', sql`${t.capacity} >= 0`)
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
// 3.6 Combats (simulateur, Table, archives)
// ---------------------------------------------------------------------------

export const combats = pgTable(
	'combats',
	{
		id: text('id').primaryKey(),
		/** Nullable pour les archives orphelines, `owner_label` conservé (04 §3.6). */
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
		/** Clé d'idempotence de clôture : non nul ⇒ refus d'une seconde clôture (04 §3.6). */
		closedAt: timestamp('closed_at', { withTimezone: true }),
		revision: revision(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('combats_owner_status_idx').on(t.ownerAccountId, t.status),
		index('combats_saved_at_idx').on(t.savedAt),
		check('combats_round_check', sql`${t.round} >= 1`)
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
		createdAt: createdAt()
	},
	(t) => [
		primaryKey({ name: 'combat_participants_pk', columns: [t.combatId, t.characterId] }),
		index('combat_participants_character_id_idx').on(t.characterId)
	]
);

export const characterHistory = pgTable(
	'character_history',
	{
		id: bigserial('id', { mode: 'number' }).primaryKey(),
		characterId: text('character_id')
			.notNull()
			.references(() => characters.id, { onDelete: 'cascade' }),
		ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
		type: historyTypeEnum('type').notNull(),
		/** Texte BRUT, échappé au rendu (04 §3.2). */
		text: text('text').notNull(),
		/** `by` legacy : « Système », « MJ <nom> », « <perso> (joueur) » (audit 02 §8). */
		actorName: text('actor_name').notNull().default(''),
		actorAccountId: text('actor_account_id').references(() => accounts.id, {
			onDelete: 'set null'
		}),
		combatId: text('combat_id').references(() => combats.id, { onDelete: 'set null' }),
		/** Remplace `notifDeleted` (04 §3.2). */
		dismissed: boolean('dismissed').notNull().default(false)
	},
	(t) => [index('character_history_character_ts_idx').on(t.characterId, t.ts)]
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
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [index('beast_observations_beast_status_idx').on(t.beastId, t.status)]
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
		zoneId: text('zone_id').references(() => zones.id, { onDelete: 'set null' }),
		/** Groupes tirés (`packs` legacy, audit 03 §10.1). */
		payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
		beastIds: text('beast_ids').array().notNull().default([])
	},
	(t) => [
		index('spawn_runs_generated_at_idx').on(t.generatedAt),
		index('spawn_runs_zone_id_idx').on(t.zoneId)
	]
);

// ---------------------------------------------------------------------------
// 3.9 Scènes
// ---------------------------------------------------------------------------

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
		closedAt: timestamp('closed_at', { withTimezone: true }),
		revision: revision(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [index('scenes_status_idx').on(t.status)]
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
		createdAt: createdAt()
	},
	(t) => [index('scene_pins_scene_character_idx').on(t.sceneId, t.characterId)]
);

// ---------------------------------------------------------------------------
// 3.10 Journaux
// ---------------------------------------------------------------------------

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
		/** L'archivage marque au lieu de déplacer (04 §3.10). */
		archivedAt: timestamp('archived_at', { withTimezone: true })
	},
	(t) => [index('staff_log_ts_idx').on(t.ts), index('staff_log_archived_at_idx').on(t.archivedAt)]
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

/** Idempotence de la migration héritée (04 §3.10, §7). */
export const migrationRegistry = pgTable(
	'migration_registry',
	{
		sourceKey: text('source_key').notNull(),
		sourceId: text('source_id').notNull(),
		targetTable: text('target_table').notNull(),
		targetId: text('target_id').notNull(),
		checksum: text('checksum').notNull(),
		migratedAt: timestamp('migrated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		primaryKey({ name: 'migration_registry_pk', columns: [t.sourceKey, t.sourceId] }),
		index('migration_registry_target_idx').on(t.targetTable, t.targetId)
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
	combat: one(combats, { fields: [characterHistory.combatId], references: [combats.id] })
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
	character: one(characters, { fields: [accounts.characterId], references: [characters.id] }),
	theme: one(themes, { fields: [accounts.selectedTheme], references: [themes.id] }),
	sessions: many(sessions),
	themeGrants: many(accountThemeGrants, { relationName: 'grant_target' }),
	combats: many(combats)
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	account: one(accounts, { fields: [sessions.accountId], references: [accounts.id] })
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

export const beastsRelations = relations(beasts, ({ many }) => ({
	observations: many(beastObservations)
}));

export const beastObservationsRelations = relations(beastObservations, ({ one }) => ({
	beast: one(beasts, { fields: [beastObservations.beastId], references: [beasts.id] }),
	author: one(accounts, { fields: [beastObservations.authorAccountId], references: [accounts.id] }),
	validator: one(accounts, { fields: [beastObservations.validatedBy], references: [accounts.id] }),
	combat: one(combats, { fields: [beastObservations.combatId], references: [combats.id] })
}));

export const zonesRelations = relations(zones, ({ many }) => ({
	spawnRuns: many(spawnRuns)
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
	participants: many(combatParticipants),
	history: many(characterHistory)
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
	participants: many(sceneParticipants),
	pins: many(scenePins)
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

export const staffLogRelations = relations(staffLog, ({ one }) => ({
	actor: one(accounts, { fields: [staffLog.actorAccountId], references: [accounts.id] })
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
	actor: one(accounts, { fields: [auditLog.actorAccountId], references: [accounts.id] })
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
export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
export type CharacterItem = typeof characterItems.$inferSelect;
export type NewCharacterItem = typeof characterItems.$inferInsert;
export type CharacterHistoryEntry = typeof characterHistory.$inferSelect;
export type NewCharacterHistoryEntry = typeof characterHistory.$inferInsert;
export type Oath = typeof oaths.$inferSelect;
export type NewOath = typeof oaths.$inferInsert;
export type Beast = typeof beasts.$inferSelect;
export type NewBeast = typeof beasts.$inferInsert;
export type Zone = typeof zones.$inferSelect;
export type NewZone = typeof zones.$inferInsert;
export type BeastObservation = typeof beastObservations.$inferSelect;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type EventParticipant = typeof eventParticipants.$inferSelect;
export type Combat = typeof combats.$inferSelect;
export type NewCombat = typeof combats.$inferInsert;
export type CombatParticipant = typeof combatParticipants.$inferSelect;
export type SpawnRun = typeof spawnRuns.$inferSelect;
export type Theme = typeof themes.$inferSelect;
export type NewTheme = typeof themes.$inferInsert;
export type Scene = typeof scenes.$inferSelect;
export type SceneParticipant = typeof sceneParticipants.$inferSelect;
export type ScenePin = typeof scenePins.$inferSelect;
export type StaffLogEntry = typeof staffLog.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type MigrationRegistryEntry = typeof migrationRegistry.$inferSelect;

export type AccountRole = (typeof accountRoleEnum.enumValues)[number];
export type SessionScope = (typeof sessionScopeEnum.enumValues)[number];
export type HistoryType = (typeof historyTypeEnum.enumValues)[number];
export type OathRank = (typeof oathRankEnum.enumValues)[number];
export type OathCategory = (typeof oathCategoryEnum.enumValues)[number];
export type EventType = (typeof eventTypeEnum.enumValues)[number];
export type CombatStatus = (typeof combatStatusEnum.enumValues)[number];
export type SceneStatus = (typeof sceneStatusEnum.enumValues)[number];
export type ObservationStatus = (typeof observationStatusEnum.enumValues)[number];
