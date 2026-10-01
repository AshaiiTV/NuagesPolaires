// Tests d'intégration du schéma sur PGlite avec les migrations réelles de `drizzle/` (04-architecture §8).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import { executeRows } from './index';
import * as schema from './schema';
import { THEME_SEED, ZONE_SEED, seedDatabase, seedOaths, type OathSeedDefinition } from './seed';

const EXPECTED_TABLES = [
	'accounts',
	'sessions',
	'account_theme_grants',
	'auth_rate_limits',
	'admin_recovery_consumptions',
	'characters',
	'character_items',
	'character_history',
	'oaths',
	'beasts',
	'zones',
	'beast_observations',
	'events',
	'event_participants',
	'combats',
	'combat_participants',
	'spawn_runs',
	'themes',
	'scenes',
	'scene_participants',
	'scene_pins',
	'staff_log',
	'audit_log',
	'migration_registry'
] as const;

/** Serment de test minimal (valeurs du Duelliste, audit 02 §5.14). */
const duelliste: OathSeedDefinition = {
	id: 'duelliste',
	name: 'Duelliste',
	weapon: 'Épée moyenne du serment',
	growth: { pvN: 6, epN: 6, emN: 2 },
	baseDamage: 11,
	damageType: 'Tranchant',
	rank: 'basic',
	hidden: false,
	evolvesFrom: null,
	icon: '⚔',
	category: 'melee',
	lore: '',
	branches: {}
};
/** Évolution masquée du Duelliste (audit 02 §5.2) : vérifie l'ordre d'insertion parent → enfant. */
const bretteur: OathSeedDefinition = {
	...duelliste,
	id: 'bretteur',
	name: 'Bretteur',
	weapon: 'Épée fine du serment',
	growth: { pvN: 5, epN: 7, emN: 3 },
	baseDamage: 12,
	rank: 'seasoned',
	hidden: true,
	evolvesFrom: 'duelliste'
};

let t: TestDb;

/**
 * Drizzle enveloppe l'erreur Postgres (« Failed query: … ») et garde l'original dans `cause` :
 * on vérifie le motif sur les deux messages.
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

beforeAll(async () => {
	// Les évolutions sont volontairement données avant leur parent.
	t = await createTestDb({ oaths: [bretteur, duelliste] });
});

afterAll(async () => {
	await t.close();
});

describe('migrations', () => {
	it('crée toutes les tables de 04 §3', async () => {
		const rows = await executeRows<{ table_name: string }>(
			t.db,
			sql`select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'`
		);
		const names = new Set(rows.map((r) => r.table_name));
		for (const name of EXPECTED_TABLES) expect(names.has(name), `table ${name}`).toBe(true);
		// Aucune table de dérive (04 §3.11).
		for (const gone of [
			'rpg_characters',
			'theme_catalog',
			'serment_catalog',
			'page_content',
			'lieux'
		]) {
			expect(names.has(gone), `table supprimée ${gone}`).toBe(false);
		}
	});

	it('crée les enums attendus', async () => {
		const rows = await executeRows<{ typname: string }>(
			t.db,
			sql`select typname from pg_type where typtype = 'e'`
		);
		const names = new Set(rows.map((r) => r.typname));
		for (const e of [
			'account_role',
			'session_scope',
			'theme_grant_kind',
			'history_type',
			'oath_rank',
			'oath_category',
			'observation_status',
			'event_type',
			'combat_status',
			'scene_status',
			'scene_pin_kind'
		]) {
			expect(names.has(e), `enum ${e}`).toBe(true);
		}
	});

	it('enregistre la migration 0000_fondation dans le journal Drizzle', async () => {
		const rows = await executeRows<{ n: number }>(
			t.db,
			sql`select count(*)::int as n from drizzle.__drizzle_migrations`
		);
		expect(rows[0]?.n).toBeGreaterThanOrEqual(1);
	});
});

describe('seed', () => {
	it('sème le catalogue complet des thèmes (audit 07 §3.2) et les zones par défaut (audit 03 §10.2)', async () => {
		expect(t.seed.themesInserted).toBe(THEME_SEED.length);
		expect(t.seed.zonesInserted).toBe(ZONE_SEED.length);
		expect(t.seed.oathsInserted).toBe(2);

		const themeIds = (await t.db.select({ id: schema.themes.id }).from(schema.themes))
			.map((r) => r.id)
			.sort();
		expect(themeIds).toEqual(
			[
				'dark',
				'light',
				'violet',
				'green',
				'aquaris',
				'easter',
				'halloween',
				'noel',
				'bloodmoon'
			].sort()
		);
		const zonesRows = await t.db.select().from(schema.zones).orderBy(schema.zones.position);
		expect(zonesRows.map((z) => z.name)).toEqual([
			'[🌳]-forêt-aux-lianes',
			'[🌳]-forêt-aux-arbres-sombres',
			'[🌳]-arbre-géant',
			'[🌳]-forêt-centre',
			'[🌳]-lisière-du-canyon'
		]);
		expect(zonesRows.every((z) => z.isDefault)).toBe(true);
	});

	it('conserve les dates d’expiration des thèmes saisonniers', async () => {
		const [easter] = await t.db.select().from(schema.themes).where(eq(schema.themes.id, 'easter'));
		const [bloodmoon] = await t.db
			.select()
			.from(schema.themes)
			.where(eq(schema.themes.id, 'bloodmoon'));
		expect(easter?.availableUntil?.getTime()).toBe(1777593600000);
		expect(easter?.isEvent).toBe(true);
		expect(bloodmoon?.availableUntil).toBeNull();
		expect(bloodmoon?.rarity).toBe('Fondateur');
		expect(easter?.preview.colors).toHaveLength(4);
	});

	it('est idempotent et n’écrase pas une ligne éditée', async () => {
		await t.db.update(schema.themes).set({ visible: false }).where(eq(schema.themes.id, 'violet'));
		const again = await seedDatabase(t.db, { oaths: [duelliste, bretteur] });
		expect(again).toEqual({ themesInserted: 0, zonesInserted: 0, oathsInserted: 0 });
		const [violet] = await t.db.select().from(schema.themes).where(eq(schema.themes.id, 'violet'));
		expect(violet?.visible).toBe(false);
		const count = await executeRows<{ n: number }>(
			t.db,
			sql`select count(*)::int as n from themes`
		);
		expect(count[0]?.n).toBe(THEME_SEED.length);
	});

	it('insère les Serments parents avant leurs évolutions', async () => {
		const [b] = await t.db.select().from(schema.oaths).where(eq(schema.oaths.id, 'bretteur'));
		expect(b?.evolvesFrom).toBe('duelliste');
		expect(b?.isBuiltin).toBe(true);
		expect(b?.rank).toBe('seasoned');
		// Un catalogue référençant un parent inconnu ne casse pas la FK : le lien est mis à null.
		const n = await seedOaths(t.db, [
			{ ...duelliste, id: 'orphelin', name: 'Orphelin', evolvesFrom: 'inconnu' }
		]);
		expect(n).toBe(1);
		const [o] = await t.db.select().from(schema.oaths).where(eq(schema.oaths.id, 'orphelin'));
		expect(o?.evolvesFrom).toBeNull();
	});
});

describe('contraintes', () => {
	it('refuse un pseudo déjà pris à la casse près (04 §3.1)', async () => {
		await t.db
			.insert(schema.accounts)
			.values({ id: 'a_alice', pseudo: 'Alice', passwordHash: 'x' });
		await expectDbError(
			t.db.insert(schema.accounts).values({ id: 'a_alice2', pseudo: 'aLICE', passwordHash: 'x' }),
			/accounts_pseudo_lower_uidx|duplicate key/
		);
	});

	it('applique revision = 1 et les défauts de création par défaut', async () => {
		const [c] = await t.db
			.insert(schema.characters)
			.values({ id: 'p_alice', name: 'Alice', oathId: 'duelliste' })
			.returning();
		expect(c?.revision).toBe(1);
		expect(c?.branch).toBe('Aucune');
		expect(c?.level).toBe(1);
		expect([c?.pvMax, c?.epMax, c?.emMax]).toEqual([30, 50, 20]);
		expect(c?.progressionVersion).toBe(1);
		expect(c?.equipment).toEqual({ helmet: null, chest: null, legs: null });
		expect(c?.statuses).toEqual([]);

		const [a] = await t.db.select().from(schema.accounts).where(eq(schema.accounts.id, 'a_alice'));
		expect(a?.revision).toBe(1);
		expect(a?.sessionVersion).toBe(0);
		expect(a?.role).toBe('joueur');
		expect(a?.selectedTheme).toBe('dark');
	});

	it('refuse un personnage sans Serment connu (FK oaths)', async () => {
		await expectDbError(
			t.db.insert(schema.characters).values({ id: 'p_x', name: 'X', oathId: 'inexistant' }),
			/foreign key|characters_oath_id_oaths_id_fk/
		);
	});

	it('refuse un niveau < 1 et une quantité négative (checks)', async () => {
		await expectDbError(
			t.db
				.insert(schema.characters)
				.values({ id: 'p_y', name: 'Y', oathId: 'duelliste', level: 0 }),
			/characters_level_check/
		);
		await expectDbError(
			t.db
				.insert(schema.characterItems)
				.values({
					id: 'i_1',
					characterId: 'p_alice',
					name: 'Potion',
					category: 'Consommable',
					qty: -1
				}),
			/character_items_qty_check/
		);
	});

	it('n’accepte qu’un compte par personnage (character_id unique)', async () => {
		await t.db
			.update(schema.accounts)
			.set({ characterId: 'p_alice' })
			.where(eq(schema.accounts.id, 'a_alice'));
		await t.db.insert(schema.accounts).values({ id: 'a_bob', pseudo: 'Bob', passwordHash: 'x' });
		await expectDbError(
			t.db
				.update(schema.accounts)
				.set({ characterId: 'p_alice' })
				.where(eq(schema.accounts.id, 'a_bob')),
			/accounts_character_id_unique|duplicate key/
		);
	});

	it('supprime en cascade objets, historique et sessions ; met à null les acteurs des journaux', async () => {
		await t.db
			.insert(schema.characterItems)
			.values({
				id: 'i_2',
				characterId: 'p_alice',
				name: 'Gemme blanche',
				category: 'Gemme',
				qty: 2
			});
		await t.db
			.insert(schema.characterHistory)
			.values({ characterId: 'p_alice', type: 'gemme', text: '+5 XP', actorName: 'Système' });
		await t.db.insert(schema.sessions).values({
			id: 'sess_bob',
			accountId: 'a_bob',
			sessionVersion: 0,
			expiresAt: new Date(Date.now() + 60_000)
		});
		await t.db
			.insert(schema.staffLog)
			.values({ action: 'liaison', detail: 'test', actorAccountId: 'a_bob', actorName: 'Bob' });

		await t.db.delete(schema.characters).where(eq(schema.characters.id, 'p_alice'));
		expect(
			await t.db
				.select()
				.from(schema.characterItems)
				.where(eq(schema.characterItems.characterId, 'p_alice'))
		).toHaveLength(0);
		expect(
			await t.db
				.select()
				.from(schema.characterHistory)
				.where(eq(schema.characterHistory.characterId, 'p_alice'))
		).toHaveLength(0);
		// Le compte lié survit, sa liaison est remise à null (ON DELETE SET NULL).
		const [alice] = await t.db
			.select()
			.from(schema.accounts)
			.where(eq(schema.accounts.id, 'a_alice'));
		expect(alice?.characterId).toBeNull();

		await t.db.delete(schema.accounts).where(eq(schema.accounts.id, 'a_bob'));
		expect(
			await t.db.select().from(schema.sessions).where(eq(schema.sessions.accountId, 'a_bob'))
		).toHaveLength(0);
		const [log] = await t.db.select().from(schema.staffLog);
		expect(log?.actorAccountId).toBeNull();
		expect(log?.actorName).toBe('Bob');
	});

	it('interdit de supprimer un thème sélectionné ou un Serment porté (ON DELETE RESTRICT)', async () => {
		await expectDbError(
			t.db.delete(schema.themes).where(eq(schema.themes.id, 'dark')),
			/foreign key|restrict/i
		);
		await t.db.insert(schema.characters).values({ id: 'p_carl', name: 'Carl', oathId: 'bretteur' });
		await expectDbError(
			t.db.delete(schema.oaths).where(eq(schema.oaths.id, 'bretteur')),
			/foreign key|restrict/i
		);
	});

	it('assure les clés composées (participations, dons de thème, limites)', async () => {
		await t.db
			.insert(schema.events)
			.values({ id: 'e_1', title: 'Chasse', type: 'combat', capacity: 0 });
		await t.db.insert(schema.eventParticipants).values({ eventId: 'e_1', characterId: 'p_carl' });
		await expectDbError(
			t.db.insert(schema.eventParticipants).values({ eventId: 'e_1', characterId: 'p_carl' }),
			/event_participants_pk|duplicate key/
		);

		await t.db.insert(schema.authRateLimits).values({ scope: 'login', subject: 'alice', count: 1 });
		await expectDbError(
			t.db.insert(schema.authRateLimits).values({ scope: 'login', subject: 'alice', count: 2 }),
			/auth_rate_limits_pk|duplicate key/
		);
	});

	it('supporte les transactions avec annulation (04 §6)', async () => {
		await expect(
			t.db.transaction(async (tx) => {
				await tx.insert(schema.zones).values({ id: 'z_tmp', name: 'Zone temporaire' });
				throw new Error('annulation volontaire');
			})
		).rejects.toThrow('annulation volontaire');
		expect(await t.db.select().from(schema.zones).where(eq(schema.zones.id, 'z_tmp'))).toHaveLength(
			0
		);
	});

	it('implémente le contrôle optimiste : UPDATE … WHERE revision = $n RETURNING revision', async () => {
		const [before] = await t.db
			.select()
			.from(schema.characters)
			.where(eq(schema.characters.id, 'p_carl'));
		const ok = await t.db
			.update(schema.characters)
			.set({ journal: 'Jour 1', revision: sql`${schema.characters.revision} + 1` })
			.where(
				sql`${schema.characters.id} = 'p_carl' and ${schema.characters.revision} = ${before?.revision}`
			)
			.returning({ revision: schema.characters.revision });
		expect(ok).toEqual([{ revision: 2 }]);
		const stale = await t.db
			.update(schema.characters)
			.set({ journal: 'Jour 1 bis', revision: sql`${schema.characters.revision} + 1` })
			.where(
				sql`${schema.characters.id} = 'p_carl' and ${schema.characters.revision} = ${before?.revision}`
			)
			.returning({ revision: schema.characters.revision });
		expect(stale).toHaveLength(0); // ⇒ 409 VERSION_CONFLICT côté domaine
	});

	it('expose l’API relationnelle (db.query) sur le schéma', async () => {
		const carl = await t.db.query.characters.findFirst({
			where: eq(schema.characters.id, 'p_carl'),
			with: { oath: { with: { parent: true } }, eventParticipations: true }
		});
		expect(carl?.oath.name).toBe('Bretteur');
		expect(carl?.oath.parent?.id).toBe('duelliste');
		expect(carl?.eventParticipations).toHaveLength(1);
	});
});
