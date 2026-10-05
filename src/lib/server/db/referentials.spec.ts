// Migration de données 0001_referentiels (04 §3.3, §3.8, §10.10) : une base qui n'a reçu QUE les
// migrations (comme Neon après `drizzle-kit migrate`) est immédiatement utilisable.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { createTestDb, REFERENTIAL_TABLES, type TestDb } from '../../../../tests/helpers/db';
import { BUILTIN_OATHS } from '../../game/oaths';
import { executeRows } from './index';
import { checkReferentials } from './migrate';
import {
	ALWAYS_GRANTED_THEME_IDS,
	REFERENTIALS_MIGRATION_FILE,
	SETTING_KEYS,
	SPAWN_SETTINGS_ID,
	THEME_SEED,
	ZONE_SEED,
	buildReferentialsSql,
	oathRowsFor
} from './referentials';
import {
	readReferentialsMigration,
	referentialsMigrationPath,
	renderReferentialsMigration,
	renderThemeTokensMigration,
	themeTokensMigrationPath
} from './generate-referentials';
import { seedDatabase } from './seed';
import * as schema from './schema';
import { THEMES } from '../../ui/themes';

const PRIMARY_KEY: Record<(typeof REFERENTIAL_TABLES)[number], string> = {
	themes: 'id',
	zones: 'id',
	settings: 'key',
	spawn_settings: 'id',
	oaths: 'id'
};

/** Lignes d'une table, sans horodatages d'écriture, triées par clé primaire. */
async function snapshot(t: TestDb, table: (typeof REFERENTIAL_TABLES)[number]) {
	const rows = await executeRows<Record<string, unknown>>(
		t.db,
		sql`select * from ${sql.identifier(table)} order by ${sql.identifier(PRIMARY_KEY[table])}`
	);
	return rows.map((row) => {
		const copy = { ...row };
		delete copy.created_at;
		delete copy.updated_at;
		return copy;
	});
}

describe('migration de données 0001_referentiels', () => {
	let migrated: TestDb;
	beforeAll(async () => {
		// Migrations SEULES : aucun semis Drizzle.
		migrated = await createTestDb({ seed: false });
	});
	afterAll(async () => {
		await migrated.close();
	});

	it('le fichier SQL est à jour (sinon : npx tsx src/lib/server/db/generate-referentials.ts)', () => {
		expect(referentialsMigrationPath().endsWith(REFERENTIALS_MIGRATION_FILE)).toBe(true);
		expect(readReferentialsMigration()).toBe(renderReferentialsMigration());
	});

	it('la migration 0003 (tokens des thèmes, INT-1) est à jour et semée pour les neuf thèmes natifs', async () => {
		expect(readReferentialsMigration(themeTokensMigrationPath())).toBe(
			renderThemeTokensMigration()
		);
		const rows = await migrated.db
			.select({ id: schema.themes.id, tokens: schema.themes.tokens })
			.from(schema.themes);
		expect(rows).toHaveLength(THEMES.length);
		for (const row of rows) {
			expect(row.tokens, row.id).toEqual(THEMES.find((t) => t.id === row.id)?.tokens);
		}
	});

	it('la migration 0003 reprend les marques `extra` héritées sans écraser une colonne posée', async () => {
		const t = await createTestDb({ demo: true });
		try {
			await t.db
				.update(schema.characters)
				.set({ extra: { struckAt: '2026-09-01T10:00:00.000Z', struckMotif: 'Doublon', autre: 1 } })
				.where(eq(schema.characters.id, 'p_demo_seren'));
			for (const statement of renderThemeTokensMigration().split('--> statement-breakpoint')) {
				await t.db.execute(sql.raw(statement));
			}
			const [seren] = await t.db
				.select()
				.from(schema.characters)
				.where(eq(schema.characters.id, 'p_demo_seren'));
			expect(seren.struckAt?.toISOString()).toBe('2026-09-01T10:00:00.000Z');
			expect(seren.struckMotif).toBe('Doublon');
			expect(seren.extra).toEqual({ autre: 1 });
		} finally {
			await t.close();
		}
	});

	it('le rendu est déterministe et sépare les instructions pour le migrateur', () => {
		const sqlText = buildReferentialsSql(BUILTIN_OATHS);
		expect(buildReferentialsSql(BUILTIN_OATHS)).toBe(sqlText);
		expect(sqlText.split('--> statement-breakpoint')).toHaveLength(5);
		expect(sqlText).not.toMatch(/\r/);
		// Sans Serments, l'instruction oaths disparaît.
		expect(buildReferentialsSql([]).split('--> statement-breakpoint')).toHaveLength(4);
	});

	it('écrit thèmes (dont dark et light), zones, réglages vides, spawn_settings et Serments natifs', async () => {
		const themeIds = (await migrated.db.select({ id: schema.themes.id }).from(schema.themes)).map(
			(r) => r.id
		);
		expect(themeIds.sort()).toEqual(THEME_SEED.map((x) => x.id).sort());
		for (const id of ALWAYS_GRANTED_THEME_IDS) expect(themeIds).toContain(id);
		expect(await migrated.db.select().from(schema.zones)).toHaveLength(ZONE_SEED.length);
		const settingsRows = await migrated.db.select().from(schema.settings);
		expect(settingsRows.map((s) => s.key).sort()).toEqual(Object.values(SETTING_KEYS).sort());
		expect(settingsRows.every((s) => s.value === '')).toBe(true);
		expect(await migrated.db.select().from(schema.spawnSettings)).toMatchObject([
			{ id: SPAWN_SETTINGS_ID, migratedTotalDraws: 0 }
		]);
		const oathRows = await migrated.db.select().from(schema.oaths);
		expect(oathRows).toHaveLength(BUILTIN_OATHS.length);
		expect(oathRows.every((o) => o.isBuiltin)).toBe(true);
		const bretteur = oathRows.find((o) => o.id === 'bretteur');
		expect(bretteur?.evolvesFrom).toBe('duelliste');
		expect(await checkReferentials(migrated.db)).toEqual([]);
	});

	it('produit exactement les lignes du semis Drizzle (seedDatabase sur base vierge)', async () => {
		const seeded = await createTestDb({ referentials: false, seed: true });
		try {
			for (const table of REFERENTIAL_TABLES) {
				const historiques = await snapshot(migrated, table);
				// Les migrations historiques gardent leurs libellés ; le semis suit les arbitrages actuels.
				const attendues =
					table === 'themes'
						? historiques.map((row) => {
								const theme = THEMES.find((t) => t.id === row.id);
								return {
									...row,
									name: theme?.name ?? row.name,
									description: theme?.description ?? row.description
								};
							})
						: historiques;
				expect(attendues, table).toEqual(await snapshot(seeded, table));
			}
		} finally {
			await seeded.close();
		}
	});

	it('les valeurs typées passent intactes (jsonb, timestamptz, apostrophes, ordre de lignée)', async () => {
		const [easter] = await migrated.db
			.select()
			.from(schema.themes)
			.where(eq(schema.themes.id, 'easter'));
		expect(easter?.availableUntil?.getTime()).toBe(1777593600000);
		expect(easter?.preview).toEqual(THEME_SEED.find((x) => x.id === 'easter')?.preview);
		const expected = oathRowsFor(BUILTIN_OATHS);
		const parents = new Set<string>();
		for (const row of expected) {
			if (row.evolvesFrom) expect(parents.has(row.evolvesFrom), row.id).toBe(true);
			parents.add(row.id);
		}
		const [duelliste] = await migrated.db
			.select()
			.from(schema.oaths)
			.where(eq(schema.oaths.id, 'duelliste'));
		const source = expected.find((o) => o.id === 'duelliste');
		expect(duelliste?.lore).toBe(source?.lore);
		expect(duelliste?.branches).toEqual(source?.branches);
	});

	it('une base seulement migrée accepte un compte (thème par défaut) et un personnage', async () => {
		await migrated.db
			.insert(schema.accounts)
			.values({ id: 'a_neuf', pseudo: 'neuf', passwordHash: 'x' });
		await migrated.db
			.insert(schema.characters)
			.values({ id: 'p_neuf', name: 'Neuf', oathId: 'duelliste' });
		const [a] = await migrated.db
			.select()
			.from(schema.accounts)
			.where(eq(schema.accounts.id, 'a_neuf'));
		expect(a?.selectedTheme).toBe('dark');
	});

	it('seedDatabase après migration ne trouve rien à ajouter', async () => {
		expect(await seedDatabase(migrated.db, { oaths: BUILTIN_OATHS })).toEqual({
			themesInserted: 0,
			zonesInserted: 0,
			settingsInserted: 0,
			spawnSettingsInserted: 0,
			oathsInserted: 0
		});
	});

	it('checkReferentials signale une base sans référentiels', async () => {
		const empty = await createTestDb({ referentials: false });
		try {
			const problems = await checkReferentials(empty.db);
			expect(problems).toEqual(
				expect.arrayContaining([
					'thème « dark » absent',
					'thème « light » absent',
					'aucun Serment natif',
					`réglage « ${SETTING_KEYS.contactText} » absent`,
					'ligne spawn_settings (id = 1) absente'
				])
			);
		} finally {
			await empty.close();
		}
	});
});
