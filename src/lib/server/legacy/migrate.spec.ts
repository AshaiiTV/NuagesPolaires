import { afterEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import * as s from '../db/schema';
import { readSnapshot, makeSnapshot, type Snapshot } from './snapshot';
import { migrateSnapshot } from './migrate';
import { normalizeCharacter, normalizeOaths, object } from './normalize';
import { renderReport } from './report';
import { spawnTotals, spawnHistory } from '../domain/spawn';
import { spawnSync } from 'node:child_process';

let test: TestDb;
afterEach(async () => {
	if (test) await test.close();
});
async function setup() {
	test = await createTestDb();
	return readSnapshot('tests/fixtures/np-store-demo.json');
}
function change(snapshot: Snapshot, key: string, fn: (value: unknown) => unknown): Snapshot {
	return makeSnapshot(
		snapshot.rows.map((r) =>
			r.key === key ? { ...r, value: JSON.stringify(fn(JSON.parse(r.value))) } : r
		),
		snapshot.exportedAt
	);
}
describe('migration complète transactionnelle', () => {
	it('importe le fixture, relit les projections, homonymes, objets locaux et archives', async () => {
		const snapshot = await setup(),
			report = await migrateSnapshot(test.db, snapshot, { dryRun: false });
		expect(report.checks.every((c) => c.passed)).toBe(true);
		expect(report.anomalies.map((a) => a.code)).toEqual(
			expect.arrayContaining(['HOMONYM', 'OWNER_QUARANTINE', 'RAW_ARCHIVE', 'UNKNOWN_OATH'])
		);
		expect(await test.db.select().from(s.accounts)).toHaveLength(8);
		const source = new Map(snapshot.rows.map((r) => [r.key, JSON.parse(r.value) as unknown]));
		const catalogue = normalizeOaths(source.get('serments_custom'));
		for (const raw of (source.get('players') as unknown[]).filter(Boolean)) {
			const c = normalizeCharacter(raw, catalogue);
			const [row] = await test.db.select().from(s.characters).where(eq(s.characters.id, c.row.id));
			expect(row).toMatchObject(c.row);
			expect(
				await test.db
					.select()
					.from(s.characterHistory)
					.where(eq(s.characterHistory.characterId, c.row.id))
			).toHaveLength(c.history.length);
		}
		const items = await test.db
			.select()
			.from(s.characterItems)
			.where(eq(s.characterItems.legacyId, 'potion'));
		expect(items).toHaveLength(3);
		expect(new Set(items.map((i) => i.id)).size).toBe(3);
		expect((await test.db.select().from(s.oaths).where(eq(s.oaths.id, 'mizu')))[0]).toMatchObject({
			pvGrowth: 0,
			epGrowth: 0,
			emGrowth: 0,
			hidden: true,
			isBuiltin: false
		});
		expect(await test.db.select().from(s.combats)).toHaveLength(6);
		const historyCombat = (
			await test.db
				.select()
				.from(s.characterHistory)
				.where(eq(s.characterHistory.characterId, 'fixture_p_1'))
		).find((h) => h.type === 'combat');
		expect(historyCombat?.combatId).toBe(
			(await test.db.select().from(s.combats)).find((c) => c.name === 'Détail prioritaire')?.id
		);
		expect(
			(await test.db.select().from(s.combats)).find((c) => c.name === 'Détail prioritaire')?.state
				.schemaVersion
		).toBe(2);
		expect(
			(await test.db.select().from(s.combats)).find((c) => c.ownerLabel === 'Orphelin')
				?.ownerAccountId
		).toBeNull();
		expect(await test.db.select().from(s.spawnCounters)).toHaveLength(2);
		expect((await test.db.select().from(s.spawnSettings))[0].migratedTotalDraws).toBe(56);
		const admin = {
			accountId: 'fixture_a_0',
			pseudo: 'Admin',
			role: 'admin' as const,
			characterId: 'fixture_p_0'
		};
		expect(await spawnTotals(test.db, admin)).toEqual({
			totals: { fixture_b_0: 12, fixture_b_1: 7 },
			totalDraws: 57
		});
		expect(await spawnHistory(test.db, admin)).toHaveLength(1);
		expect(await test.db.select().from(s.journalEntries)).toHaveLength(8);
		expect(await test.db.select().from(s.staffLogArchives)).toHaveLength(1);
		expect(await test.db.select().from(s.beastZones)).toHaveLength(24);
		expect(
			(await test.db.select().from(s.accountThemeGrants)).some(
				(g) => g.accountId === 'fixture_a_2' && g.themeId === 'halloween'
			)
		).toBe(true);
		expect(renderReport(report)).toContain('HOMONYM');
		expect(renderReport(report)).not.toContain('pbkdf2:');
	}, 30000);
	it('deuxième passe : zéro écriture, y compris registre, journal et audit', async () => {
		const snapshot = await setup();
		await migrateSnapshot(test.db, snapshot, { dryRun: false });
		const before = {
			registry: await test.db.select().from(s.migrationRegistry),
			staff: await test.db.select().from(s.staffLog),
			audit: await test.db.select().from(s.auditLog),
			accounts: await test.db.select().from(s.accounts)
		};
		const report = await migrateSnapshot(test.db, snapshot, { dryRun: false });
		expect(report.writes).toBe(0);
		expect(Object.values(report.tables).every((c) => c.arbitration === 0)).toBe(true);
		expect({
			registry: await test.db.select().from(s.migrationRegistry),
			staff: await test.db.select().from(s.staffLog),
			audit: await test.db.select().from(s.auditLog),
			accounts: await test.db.select().from(s.accounts)
		}).toEqual(before);
	}, 30000);
	it('source modifiée et cible éditée ne sont jamais écrasées', async () => {
		const snapshot = await setup();
		await migrateSnapshot(test.db, snapshot, { dryRun: false });
		await test.db
			.update(s.characters)
			.set({ xp: 23, revision: 2, journal: 'Écrit après import' })
			.where(eq(s.characters.id, 'fixture_p_1'));
		const changed = change(snapshot, 'players', (v) =>
			(v as unknown[]).map((raw) =>
				object(raw).id === 'fixture_p_1'
					? { ...object(raw), xp: 999, inventory: [{ id: 'nouveau', name: 'Nouveau' }] }
					: raw
			)
		);
		const report = await migrateSnapshot(test.db, changed, { dryRun: false });
		expect(report.tables.characters.arbitration).toBe(1);
		expect(
			(await test.db.select().from(s.characters).where(eq(s.characters.id, 'fixture_p_1')))[0]
		).toMatchObject({ xp: 23, revision: 2, journal: 'Écrit après import' });
		expect(
			(await test.db.select().from(s.characterItems)).some((i) => i.legacyId === 'nouveau')
		).toBe(false);
	}, 30000);
	it('dry-run vérifie réellement puis annule cibles, registre, journal, audit', async () => {
		const snapshot = await setup(),
			report = await migrateSnapshot(test.db, snapshot, { dryRun: true });
		expect(report.writes).toBeGreaterThan(0);
		expect(report.checks.every((c) => c.passed)).toBe(true);
		for (const table of [
			s.accounts,
			s.characters,
			s.migrationRegistry,
			s.staffLog,
			s.auditLog,
			s.spawnRuns
		])
			expect(await test.db.select().from(table)).toHaveLength(0);
		expect((await test.db.select().from(s.spawnSettings))[0].migratedTotalDraws).toBe(0);
	}, 30000);
	it('panne SQL au milieu : rollback total, puis reprise complète', async () => {
		const snapshot = await setup();
		await test.db.execute(
			sql.raw(
				"CREATE FUNCTION fixture_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Panne fictive'; END $$"
			)
		);
		await test.db.execute(
			sql.raw(
				'CREATE TRIGGER fixture_failure BEFORE INSERT ON audit_log FOR EACH ROW EXECUTE FUNCTION fixture_fail()'
			)
		);
		await expect(migrateSnapshot(test.db, snapshot, { dryRun: false })).rejects.toThrow();
		for (const table of [
			s.accounts,
			s.characters,
			s.beasts,
			s.migrationRegistry,
			s.staffLog,
			s.staffLogArchives
		])
			expect(await test.db.select().from(table)).toHaveLength(0);
		await test.db.execute(sql.raw('DROP TRIGGER fixture_failure ON audit_log'));
		expect(
			(await migrateSnapshot(test.db, snapshot, { dryRun: false })).checks.every((c) => c.passed)
		).toBe(true);
	}, 30000);
	it('snapshot corrompu refusé avant toute écriture', async () => {
		const snapshot = await setup();
		snapshot.rows[0].value = '[]';
		await expect(migrateSnapshot(test.db, snapshot, { dryRun: false })).rejects.toMatchObject({
			code: 'CHECKSUM_MISMATCH'
		});
		expect(await test.db.select().from(s.migrationRegistry)).toHaveLength(0);
	}, 30000);
	it('players null toléré et propriétaires homonymes en quarantaine', async () => {
		let snapshot = await setup();
		snapshot = change(snapshot, 'combat_arc_Alice', () => [
			{ id: 'ambiguous', name: 'Ambigu', fighters: [] }
		]);
		snapshot = makeSnapshot(
			[
				...snapshot.rows.filter((r) => r.key !== 'combat_arc_Alice'),
				{
					key: 'combat_arc_Homonyme',
					value: JSON.stringify([{ id: 'ambiguous', name: 'Ambigu' }]),
					updated_at: null
				}
			],
			snapshot.exportedAt
		);
		const report = await migrateSnapshot(test.db, snapshot, { dryRun: false });
		expect(
			report.anomalies.some(
				(a) => a.code === 'OWNER_QUARANTINE' && a.sourceKey === 'combat_arc_Homonyme'
			)
		).toBe(true);
		expect(
			(await test.db.select().from(s.combats)).find((c) => c.name === 'Ambigu')?.ownerAccountId
		).toBeNull();
		const nullSnapshot = makeSnapshot([{ key: 'players', value: 'null', updated_at: null }]);
		const nullReport = await migrateSnapshot(test.db, nullSnapshot, { dryRun: true });
		expect(nullReport.tables.characters).toBeUndefined();
	}, 30000);
	it('catalogue semé déjà édité : aucune surcharge de migration', async () => {
		const snapshot = await setup();
		await test.db
			.update(s.oaths)
			.set({ pvGrowth: 99, revision: 2 })
			.where(eq(s.oaths.id, 'duelliste'));
		await test.db
			.update(s.themes)
			.set({ name: 'Édité', revision: 2 })
			.where(eq(s.themes.id, 'halloween'));
		const report = await migrateSnapshot(test.db, snapshot, { dryRun: false });
		expect(report.tables.oaths.arbitration).toBe(1);
		expect(report.tables.themes.arbitration).toBe(1);
		expect(
			(await test.db.select().from(s.oaths).where(eq(s.oaths.id, 'duelliste')))[0].pvGrowth
		).toBe(99);
		expect(
			(await test.db.select().from(s.themes).where(eq(s.themes.id, 'halloween')))[0].name
		).toBe('Édité');
	}, 30000);
	it('même id chez deux propriétaires, alias du propriétaire et priorité détail/liste/index', async () => {
		let snapshot = await setup();
		const archive = { id: 'same', name: 'Liste', fighters: [], log: ['trace'] };
		snapshot = makeSnapshot(
			[
				...snapshot.rows.filter((r) => !r.key.startsWith('combat_arc_')),
				...Object.entries({
					combat_arc_Maitre: [archive],
					combat_arc_idx_Maitre: [{ ...archive, name: 'Index', _stub: true }],
					combat_arc_rec_Maitre__same: { ...archive, name: 'Détail' },
					combat_arc_fixture_a_3: [{ ...archive, name: 'Alias compte' }],
					combat_arc_Bob: [{ ...archive, name: 'Autre propriétaire' }]
				}).map(([key, value]) => ({ key, value: JSON.stringify(value), updated_at: null }))
			],
			snapshot.exportedAt
		);
		await migrateSnapshot(test.db, snapshot, { dryRun: false });
		const combats = await test.db.select().from(s.combats);
		expect(combats).toHaveLength(2);
		expect(combats.map((c) => c.name).sort()).toEqual(['Autre propriétaire', 'Détail']);
		expect(new Set(combats.map((c) => c.id)).size).toBe(2);
	}, 30000);
	it('collision de pseudo avec une cible non migrée : compte signalé et protégé', async () => {
		const snapshot = await setup();
		await test.db.insert(s.accounts).values({
			id: 'existing',
			pseudo: 'alice',
			passwordHash: 'hash-fictif',
			selectedTheme: 'dark'
		});
		const report = await migrateSnapshot(test.db, snapshot, { dryRun: false });
		expect(report.anomalies.some((a) => a.code === 'NATURAL_KEY_COLLISION')).toBe(true);
		expect(
			(await test.db.select().from(s.accounts).where(eq(s.accounts.id, 'existing')))[0].passwordHash
		).toBe('hash-fictif');
		expect(
			await test.db.select().from(s.accounts).where(eq(s.accounts.id, 'fixture_a_1'))
		).toHaveLength(0);
	}, 30000);
	it('renommages après import : une source identique ne recrée aucune archive ou inscription', async () => {
		const snapshot = await setup();
		await migrateSnapshot(test.db, snapshot, { dryRun: false });
		await test.db
			.update(s.accounts)
			.set({ pseudo: 'Maitre renommé', revision: 2 })
			.where(eq(s.accounts.id, 'fixture_a_3'));
		await test.db
			.update(s.characters)
			.set({ name: 'Alice renommée', revision: 2 })
			.where(eq(s.characters.id, 'fixture_p_1'));
		const report = await migrateSnapshot(test.db, snapshot, { dryRun: false });
		expect(report.writes).toBe(0);
		expect(await test.db.select().from(s.combats)).toHaveLength(6);
		expect(await test.db.select().from(s.eventParticipants)).toHaveLength(14);
	}, 30000);
	it('journal long et objet dupliqué : bruts conservés et anomalies explicites', async () => {
		let snapshot = await setup();
		snapshot = change(snapshot, 'players', (value) =>
			(value as unknown[]).map((raw) =>
				object(raw).id === 'fixture_p_0'
					? {
							...object(raw),
							journal: 'a'.repeat(20001),
							inventory: [
								{ id: 'potion', name: 'Première' },
								{ id: 'potion', name: 'Seconde' }
							]
						}
					: raw
			)
		);
		const report = await migrateSnapshot(test.db, snapshot, { dryRun: false });
		expect(report.anomalies.map((a) => a.code)).toEqual(
			expect.arrayContaining(['JOURNAL_TOO_LONG', 'DUPLICATE_ITEM'])
		);
		expect(
			(await test.db.select().from(s.characters).where(eq(s.characters.id, 'fixture_p_0')))[0]
				.journal
		).toHaveLength(20001);
		expect(
			(await test.db.select().from(s.characters).where(eq(s.characters.id, 'fixture_p_0')))[0].extra
				.legacyInventory
		).toHaveLength(2);
	}, 30000);
	it('CLI : écriture refusée sans NP_MIGRATE_CONFIRM=oui, avant toute ouverture de base', () => {
		const result = spawnSync(
			process.execPath,
			[
				'node_modules/tsx/dist/cli.mjs',
				'scripts/migrate-legacy.ts',
				'--input',
				'tests/fixtures/np-store-demo.json'
			],
			{
				encoding: 'utf8',
				env: {
					...process.env,
					NP_MIGRATE_CONFIRM: '',
					NP_DB_DRIVER: '',
					DATABASE_URL: '',
					NETLIFY_DATABASE_URL: ''
				}
			}
		);
		expect(result.status).toBe(1);
		expect(result.stderr).toContain('NP_MIGRATE_CONFIRM=oui');
		expect(result.stderr).not.toContain('sha256:');
	});
});
