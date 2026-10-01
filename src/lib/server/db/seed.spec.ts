// Semis : référentiels idempotents, Serments natifs, jeu de démonstration cohérent et gardé.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import { BUILTIN_OATHS } from '../../game/oaths';
import { executeRows } from './index';
import * as schema from './schema';
import {
	DEMO_IDS,
	DEMO_PASSWORDS,
	SETTING_KEYS,
	SPAWN_SETTINGS_ID,
	THEME_SEED,
	ZONE_SEED,
	isDemoSeedAllowed,
	legacySha256Hash,
	seedDatabase,
	seedDemo,
	seedOaths,
	type OathSeedDefinition
} from './seed';

describe('référentiels — semis Drizzle sur base vierge', () => {
	let t: TestDb;
	beforeAll(async () => {
		// Base migrée puis vidée de ses référentiels (la migration 0001 les écrit déjà).
		t = await createTestDb({ referentials: false });
	});
	afterAll(async () => {
		await t.close();
	});

	it('sème thèmes, zones, réglages, spawn_settings et Serments natifs', async () => {
		expect(await t.db.select().from(schema.themes)).toHaveLength(0);
		const report = await seedDatabase(t.db, { oaths: BUILTIN_OATHS });
		expect(report).toEqual({
			themesInserted: THEME_SEED.length,
			zonesInserted: ZONE_SEED.length,
			settingsInserted: Object.keys(SETTING_KEYS).length,
			spawnSettingsInserted: 1,
			oathsInserted: BUILTIN_OATHS.length
		});
		expect(await t.db.select().from(schema.spawnSettings)).toMatchObject([
			{ id: SPAWN_SETTINGS_ID, migratedTotalDraws: 0 }
		]);
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
		const settingsRows = await t.db.select().from(schema.settings);
		expect(settingsRows.map((s) => s.key).sort()).toEqual(Object.values(SETTING_KEYS).sort());
		expect(settingsRows.every((s) => s.value === '')).toBe(true);
	});

	it('conserve les dates d’expiration des thèmes saisonniers', async () => {
		const [easter] = await t.db.select().from(schema.themes).where(eq(schema.themes.id, 'easter'));
		const [bloodmoon] = await t.db
			.select()
			.from(schema.themes)
			.where(eq(schema.themes.id, 'bloodmoon'));
		expect(easter?.availableUntil?.getTime()).toBe(1777593600000);
		expect(easter?.preview.colors).toHaveLength(4);
		expect(bloodmoon?.availableUntil).toBeNull();
		expect(bloodmoon?.rarity).toBe('Fondateur');
		// Fondateur, don admin uniquement : pas un événement (sinon carte « À débloquer » sans issue).
		expect(bloodmoon?.isEvent).toBe(false);
	});

	it('isEvent = (rareté Saisonnier), comme theme-max.js à l’affichage (audit 07 §3.1)', async () => {
		const rows = await t.db.select().from(schema.themes);
		expect(rows).toHaveLength(THEME_SEED.length);
		for (const theme of rows) {
			expect(theme.isEvent, theme.id).toBe(theme.rarity === 'Saisonnier');
		}
		expect(
			rows
				.filter((r) => r.isEvent)
				.map((r) => r.id)
				.sort()
		).toEqual(['easter', 'halloween', 'noel']);
	});

	it('résout la lignée par NOM (« Duelliste ») en FK d’identifiant', async () => {
		const [b] = await t.db.select().from(schema.oaths).where(eq(schema.oaths.id, 'bretteur'));
		expect(b?.evolvesFrom).toBe('duelliste');
		expect(b?.isBuiltin).toBe(true);
		expect(b?.hidden).toBe(true);
		const [d] = await t.db.select().from(schema.oaths).where(eq(schema.oaths.id, 'duelliste'));
		expect(d?.evolvesFrom).toBeNull();
		expect(d?.branches.bA?.paliers.length).toBeGreaterThan(0);
	});

	it('est idempotent et n’écrase ni une ligne éditée ni un réglage saisi', async () => {
		await t.db.update(schema.themes).set({ visible: false }).where(eq(schema.themes.id, 'violet'));
		await t.db
			.update(schema.settings)
			.set({ value: 'https://discord.gg/demo' })
			.where(eq(schema.settings.key, SETTING_KEYS.discordInviteUrl));
		await t.db.update(schema.oaths).set({ lore: 'Édité' }).where(eq(schema.oaths.id, 'duelliste'));

		const again = await seedDatabase(t.db, { oaths: BUILTIN_OATHS });
		expect(again).toEqual({
			themesInserted: 0,
			zonesInserted: 0,
			settingsInserted: 0,
			spawnSettingsInserted: 0,
			oathsInserted: 0
		});
		const [violet] = await t.db.select().from(schema.themes).where(eq(schema.themes.id, 'violet'));
		expect(violet?.visible).toBe(false);
		const [invite] = await t.db
			.select()
			.from(schema.settings)
			.where(eq(schema.settings.key, SETTING_KEYS.discordInviteUrl));
		expect(invite?.value).toBe('https://discord.gg/demo');
		const [d] = await t.db.select().from(schema.oaths).where(eq(schema.oaths.id, 'duelliste'));
		expect(d?.lore).toBe('Édité');
	});

	it('insère un parent avant son évolution, quel que soit l’ordre ; parent inconnu ⇒ NULL', async () => {
		const parent: OathSeedDefinition = {
			id: 'veilleur',
			name: 'Veilleur',
			weapon: 'Lanterne',
			growth: { pvN: 0, epN: 0, emN: 0 },
			baseDamage: 0,
			damageType: '',
			rank: 'singular',
			hidden: true,
			evolvesFrom: null,
			icon: '✦',
			category: 'soutien',
			lore: '',
			branches: { bA: null, bB: null },
			isBuiltin: false
		};
		const child: OathSeedDefinition = {
			...parent,
			id: 'gardien-de-phare',
			name: 'Gardien de phare',
			evolvesFrom: 'VEILLEUR'
		};
		const orphan: OathSeedDefinition = {
			...parent,
			id: 'egare',
			name: 'Égaré',
			evolvesFrom: 'Inconnu'
		};
		expect(await seedOaths(t.db, [child, orphan, parent])).toBe(3);
		const rows = await t.db
			.select()
			.from(schema.oaths)
			.where(sql`${schema.oaths.id} in ('veilleur', 'gardien-de-phare', 'egare')`);
		const byId = new Map(rows.map((r) => [r.id, r]));
		expect(byId.get('gardien-de-phare')?.evolvesFrom).toBe('veilleur');
		expect(byId.get('egare')?.evolvesFrom).toBeNull();
		expect(byId.get('veilleur')?.isBuiltin).toBe(false);
	});
});

describe('seedDemo — garde', () => {
	it('n’est permis qu’avec NP_DB_DRIVER=pglite ou NP_ALLOW_DEMO_SEED=true (hors production)', async () => {
		expect(isDemoSeedAllowed({})).toBe(false);
		expect(isDemoSeedAllowed({ DATABASE_URL: 'postgres://x/db' })).toBe(false);
		expect(isDemoSeedAllowed({ NP_ALLOW_DEMO_SEED: 'false' })).toBe(false);
		expect(isDemoSeedAllowed({ NP_DB_DRIVER: 'pglite' })).toBe(true);
		expect(isDemoSeedAllowed({ NP_ALLOW_DEMO_SEED: 'true' })).toBe(true);

		const t = await createTestDb();
		try {
			await expect(seedDemo(t.db, { DATABASE_URL: 'postgres://x/db' })).rejects.toThrow(
				/seedDemo refusé/
			);
			expect(await t.db.select().from(schema.accounts)).toHaveLength(0);
		} finally {
			await t.close();
		}
	});

	it('est TOUJOURS refusé en production, même avec NP_ALLOW_DEMO_SEED=true (04 §10.2)', async () => {
		const prodEnvs = [
			{ NETLIFY: 'true', NP_ALLOW_DEMO_SEED: 'true' },
			{ NODE_ENV: 'production', NP_ALLOW_DEMO_SEED: 'true' },
			{ NETLIFY: 'true', NP_DB_DRIVER: 'pglite' },
			{ NODE_ENV: 'production', NP_DB_DRIVER: 'pglite', NP_ALLOW_DEMO_SEED: 'true' }
		];
		for (const env of prodEnvs) expect(isDemoSeedAllowed(env), JSON.stringify(env)).toBe(false);

		const t = await createTestDb();
		try {
			for (const env of prodEnvs) {
				await expect(seedDemo(t.db, env)).rejects.toThrow(/interdit en production/);
			}
			expect(await t.db.select().from(schema.accounts)).toHaveLength(0);
		} finally {
			await t.close();
		}
	});

	it('exige les Serments du jeu et n’écrit rien sinon (transaction)', async () => {
		const t = await createTestDb({ referentials: false, seed: true, oaths: [] });
		try {
			await expect(seedDemo(t.db, { NP_ALLOW_DEMO_SEED: 'true' })).rejects.toThrow(
				/Serments absents \(duelliste, arcaniste, rodeur\)/
			);
			expect(await t.db.select().from(schema.characters)).toHaveLength(0);
		} finally {
			await t.close();
		}
	});
});

describe('seedDemo — jeu de démonstration', () => {
	let t: TestDb;
	beforeAll(async () => {
		t = await createTestDb({ demo: true });
	});
	afterAll(async () => {
		await t.close();
	});

	it('rapporte ce qu’il a semé, puis rien à la seconde exécution', async () => {
		expect(t.demo).toEqual({
			applied: true,
			accounts: 6,
			characters: 3,
			beasts: 6,
			events: 4,
			combats: 2,
			scenes: 1
		});
		const again = await seedDemo(t.db, { NP_DB_DRIVER: 'pglite' });
		expect(again.applied).toBe(false);
		expect(await t.db.select().from(schema.accounts)).toHaveLength(6);
		expect(await t.db.select().from(schema.characters)).toHaveLength(3);
	});

	it('comptes : rôles, mots de passe au format hérité sha256, nova en attente de liaison', async () => {
		const rows = await t.db.select().from(schema.accounts);
		const byPseudo = new Map(rows.map((a) => [a.pseudo, a]));
		expect([...byPseudo.keys()].sort()).toEqual(
			['admin', 'alice', 'bob', 'designer', 'mj', 'nova'].sort()
		);
		expect(byPseudo.get('admin')?.role).toBe('admin');
		expect(byPseudo.get('mj')?.role).toBe('mj');
		expect(byPseudo.get('designer')?.role).toBe('designer');
		expect(byPseudo.get('alice')?.role).toBe('joueur');
		expect(byPseudo.get('alice')?.characterId).toBe(DEMO_IDS.characters.aria);
		expect(byPseudo.get('bob')?.characterId).toBe(DEMO_IDS.characters.kael);
		expect(byPseudo.get('nova')?.characterId).toBeNull();
		for (const [pseudo, password] of Object.entries(DEMO_PASSWORDS)) {
			const hash = byPseudo.get(pseudo)?.passwordHash ?? '';
			expect(hash).toMatch(/^sha256:[0-9a-f]{64}$/);
			expect(hash).toBe(legacySha256Hash(password));
		}
		// Vecteur de test FIPS 180-2 (SHA-256 de « abc ») : le format est bien hex minuscule sans sel.
		expect(legacySha256Hash('abc')).toBe(
			'sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
		);
	});

	it('personnages : Aria (Duelliste 7) complète, Kael (Arcaniste 3), Seren non relié', async () => {
		const aria = await t.db.query.characters.findFirst({
			where: eq(schema.characters.id, DEMO_IDS.characters.aria),
			with: { items: true, history: true, journalEntries: true, account: true }
		});
		expect(aria?.oathId).toBe('duelliste');
		expect(aria?.level).toBe(7);
		expect(aria?.xp).toBeLessThan(7 * 30);
		expect([aria?.pvMax, aria?.epMax, aria?.emMax]).toEqual([66, 86, 32]);
		expect(aria!.pvCur).toBeLessThanOrEqual(aria!.pvMax);
		expect(aria?.statuses.length).toBeGreaterThanOrEqual(1);
		expect(aria?.account?.pseudo).toBe('alice');
		const gems = aria?.items.filter((i) => i.category === 'Gemme') ?? [];
		expect(gems.map((g) => g.name).sort()).toEqual(['Gemme Blanche', 'Gemme Incarnate']);
		expect(aria?.items.length).toBeGreaterThanOrEqual(4);
		expect(aria?.history.length).toBeGreaterThanOrEqual(4);
		// Au moins un tampon : rôle MJ/admin et motif non vide.
		expect(
			aria?.history.some((h) => (h.actorRole === 'mj' || h.actorRole === 'admin') && h.motif !== '')
		).toBe(true);
		expect(aria?.journalEntries.length).toBeGreaterThanOrEqual(1);

		const kael = await t.db.query.characters.findFirst({
			where: eq(schema.characters.id, DEMO_IDS.characters.kael)
		});
		expect([kael?.oathId, kael?.level]).toEqual(['arcaniste', 3]);

		const seren = await t.db.query.characters.findFirst({
			where: eq(schema.characters.id, DEMO_IDS.characters.seren),
			with: { account: true }
		});
		expect(seren).toBeDefined();
		expect(seren?.account).toBeNull();
	});

	it('créatures : 6, dont une masquée et une archivée, toutes rattachées à une zone', async () => {
		const rows = await t.db.query.beasts.findMany({ with: { zones: true } });
		expect(rows).toHaveLength(6);
		expect(rows.filter((b) => b.hidden).map((b) => b.id)).toEqual([DEMO_IDS.beasts.ombre]);
		expect(rows.filter((b) => b.archived).map((b) => b.id)).toEqual([DEMO_IDS.beasts.sanglier]);
		expect(rows.every((b) => b.zones.length >= 1)).toBe(true);
	});

	it('rendez-vous : 2 à venir visibles dont un complet, 1 passé, 1 masqué', async () => {
		const now = new Date();
		const upcoming = await t.db
			.select()
			.from(schema.events)
			.where(and(gt(schema.events.startsAt, now), eq(schema.events.hidden, false)));
		expect(upcoming).toHaveLength(2);
		const past = await t.db.select().from(schema.events).where(lt(schema.events.startsAt, now));
		expect(past).toHaveLength(1);
		const hidden = await t.db.select().from(schema.events).where(eq(schema.events.hidden, true));
		expect(hidden).toHaveLength(1);

		const fill = await executeRows<{ id: string; capacity: number; n: number }>(
			t.db,
			sql`select e.id, e.capacity, count(p.character_id)::int as n
			    from events e left join event_participants p on p.event_id = e.id
			    group by e.id, e.capacity`
		);
		const full = fill.filter((r) => r.capacity > 0 && r.n >= r.capacity);
		expect(full.map((r) => r.id)).toEqual([DEMO_IDS.events.conseil]);
	});

	it('combat terminé clos avec participants ; scène ouverte avec participants', async () => {
		const combat = await t.db.query.combats.findFirst({
			where: eq(schema.combats.id, DEMO_IDS.combat),
			with: { participants: true, history: true }
		});
		expect(combat?.status).toBe('termine');
		expect(combat?.closedAt).toBeInstanceOf(Date);
		expect(combat?.ownerAccountId).toBe(DEMO_IDS.accounts.mj);
		expect(combat?.participants).toHaveLength(2);
		expect(combat?.participants.every((p) => p.outcome !== null)).toBe(true);
		expect(combat?.history.length).toBeGreaterThanOrEqual(1);

		const scene = await t.db.query.scenes.findFirst({
			where: eq(schema.scenes.id, DEMO_IDS.scene),
			with: { participants: true }
		});
		expect(scene?.status).toBe('ouverte');
		expect(scene?.closedAt).toBeNull();
		expect(scene?.participants).toHaveLength(2);
	});
});
