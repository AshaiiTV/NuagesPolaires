import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import { accounts, zones, beasts, beastZones, staffLog } from '../db/schema';
import type { Actor, Role } from '../permissions';
import { createZone, renameZone, listZones } from './zones';
describe('Zones — intégration PGlite', () => {
	let test: TestDb;
	const actor = (role: Role): Actor => ({
		accountId: `test_${role}`,
		role,
		pseudo: role,
		characterId: null
	});
	beforeAll(async () => {
		test = await createTestDb();
		await test.db
			.insert(accounts)
			.values(
				['joueur', 'mj', 'designer', 'admin'].map((role) => ({
					id: `test_${role}`,
					role: role as Role,
					pseudo: role,
					passwordHash: 'test'
				}))
			);
	}, 30000);
	afterAll(async () => {
		await test?.close();
	});
	it('lecture publique pour tous les rôles', async () => {
		for (const a of [null, actor('joueur'), actor('mj'), actor('designer'), actor('admin')])
			expect(await listZones(test.db, a)).toHaveLength(5);
	});
	it('refuse création et renommage au visiteur, joueur et MJ', async () => {
		for (const a of [null, actor('joueur'), actor('mj')]) {
			await expect(createZone(test.db, a, { name: 'Ruines' })).rejects.toMatchObject({
				status: a ? 403 : 401
			});
			await expect(
				renameZone(test.db, a, { id: 'x', name: 'Ruines', expectedRevision: 1 })
			).rejects.toMatchObject({ status: a ? 403 : 401 });
		}
	});
	for (const role of ['designer', 'admin'] as const)
		it(`création et renommage ${role}, révisions et liens stables`, async () => {
			const row = await createZone(test.db, actor(role), { name: `Ruines ${role}` });
			await test.db.insert(beasts).values({ id: role, name: role });
			await test.db.insert(beastZones).values({ beastId: role, zoneId: row.id });
			await expect(
				renameZone(test.db, actor(role), { id: row.id, name: 'x' })
			).rejects.toMatchObject({ status: 428 });
			await expect(
				renameZone(test.db, actor(role), { id: row.id, name: 'x', expectedRevision: 999 })
			).rejects.toMatchObject({ status: 409 });
			const updated = await renameZone(test.db, actor(role), {
				id: row.id,
				name: `Nouveau ${role}`,
				expectedRevision: 1
			});
			expect(updated.revision).toBe(2);
			expect(updated.id).toBe(row.id);
			expect((await test.db.select().from(beastZones)).some((link) => link.zoneId === row.id)).toBe(
				true
			);
		});
	it('nom requis et doublon refusé', async () => {
		await expect(createZone(test.db, actor('admin'), { name: ' ' })).rejects.toMatchObject({
			code: 'INVALID',
			message: 'Nom de zone requis.'
		});
		await createZone(test.db, actor('admin'), { name: 'Unique' });
		await expect(createZone(test.db, actor('admin'), { name: 'Unique' })).rejects.toMatchObject({
			code: 'INVALID'
		});
	});
	it('mutation et journal annulés si audit impossible', async () => {
		await test.db.execute(
			sql`CREATE FUNCTION reject_zone_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit indisponible'; END $$`
		);
		await test.db.execute(
			sql`CREATE TRIGGER reject_zone_audit BEFORE INSERT ON audit_log FOR EACH ROW EXECUTE FUNCTION reject_zone_audit()`
		);
		const rows = await test.db.select().from(zones);
		const logs = await test.db.select().from(staffLog);
		try {
			await expect(createZone(test.db, actor('admin'), { name: 'Perdue' })).rejects.toThrow();
			await expect(
				renameZone(test.db, actor('admin'), {
					id: rows[0].id,
					name: 'Perdu',
					expectedRevision: rows[0].revision
				})
			).rejects.toThrow();
		} finally {
			await test.db.execute(sql`DROP TRIGGER reject_zone_audit ON audit_log`);
		}
		expect(await test.db.select().from(zones)).toEqual(rows);
		expect(await test.db.select().from(staffLog)).toEqual(logs);
	});
});
