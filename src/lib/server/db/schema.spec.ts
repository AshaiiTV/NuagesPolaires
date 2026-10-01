// Tests d'intégration du schéma sur PGlite avec les migrations réelles de `drizzle/` (04 §8).
// Chaque contrainte de 04 §10.4 est vérifiée par son EFFET (refus, cascade, mise à null, restriction).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import { executeRows } from './index';
import * as schema from './schema';

/** Les 35 tables de 04 §3, §3.12 et §10 — ni plus, ni moins. */
const EXPECTED_TABLES = [
	'account_theme_grants',
	'accounts',
	'admin_recovery_consumptions',
	'audit_log',
	'auth_rate_limits',
	'beast_observations',
	'beast_zones',
	'beasts',
	'character_history',
	'character_items',
	'characters',
	'combat_participants',
	'combats',
	'declarations',
	'event_participants',
	'events',
	'journal_entries',
	'migration_registry',
	'oaths',
	'publication_beasts',
	'publications',
	'reading_marks',
	'scene_participants',
	'scene_pins',
	'scenes',
	'sessions',
	'settings',
	'spawn_counters',
	'spawn_runs',
	'spawn_settings',
	'staff_log',
	'staff_log_archives',
	'themes',
	'validated_facts',
	'zones'
] as const;

/** Agrégats éditables portant `revision` (04 §10.13, + faits validés de §3.12). */
const REVISIONED_TABLES = [
	'accounts',
	'characters',
	'beasts',
	'oaths',
	'events',
	'combats',
	'scenes',
	'beast_observations',
	'zones',
	'themes',
	'validated_facts'
] as const;

/**
 * Tables en ajout seul ou de liaison pure : seul leur horodatage d'événement (ou `created_at`) est
 * posé ; toutes les autres portent `created_at` ET `updated_at` (04 §3, principe général).
 */
const APPEND_ONLY_TABLES = {
	account_theme_grants: ['created_at'],
	admin_recovery_consumptions: ['consumed_at'],
	audit_log: ['ts'],
	beast_zones: [],
	event_participants: ['registered_at'],
	migration_registry: ['migrated_at'],
	publication_beasts: [],
	spawn_runs: ['generated_at'],
	staff_log_archives: ['archived_at']
} as const satisfies Partial<Record<(typeof EXPECTED_TABLES)[number], readonly string[]>>;

let t: TestDb;

/**
 * Drizzle enveloppe l'erreur Postgres (« Failed query: … ») et garde l'original dans `cause` :
 * on vérifie le motif sur les deux messages et sur le nom de contrainte.
 */
async function expectDbError(promise: Promise<unknown>, pattern: RegExp): Promise<void> {
	let caught: unknown = null;
	try {
		await promise;
	} catch (e) {
		caught = e;
	}
	expect(caught, 'une erreur était attendue').not.toBeNull();
	const err = caught as { message?: string; cause?: { message?: string; constraint?: string } };
	const text = [err.message, err.cause?.message, err.cause?.constraint].filter(Boolean).join(' | ');
	expect(text).toMatch(pattern);
}

async function count(table: string, where = sql`true`): Promise<number> {
	const rows = await executeRows<{ n: number }>(
		t.db,
		sql`select count(*)::int as n from ${sql.identifier(table)} where ${where}`
	);
	return rows[0]?.n ?? -1;
}

beforeAll(async () => {
	t = await createTestDb();
	// Fixture commune : deux comptes, deux personnages, une créature.
	await t.db.insert(schema.characters).values([
		{ id: 'p_a', name: 'Aster', oathId: 'duelliste' },
		{ id: 'p_b', name: 'Brune', oathId: 'arcaniste' }
	]);
	await t.db.insert(schema.accounts).values([
		{ id: 'a_a', pseudo: 'Aster', passwordHash: 'x', characterId: 'p_a' },
		{ id: 'a_b', pseudo: 'Brune', passwordHash: 'x', characterId: 'p_b' }
	]);
	await t.db.insert(schema.beasts).values({ id: 'b_1', name: 'Loup' });
});

afterAll(async () => {
	await t.close();
});

describe('migration 0000_fondation', () => {
	it('crée exactement les tables attendues (aucune table de lieux ni de dérive)', async () => {
		const rows = await executeRows<{ table_name: string }>(
			t.db,
			sql`select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`
		);
		expect(rows.map((r) => r.table_name)).toEqual([...EXPECTED_TABLES]);
	});

	it('crée les enums attendus', async () => {
		const rows = await executeRows<{ typname: string }>(
			t.db,
			sql`select typname from pg_type where typtype = 'e' order by typname`
		);
		expect(rows.map((r) => r.typname)).toEqual(
			[
				'account_role',
				'combat_status',
				'declaration_resource',
				'declaration_status',
				'event_type',
				'fact_kind',
				'fact_status',
				'history_actor_role',
				'history_field',
				'history_type',
				'oath_category',
				'oath_rank',
				'observation_status',
				'scene_pin_kind',
				'scene_status',
				'session_scope',
				'theme_grant_kind'
			].sort()
		);
	});

	it('contient quatre migrations : 0000 (DDL), 0001 (référentiels), 0002 (DDL INT-1), 0003 (tokens INT-1)', async () => {
		expect(
			(
				await executeRows<{ n: number }>(
					t.db,
					sql`select count(*)::int as n from drizzle.__drizzle_migrations`
				)
			)[0]?.n
		).toBe(4);
	});

	it('colonnes INT-1 : rature du personnage, annonce et récit du rendez-vous, tokens, motif d’observation', async () => {
		const rows = await executeRows<{ table_name: string; column_name: string; is_nullable: string }>(
			t.db,
			sql`select table_name, column_name, is_nullable from information_schema.columns
				where (table_name, column_name) in (
					('characters','struck_at'), ('characters','struck_by'), ('characters','struck_motif'),
					('events','announced_at'), ('events','announced_by'), ('events','recit_combat_id'),
					('themes','tokens'), ('beast_observations','motif'))
				order by table_name, column_name`
		);
		expect(rows.map((r) => `${r.table_name}.${r.column_name}:${r.is_nullable}`)).toEqual([
			'beast_observations.motif:NO',
			'characters.struck_at:YES',
			'characters.struck_by:YES',
			'characters.struck_motif:YES',
			'events.announced_at:YES',
			'events.announced_by:YES',
			'events.recit_combat_id:YES',
			'themes.tokens:YES'
		]);
	});

	it('FK INT-1 en SET NULL : auteur d’une rature ou d’une annonce, récit d’un rendez-vous', async () => {
		await t.db.insert(schema.accounts).values({ id: 'a_int1', pseudo: 'int1', passwordHash: 'x' });
		await t.db.insert(schema.combats).values({ id: 'c_int1' });
		await t.db.insert(schema.characters).values({
			id: 'p_int1',
			name: 'Rayé',
			oathId: 'duelliste',
			struckAt: new Date(),
			struckBy: 'a_int1',
			struckMotif: 'Doublon'
		});
		await t.db.insert(schema.events).values({
			id: 'e_int1',
			title: 'Annonce',
			announcedAt: new Date(),
			announcedBy: 'a_int1',
			recitCombatId: 'c_int1'
		});
		await t.db.delete(schema.accounts).where(eq(schema.accounts.id, 'a_int1'));
		await t.db.delete(schema.combats).where(eq(schema.combats.id, 'c_int1'));
		const [c] = await t.db.select().from(schema.characters).where(eq(schema.characters.id, 'p_int1'));
		const [e] = await t.db.select().from(schema.events).where(eq(schema.events.id, 'e_int1'));
		expect([c.struckBy, c.struckMotif, c.struckAt !== null]).toEqual([null, 'Doublon', true]);
		expect([e.announcedBy, e.recitCombatId, e.announcedAt !== null]).toEqual([null, null, true]);
		await t.db.delete(schema.events).where(eq(schema.events.id, 'e_int1'));
		await t.db.delete(schema.characters).where(eq(schema.characters.id, 'p_int1'));
	});

	it('pose les index de 04 §10.4', async () => {
		const rows = await executeRows<{ indexname: string; indexdef: string }>(
			t.db,
			sql`select indexname, indexdef from pg_indexes where schemaname = 'public'`
		);
		const defs = new Map(rows.map((r) => [r.indexname, r.indexdef]));
		expect(defs.get('accounts_pseudo_lower_uidx')).toMatch(/UNIQUE INDEX .*lower\(\(?pseudo/);
		expect(defs.get('sessions_account_id_idx')).toMatch(/\(account_id\)/);
		expect(defs.get('character_history_character_ts_idx')).toMatch(/\(character_id, ts, id\)/);
		expect(defs.get('event_participants_character_id_idx')).toMatch(/\(character_id\)/);
		expect(defs.get('combats_owner_saved_at_idx')).toMatch(/\(owner_account_id, saved_at\)/);
		expect(defs.get('beast_observations_beast_status_idx')).toMatch(/\(beast_id, status\)/);
		expect(defs.get('character_items_character_legacy_uidx')).toMatch(
			/UNIQUE INDEX .*\(character_id, legacy_id\)/
		);
		expect(defs.has('accounts_character_id_unique')).toBe(true);
		expect(defs.has('accounts_discord_id_unique')).toBe(true);
	});

	it('pose created_at / updated_at timestamptz partout, sauf tables en ajout seul (04 §3)', async () => {
		const rows = await executeRows<{ table_name: string; column_name: string; data_type: string }>(
			t.db,
			sql`select table_name, column_name, data_type from information_schema.columns
			    where table_schema = 'public' and column_name in ('created_at', 'updated_at')`
		);
		const cols = new Map<string, Set<string>>();
		for (const r of rows) {
			expect(r.data_type, `${r.table_name}.${r.column_name}`).toBe('timestamp with time zone');
			if (!cols.has(r.table_name)) cols.set(r.table_name, new Set());
			cols.get(r.table_name)!.add(r.column_name);
		}
		const exceptions: Record<string, readonly string[]> = APPEND_ONLY_TABLES;
		for (const table of EXPECTED_TABLES) {
			const has = cols.get(table) ?? new Set<string>();
			if (table in exceptions) {
				expect(has.has('updated_at'), `${table} est en ajout seul`).toBe(false);
				continue;
			}
			expect([...has].sort(), table).toEqual(['created_at', 'updated_at']);
		}
		// Chaque exception garde un horodatage d'événement.
		const all = await executeRows<{ table_name: string; column_name: string }>(
			t.db,
			sql`select table_name, column_name from information_schema.columns where table_schema = 'public'`
		);
		for (const [table, stamps] of Object.entries(APPEND_ONLY_TABLES)) {
			for (const col of stamps) {
				expect(
					all.some((c) => c.table_name === table && c.column_name === col),
					`${table}.${col}`
				).toBe(true);
			}
		}
	});

	it('pose un CHECK revision >= 1 sur chaque agrégat éditable', async () => {
		const rows = await executeRows<{ conname: string }>(
			t.db,
			sql`select conname from pg_constraint where contype = 'c'`
		);
		const names = new Set(rows.map((r) => r.conname));
		for (const table of REVISIONED_TABLES) {
			expect(names.has(`${table}_revision_check`), `${table}_revision_check`).toBe(true);
		}
	});
});

describe('unicités', () => {
	it('refuse un pseudo déjà pris à la casse près', async () => {
		await expectDbError(
			t.db.insert(schema.accounts).values({ id: 'a_x', pseudo: 'aSTER', passwordHash: 'x' }),
			/accounts_pseudo_lower_uidx|duplicate key/
		);
	});

	it('un personnage n’a qu’un compte (character_id unique)', async () => {
		await t.db.insert(schema.accounts).values({ id: 'a_c', pseudo: 'Ciel', passwordHash: 'x' });
		await expectDbError(
			t.db.update(schema.accounts).set({ characterId: 'p_a' }).where(eq(schema.accounts.id, 'a_c')),
			/accounts_character_id_unique|duplicate key/
		);
		// Plusieurs comptes sans personnage restent possibles (NULL non unique).
		await t.db.insert(schema.accounts).values({ id: 'a_d', pseudo: 'Dune', passwordHash: 'x' });
		expect(await count('accounts', sql`character_id is null`)).toBeGreaterThanOrEqual(2);
	});

	it('discord_id unique', async () => {
		await t.db
			.update(schema.accounts)
			.set({ discordId: '42' })
			.where(eq(schema.accounts.id, 'a_c'));
		await expectDbError(
			t.db.update(schema.accounts).set({ discordId: '42' }).where(eq(schema.accounts.id, 'a_d')),
			/accounts_discord_id_unique|duplicate key/
		);
	});

	it('legacy_id d’objet unique PAR personnage seulement (04 §10.3)', async () => {
		await t.db.insert(schema.characterItems).values([
			{ id: 'i_a1', characterId: 'p_a', legacyId: 'it1', name: 'Potion', category: 'Consommable' },
			// Même identifiant hérité chez un autre personnage : permis.
			{ id: 'i_b1', characterId: 'p_b', legacyId: 'it1', name: 'Potion', category: 'Consommable' },
			// Objets sans identifiant hérité : permis en nombre.
			{ id: 'i_a2', characterId: 'p_a', name: 'Corde', category: 'Divers' },
			{ id: 'i_a3', characterId: 'p_a', name: 'Torche', category: 'Divers' }
		]);
		await expectDbError(
			t.db
				.insert(schema.characterItems)
				.values({ id: 'i_a4', characterId: 'p_a', legacyId: 'it1', name: 'X', category: 'Divers' }),
			/character_items_character_legacy_uidx|duplicate key/
		);
	});

	it('clés composées : participations, dons de thème, limites, zones de créature', async () => {
		await t.db.insert(schema.events).values({ id: 'e_1', title: 'Chasse', type: 'combat' });
		await t.db.insert(schema.eventParticipants).values({ eventId: 'e_1', characterId: 'p_a' });
		await expectDbError(
			t.db.insert(schema.eventParticipants).values({ eventId: 'e_1', characterId: 'p_a' }),
			/event_participants_pk|duplicate key/
		);
		await t.db.insert(schema.authRateLimits).values({ scope: 'login', subject: 'aster', count: 1 });
		await expectDbError(
			t.db.insert(schema.authRateLimits).values({ scope: 'login', subject: 'aster', count: 2 }),
			/auth_rate_limits_pk|duplicate key/
		);
		await t.db.insert(schema.beastZones).values({ beastId: 'b_1', zoneId: 'foret-centre' });
		await expectDbError(
			t.db.insert(schema.beastZones).values({ beastId: 'b_1', zoneId: 'foret-centre' }),
			/beast_zones_pk|duplicate key/
		);
	});

	it('registre de migration : clé (source_key, source_id, transformer_version) (04 §10.10)', async () => {
		const row = {
			sourceKey: 'rpg_players',
			sourceId: 'p_1',
			targetTable: 'characters',
			targetId: 'p_1',
			checksum: 'abc'
		};
		await t.db.insert(schema.migrationRegistry).values(row);
		await expectDbError(
			t.db.insert(schema.migrationRegistry).values(row),
			/migration_registry_pk|duplicate key/
		);
		await t.db.insert(schema.migrationRegistry).values({ ...row, transformerVersion: 2 });
		await expectDbError(
			t.db.insert(schema.migrationRegistry).values({ ...row, transformerVersion: 0 }),
			/migration_registry_transformer_version_check/
		);
	});

	it('spawn_settings n’a qu’une ligne (id = 1), présente dès la migration (04 §10.10)', async () => {
		expect(await t.db.select().from(schema.spawnSettings)).toMatchObject([
			{ id: 1, migratedTotalDraws: 0 }
		]);
		await t.db.update(schema.spawnSettings).set({ migratedTotalDraws: 120 });
		await expectDbError(
			t.db.insert(schema.spawnSettings).values({ migratedTotalDraws: 5 }),
			/spawn_settings_pkey|duplicate key/
		);
		await expectDbError(
			t.db.insert(schema.spawnSettings).values({ id: 2 }),
			/spawn_settings_singleton_check/
		);
		await expectDbError(
			t.db.update(schema.spawnSettings).set({ migratedTotalDraws: -1 }),
			/spawn_settings_migrated_total_draws_check/
		);
		// Total affiché = cumul migré + tirages en base : la jointure interne trouve toujours la ligne.
		const totals = await executeRows<{ total: number }>(
			t.db,
			sql`select (s.migrated_total_draws + (select count(*) from spawn_runs))::int as total
			    from spawn_settings s where s.id = 1`
		);
		expect(totals).toEqual([{ total: 120 }]);
		await expectDbError(
			t.db.insert(schema.spawnCounters).values({ beastId: 'b_1', migratedDraws: -1 }),
			/spawn_counters_migrated_draws_check/
		);
	});
});

describe('CHECK (04 §10.4)', () => {
	it('personnages : level >= 1, xp >= 0, *_cur >= 0, *_max >= 1', async () => {
		const base = { name: 'Z', oathId: 'duelliste' };
		await expectDbError(
			t.db.insert(schema.characters).values({ ...base, id: 'p_z1', level: 0 }),
			/characters_level_check/
		);
		await expectDbError(
			t.db.insert(schema.characters).values({ ...base, id: 'p_z2', xp: -1 }),
			/characters_xp_check/
		);
		for (const col of ['pvCur', 'epCur', 'emCur'] as const) {
			await expectDbError(
				t.db.insert(schema.characters).values({ ...base, id: `p_${col}`, [col]: -1 }),
				/characters_resources_cur_check/
			);
		}
		for (const col of ['pvMax', 'epMax', 'emMax'] as const) {
			await expectDbError(
				t.db.insert(schema.characters).values({ ...base, id: `p_${col}`, [col]: 0 }),
				/characters_resources_max_check/
			);
		}
		// Un personnage à 0 PV reste valide.
		await t.db.insert(schema.characters).values({ ...base, id: 'p_zero', pvCur: 0 });
	});

	it('objets : qty >= 0 ; événements : capacity >= 0', async () => {
		await expectDbError(
			t.db
				.insert(schema.characterItems)
				.values({ id: 'i_neg', characterId: 'p_a', name: 'P', category: 'Divers', qty: -1 }),
			/character_items_qty_check/
		);
		await t.db
			.insert(schema.characterItems)
			.values({ id: 'i_zero', characterId: 'p_a', name: 'P', category: 'Divers', qty: 0 });
		await expectDbError(
			t.db.insert(schema.events).values({ id: 'e_neg', title: 'X', capacity: -1 }),
			/events_capacity_check/
		);
	});

	it('créatures : spawn_weight >= 0, qty_min >= 1, qty_max >= qty_min', async () => {
		await t.db.insert(schema.beasts).values({ id: 'b_w0', name: 'Jamais tirée', spawnWeight: 0 });
		await expectDbError(
			t.db.insert(schema.beasts).values({ id: 'b_w', name: 'X', spawnWeight: -1 }),
			/beasts_spawn_weight_check/
		);
		await expectDbError(
			t.db.insert(schema.beasts).values({ id: 'b_q0', name: 'X', qtyMin: 0 }),
			/beasts_qty_check/
		);
		await expectDbError(
			t.db.insert(schema.beasts).values({ id: 'b_q', name: 'X', qtyMin: 3, qtyMax: 2 }),
			/beasts_qty_check/
		);
	});

	it('revision >= 1 sur chaque agrégat éditable', async () => {
		await expectDbError(
			t.db.update(schema.characters).set({ revision: 0 }).where(eq(schema.characters.id, 'p_a')),
			/characters_revision_check/
		);
		await expectDbError(
			t.db.update(schema.themes).set({ revision: 0 }).where(eq(schema.themes.id, 'dark')),
			/themes_revision_check/
		);
		await expectDbError(
			t.db.update(schema.zones).set({ revision: 0 }).where(eq(schema.zones.id, 'foret-centre')),
			/zones_revision_check/
		);
	});

	it('combats : un combat clos est terminé ; journal ≤ 20 000 ; Serment non auto-évolutif', async () => {
		await expectDbError(
			t.db.insert(schema.combats).values({ id: 'c_bad', status: 'en_cours', closedAt: new Date() }),
			/combats_closed_status_check/
		);
		await expectDbError(
			t.db
				.insert(schema.journalEntries)
				.values({ id: 'j_long', characterId: 'p_a', text: 'x'.repeat(20001) }),
			/journal_entries_text_check/
		);
		await t.db
			.insert(schema.journalEntries)
			.values({ id: 'j_max', characterId: 'p_a', text: 'x'.repeat(20000) });
		await expectDbError(
			t.db
				.update(schema.oaths)
				.set({ evolvesFrom: 'duelliste' })
				.where(eq(schema.oaths.id, 'duelliste')),
			/oaths_no_self_evolution_check/
		);
	});
});

describe('contraintes ajoutées au-delà de 04 §10.4 (05-fondation, écart 7)', () => {
	it('Serments : nom unique à la casse près, croissance et dégâts >= 0', async () => {
		await expectDbError(
			t.db.insert(schema.oaths).values({ id: 'duelliste-bis', name: 'DUELLISTE' }),
			/oaths_name_lower_uidx|duplicate key/
		);
		await expectDbError(
			t.db.insert(schema.oaths).values({ id: 'o_neg', name: 'Négatif', pvGrowth: -1 }),
			/oaths_growth_check/
		);
		await expectDbError(
			t.db.insert(schema.oaths).values({ id: 'o_dmg', name: 'Sans dégâts', baseDamage: -1 }),
			/oaths_base_damage_check/
		);
		// Croissance [0,0,0] d'un Serment inconnu migré (04 §10.5) : permise.
		await t.db.insert(schema.oaths).values({
			id: 'mizu',
			name: 'Mizu',
			pvGrowth: 0,
			epGrowth: 0,
			emGrowth: 0,
			baseDamage: 0,
			hidden: true
		});
	});

	it('créatures : level >= 1, pv >= 1, ep >= 0 ; combats : round >= 1 ; zones : libellé unique', async () => {
		await expectDbError(
			t.db.insert(schema.beasts).values({ id: 'b_l0', name: 'X', level: 0 }),
			/beasts_level_check/
		);
		await expectDbError(
			t.db.insert(schema.beasts).values({ id: 'b_pv0', name: 'X', pv: 0 }),
			/beasts_pv_ep_check/
		);
		await expectDbError(
			t.db.insert(schema.beasts).values({ id: 'b_ep', name: 'X', ep: -1 }),
			/beasts_pv_ep_check/
		);
		await t.db.insert(schema.beasts).values({ id: 'b_ep0', name: 'Sans énergie', ep: 0 });
		await expectDbError(
			t.db.insert(schema.combats).values({ id: 'c_r0', round: 0 }),
			/combats_round_check/
		);
		await expectDbError(
			t.db.insert(schema.zones).values({ id: 'z_dup', name: '[🌳]-forêt-centre' }),
			/zones_name_uidx|duplicate key/
		);
	});
});

describe('valeurs par défaut', () => {
	it('revision = 1 et défauts de création', async () => {
		const [c] = await t.db.select().from(schema.characters).where(eq(schema.characters.id, 'p_a'));
		expect(c?.revision).toBe(1);
		expect(c?.branch).toBe('Aucune');
		expect([c?.pvMax, c?.epMax, c?.emMax]).toEqual([30, 50, 20]);
		expect(c?.equipment).toEqual({ helmet: null, chest: null, legs: null });
		expect(c?.extra).toEqual({});
		const [a] = await t.db.select().from(schema.accounts).where(eq(schema.accounts.id, 'a_a'));
		expect(a?.revision).toBe(1);
		expect(a?.sessionVersion).toBe(0);
		expect(a?.selectedTheme).toBe('dark');
		expect(a?.extra).toEqual({});
	});

	it('Serment custom inséré sans valeurs : défauts de création d’un custom (audit 02 §4.4)', async () => {
		const [o] = await t.db
			.insert(schema.oaths)
			.values({ id: 'o_custom', name: 'Custom par défaut' })
			.returning();
		expect(o?.rank).toBe('singular'); // « Singulier », jamais « Basique » pour un custom
		expect(o?.isBuiltin).toBe(false);
		expect([o?.pvGrowth, o?.epGrowth, o?.emGrowth, o?.baseDamage]).toEqual([3, 5, 2, 8]);
		expect([o?.icon, o?.category, o?.hidden]).toEqual(['✦', 'melee', false]);
		// Les natifs, eux, portent leur rang explicite (migration 0001).
		const [d] = await t.db.select().from(schema.oaths).where(eq(schema.oaths.id, 'duelliste'));
		expect([d?.rank, d?.isBuiltin]).toEqual(['basic', true]);
	});

	it('déclaration : fenêtre d’annulation de 10 s, statut proposée', async () => {
		const [d] = await t.db
			.insert(schema.declarations)
			.values({ id: 'd_1', characterId: 'p_a', resource: 'ep', delta: -8, word: 'Esquive' })
			.returning();
		expect(d?.status).toBe('proposee');
		expect((d?.cancelUntil.getTime() ?? 0) - (d?.createdAt.getTime() ?? 0)).toBe(10_000);
	});

	it('cancel_until = created_at + 10 s même pour une ligne datée explicitement ; non modifiable (04 §3.12)', async () => {
		const past = new Date('2026-03-29T00:59:55Z'); // à cheval sur le passage à l'heure d'été
		const [d] = await t.db
			.insert(schema.declarations)
			.values({ id: 'd_past', characterId: 'p_a', resource: 'pv', delta: -3, createdAt: past })
			.returning();
		expect(d?.cancelUntil.toISOString()).toBe('2026-03-29T01:00:05.000Z');
		// Le calcul ne dépend pas du fuseau de la session.
		await t.db.transaction(async (tx) => {
			await tx.execute(sql`set local timezone = 'Europe/Paris'`);
			const rows = await executeRows<{ diff: string }>(
				tx,
				sql`insert into declarations (id, character_id, resource, delta, created_at)
				    values ('d_tz', 'p_a', 'em', -1, '2026-10-25 02:59:55+02')
				    returning (cancel_until - created_at)::text as diff`
			);
			expect(rows[0]?.diff).toBe('00:00:10');
		});
		await expectDbError(
			t.db.execute(
				sql`insert into declarations (id, character_id, resource, delta, cancel_until)
				    values ('d_forced', 'p_a', 'pv', -1, now() + interval '1 hour')`
			),
			/cannot insert a non-DEFAULT value into column "cancel_until"/
		);
		await expectDbError(
			t.db.execute(sql`update declarations set cancel_until = now() where id = 'd_past'`),
			/can only be updated to DEFAULT/
		);
	});

	it('updated_at est remis à l’heure par chaque UPDATE Drizzle, created_at reste', async () => {
		const past = new Date('2020-01-01T00:00:00Z');
		await t.db.insert(schema.declarations).values({
			id: 'd_upd',
			characterId: 'p_a',
			resource: 'pv',
			delta: -2,
			createdAt: past,
			updatedAt: past
		});
		await t.db.insert(schema.publications).values({
			id: 'pub_upd',
			text: 'Extrait.',
			createdAt: past,
			updatedAt: past
		});
		const before = Date.now() - 1000;
		const [d] = await t.db
			.update(schema.declarations)
			.set({ status: 'reportee', reportedAt: new Date() })
			.where(eq(schema.declarations.id, 'd_upd'))
			.returning();
		expect(d?.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
		expect(d?.createdAt.getTime()).toBe(past.getTime());
		const [p] = await t.db
			.update(schema.publications)
			.set({ struck: true, struckAt: new Date() })
			.where(eq(schema.publications.id, 'pub_upd'))
			.returning();
		expect(p?.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
		expect(p?.createdAt.getTime()).toBe(past.getTime());
	});
});

describe('ON DELETE (04 §10.4)', () => {
	it('suppression d’un personnage : CASCADE sur tout ce qu’il possède, SET NULL sur la liaison', async () => {
		await t.db
			.insert(schema.characters)
			.values({ id: 'p_del', name: 'Éphémère', oathId: 'rodeur' });
		await t.db.insert(schema.accounts).values({
			id: 'a_del',
			pseudo: 'Ephemere',
			passwordHash: 'x',
			characterId: 'p_del'
		});
		await t.db.insert(schema.combats).values({ id: 'c_1', name: 'Escarmouche' });
		await t.db.insert(schema.scenes).values({ id: 's_1', title: 'Gué' });
		await t.db
			.insert(schema.characterItems)
			.values({ id: 'i_del', characterId: 'p_del', name: 'Gemme Blanche', category: 'Gemme' });
		await t.db
			.insert(schema.characterHistory)
			.values({ characterId: 'p_del', type: 'xp', text: '+5 XP' });
		await t.db.insert(schema.eventParticipants).values({ eventId: 'e_1', characterId: 'p_del' });
		await t.db.insert(schema.combatParticipants).values({ combatId: 'c_1', characterId: 'p_del' });
		await t.db.insert(schema.sceneParticipants).values({ sceneId: 's_1', characterId: 'p_del' });
		await t.db
			.insert(schema.scenePins)
			.values({ id: 'pin_1', sceneId: 's_1', characterId: 'p_del', kind: 'regle', ref: 'esquive' });
		await t.db
			.insert(schema.journalEntries)
			.values({ id: 'j_del', characterId: 'p_del', text: 'Note' });
		await t.db
			.insert(schema.declarations)
			.values({ id: 'd_del', characterId: 'p_del', resource: 'pv', delta: -3, sceneId: 's_1' });
		await t.db
			.insert(schema.validatedFacts)
			.values({ id: 'f_del', characterId: 'p_del', kind: 'dette', text: 'Doit une faveur' });

		await t.db.delete(schema.characters).where(eq(schema.characters.id, 'p_del'));

		const owned = sql`character_id = 'p_del'`;
		for (const table of [
			'character_items',
			'character_history',
			'event_participants',
			'combat_participants',
			'scene_participants',
			'scene_pins',
			'journal_entries',
			'declarations',
			'validated_facts'
		]) {
			expect(await count(table, owned), table).toBe(0);
		}
		const [acc] = await t.db.select().from(schema.accounts).where(eq(schema.accounts.id, 'a_del'));
		expect(acc?.characterId).toBeNull();
	});

	it('suppression d’un compte : CASCADE (sessions, dons, signet), SET NULL (auteurs), libellés conservés', async () => {
		await t.db
			.insert(schema.accounts)
			.values({ id: 'a_mj', pseudo: 'Meneur', passwordHash: 'x', role: 'mj' });
		await t.db.insert(schema.sessions).values({
			id: 'sess_mj',
			accountId: 'a_mj',
			sessionVersion: 0,
			expiresAt: new Date(Date.now() + 60_000)
		});
		await t.db
			.insert(schema.accountThemeGrants)
			.values({ accountId: 'a_mj', themeId: 'violet', kind: 'unlocked' });
		await t.db.insert(schema.readingMarks).values({ accountId: 'a_mj' });
		await t.db.insert(schema.events).values({
			id: 'e_mj',
			title: 'Veillée',
			createdBy: 'a_mj',
			createdByLabel: 'Meneur'
		});
		await t.db
			.insert(schema.combats)
			.values({ id: 'c_mj', ownerAccountId: 'a_mj', ownerLabel: 'Meneur' });
		await t.db.insert(schema.characterHistory).values({
			characterId: 'p_a',
			type: 'stat',
			text: 'PV : 30 → 25',
			actorAccountId: 'a_mj',
			actorName: 'MJ Meneur',
			actorRole: 'mj',
			motif: 'Chute'
		});
		await t.db
			.insert(schema.staffLog)
			.values({ action: 'liaison', actorAccountId: 'a_mj', actorName: 'Meneur' });
		await t.db
			.insert(schema.auditLog)
			.values({ source: 'auth', action: 'login', actorAccountId: 'a_mj', actorPseudo: 'Meneur' });
		await t.db
			.insert(schema.beastObservations)
			.values({ id: 'o_mj', beastId: 'b_1', text: 'Craint le feu.', authorAccountId: 'a_mj' });

		await t.db.delete(schema.accounts).where(eq(schema.accounts.id, 'a_mj'));

		expect(await count('sessions', sql`account_id = 'a_mj'`)).toBe(0);
		expect(await count('account_theme_grants', sql`account_id = 'a_mj'`)).toBe(0);
		expect(await count('reading_marks', sql`account_id = 'a_mj'`)).toBe(0);

		const [ev] = await t.db.select().from(schema.events).where(eq(schema.events.id, 'e_mj'));
		expect([ev?.createdBy, ev?.createdByLabel]).toEqual([null, 'Meneur']);
		const [cb] = await t.db.select().from(schema.combats).where(eq(schema.combats.id, 'c_mj'));
		expect([cb?.ownerAccountId, cb?.ownerLabel]).toEqual([null, 'Meneur']);
		const [h] = await t.db
			.select()
			.from(schema.characterHistory)
			.where(eq(schema.characterHistory.motif, 'Chute'));
		expect([h?.actorAccountId, h?.actorName]).toEqual([null, 'MJ Meneur']);
		const [s] = await t.db
			.select()
			.from(schema.staffLog)
			.where(eq(schema.staffLog.actorName, 'Meneur'));
		expect(s?.actorAccountId).toBeNull();
		const [au] = await t.db
			.select()
			.from(schema.auditLog)
			.where(eq(schema.auditLog.actorPseudo, 'Meneur'));
		expect(au?.actorAccountId).toBeNull();
		const [o] = await t.db
			.select()
			.from(schema.beastObservations)
			.where(eq(schema.beastObservations.id, 'o_mj'));
		expect(o?.authorAccountId).toBeNull();
	});

	it('suppression d’une créature : CASCADE sur zones, observations, publications liées, compteurs', async () => {
		await t.db.insert(schema.beasts).values({ id: 'b_del', name: 'Fugace' });
		await t.db.insert(schema.beastZones).values({ beastId: 'b_del', zoneId: 'arbre-geant' });
		await t.db
			.insert(schema.beastObservations)
			.values({ id: 'o_del', beastId: 'b_del', text: 'Rapide.' });
		await t.db.insert(schema.publications).values({ id: 'pub_1', text: 'La meute a fui.' });
		await t.db
			.insert(schema.publicationBeasts)
			.values({ publicationId: 'pub_1', beastId: 'b_del' });
		await t.db.insert(schema.spawnCounters).values({ beastId: 'b_del', migratedDraws: 7 });

		await t.db.delete(schema.beasts).where(eq(schema.beasts.id, 'b_del'));

		for (const table of [
			'beast_zones',
			'beast_observations',
			'publication_beasts',
			'spawn_counters'
		]) {
			expect(await count(table, sql`beast_id = 'b_del'`), table).toBe(0);
		}
		expect(await count('publications', sql`id = 'pub_1'`)).toBe(1); // la publication survit
	});

	it('suppression d’une zone : CASCADE sur beast_zones, RESTRICT si un tirage la référence', async () => {
		await t.db.insert(schema.zones).values({ id: 'z_tmp', name: 'Clairière' });
		await t.db.insert(schema.beastZones).values({ beastId: 'b_1', zoneId: 'z_tmp' });
		await t.db.delete(schema.zones).where(eq(schema.zones.id, 'z_tmp'));
		expect(await count('beast_zones', sql`zone_id = 'z_tmp'`)).toBe(0);

		await t.db.insert(schema.spawnRuns).values({ id: 'run_1', zoneId: 'foret-centre' });
		await expectDbError(
			t.db.delete(schema.zones).where(eq(schema.zones.id, 'foret-centre')),
			/spawn_runs_zone_id_zones_id_fk|foreign key/
		);
	});

	it('RESTRICT : Serment porté, thème sélectionné', async () => {
		await expectDbError(
			t.db.delete(schema.oaths).where(eq(schema.oaths.id, 'duelliste')),
			/characters_oath_id_oaths_id_fk|foreign key/
		);
		await expectDbError(
			t.db.delete(schema.themes).where(eq(schema.themes.id, 'dark')),
			/accounts_selected_theme_themes_id_fk|foreign key/
		);
	});

	it('oaths.evolves_from est une FK (SET NULL à la suppression du parent)', async () => {
		await t.db.insert(schema.oaths).values([
			{ id: 'parent_x', name: 'Parent X' },
			{ id: 'enfant_x', name: 'Enfant X', evolvesFrom: 'parent_x' }
		]);
		await expectDbError(
			t.db.insert(schema.oaths).values({ id: 'orph', name: 'Orphelin', evolvesFrom: 'inconnu' }),
			/oaths_evolves_from_oaths_id_fk|foreign key/
		);
		await t.db.delete(schema.oaths).where(eq(schema.oaths.id, 'parent_x'));
		const [child] = await t.db.select().from(schema.oaths).where(eq(schema.oaths.id, 'enfant_x'));
		expect(child?.evolvesFrom).toBeNull();
	});

	it('références croisées combat ↔ scène ↔ publication : SET NULL', async () => {
		await t.db.insert(schema.scenes).values({ id: 's_x', title: 'Table' });
		await t.db.insert(schema.publications).values({ id: 'pub_x', text: 'Extrait.' });
		await t.db
			.insert(schema.combats)
			.values({ id: 'c_x', sceneId: 's_x', publishedExtractId: 'pub_x' });
		await t.db.update(schema.scenes).set({ combatId: 'c_x' }).where(eq(schema.scenes.id, 's_x'));
		await t.db
			.insert(schema.beastObservations)
			.values({ id: 'o_x', beastId: 'b_1', text: 'Vu.', publicationId: 'pub_x', combatId: 'c_x' });

		await t.db.delete(schema.publications).where(eq(schema.publications.id, 'pub_x'));
		const [c1] = await t.db.select().from(schema.combats).where(eq(schema.combats.id, 'c_x'));
		expect(c1?.publishedExtractId).toBeNull();
		const [o1] = await t.db
			.select()
			.from(schema.beastObservations)
			.where(eq(schema.beastObservations.id, 'o_x'));
		expect(o1?.publicationId).toBeNull();

		await t.db.delete(schema.scenes).where(eq(schema.scenes.id, 's_x'));
		const [c2] = await t.db.select().from(schema.combats).where(eq(schema.combats.id, 'c_x'));
		expect(c2?.sceneId).toBeNull();

		await t.db.delete(schema.combats).where(eq(schema.combats.id, 'c_x'));
		const [o2] = await t.db
			.select()
			.from(schema.beastObservations)
			.where(eq(schema.beastObservations.id, 'o_x'));
		expect(o2?.combatId).toBeNull();
	});

	it('ratures (historique, journal) et archives du journal staff : SET NULL', async () => {
		const [first] = await t.db
			.insert(schema.characterHistory)
			.values({ characterId: 'p_b', type: 'stat', text: 'PV 32', field: 'pv', newValue: '32' })
			.returning();
		const [rature] = await t.db
			.insert(schema.characterHistory)
			.values({
				characterId: 'p_b',
				type: 'stat',
				text: 'PV 32 → 28',
				field: 'pv',
				oldValue: '32',
				newValue: '28',
				replacesId: first?.id,
				actorRole: 'mj',
				motif: 'Correction'
			})
			.returning();
		expect(rature?.replacesId).toBe(first?.id);
		await t.db.delete(schema.characterHistory).where(eq(schema.characterHistory.id, first!.id));
		const [after] = await t.db
			.select()
			.from(schema.characterHistory)
			.where(eq(schema.characterHistory.id, rature!.id));
		expect(after?.replacesId).toBeNull();

		await t.db.insert(schema.journalEntries).values([
			{ id: 'j_v1', characterId: 'p_b', text: 'v1', struck: true },
			{ id: 'j_v2', characterId: 'p_b', text: 'v2', replacesId: 'j_v1' }
		]);
		await t.db.delete(schema.journalEntries).where(eq(schema.journalEntries.id, 'j_v1'));
		const [j2] = await t.db
			.select()
			.from(schema.journalEntries)
			.where(eq(schema.journalEntries.id, 'j_v2'));
		expect(j2?.replacesId).toBeNull();

		await t.db.insert(schema.staffLogArchives).values({ id: 'arch_1', label: 'Septembre' });
		await t.db.insert(schema.staffLog).values({ action: 'event_create', archiveId: 'arch_1' });
		await t.db.delete(schema.staffLogArchives).where(eq(schema.staffLogArchives.id, 'arch_1'));
		expect(await count('staff_log', sql`action = 'event_create' and archive_id is null`)).toBe(1);
	});
});

describe('concurrence et transactions (04 §6, §10.6)', () => {
	it('contrôle optimiste : UPDATE … WHERE revision = $n RETURNING revision', async () => {
		const bump = () =>
			t.db
				.update(schema.characters)
				.set({ journal: 'Jour 1', revision: sql`${schema.characters.revision} + 1` })
				.where(and(eq(schema.characters.id, 'p_b'), eq(schema.characters.revision, 1)))
				.returning({ revision: schema.characters.revision });
		expect(await bump()).toEqual([{ revision: 2 }]);
		expect(await bump()).toHaveLength(0); // ⇒ 409 VERSION_CONFLICT côté domaine
	});

	it('clôture de combat idempotente par closed_at', async () => {
		await t.db.insert(schema.combats).values({ id: 'c_close', status: 'en_cours' });
		const close = () =>
			t.db
				.update(schema.combats)
				.set({
					closedAt: sql`now()`,
					status: 'termine',
					revision: sql`${schema.combats.revision} + 1`
				})
				.where(
					and(
						eq(schema.combats.id, 'c_close'),
						isNull(schema.combats.closedAt),
						eq(schema.combats.revision, 1)
					)
				)
				.returning({ id: schema.combats.id });
		expect(await close()).toEqual([{ id: 'c_close' }]);
		expect(await close()).toHaveLength(0);
	});

	it('annule toute la transaction en cas d’erreur', async () => {
		await expect(
			t.db.transaction(async (tx) => {
				await tx.insert(schema.zones).values({ id: 'z_rollback', name: 'Zone temporaire' });
				throw new Error('annulation volontaire');
			})
		).rejects.toThrow('annulation volontaire');
		expect(await count('zones', sql`id = 'z_rollback'`)).toBe(0);
	});
});

describe('API relationnelle (db.query)', () => {
	it('suit les relations Serment, lignée, compte, inventaire, zones de créature', async () => {
		const aster = await t.db.query.characters.findFirst({
			where: eq(schema.characters.id, 'p_a'),
			with: { oath: true, account: true, items: true, eventParticipations: true }
		});
		expect(aster?.oath.name).toBe('Duelliste');
		expect(aster?.account?.id).toBe('a_a');
		expect(aster?.items.length).toBeGreaterThanOrEqual(3);
		expect(aster?.eventParticipations).toHaveLength(1);

		const bretteur = await t.db.query.oaths.findFirst({
			where: eq(schema.oaths.id, 'bretteur'),
			with: { parent: true }
		});
		expect(bretteur?.parent?.id).toBe('duelliste');

		const loup = await t.db.query.beasts.findFirst({
			where: eq(schema.beasts.id, 'b_1'),
			with: { zones: { with: { zone: true } } }
		});
		expect(loup?.zones.map((z) => z.zone.name)).toContain('[🌳]-forêt-centre');
	});
});
