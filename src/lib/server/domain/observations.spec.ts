import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import {
	accounts,
	beasts,
	beastObservations,
	staffLog,
	auditLog,
	publications
} from '../db/schema';
import type { Actor, Role } from '../permissions';
import {
	proposeObservation,
	validateObservation,
	rejectObservation,
	listObservations,
	listPendingObservations
} from './observations';
import { getBeast } from './beasts';
describe('Observations — intégration PGlite', () => {
	let test: TestDb;
	const actor = (role: Role): Actor => ({
		accountId: `test_${role}`,
		role,
		pseudo: role,
		characterId: null
	});
	beforeAll(async () => {
		test = await createTestDb();
		await test.db.insert(accounts).values(
			['joueur', 'mj', 'designer', 'admin'].map((role) => ({
				id: `test_${role}`,
				role: role as Role,
				pseudo: role,
				passwordHash: 'test'
			}))
		);
		await test.db.insert(beasts).values([
			{ id: 'visible', name: 'Visible' },
			{ id: 'hidden', name: 'Masquée', hidden: true }
		]);
	}, 30000);
	afterAll(async () => {
		await test?.close();
	});
	for (const role of ['joueur', 'mj', 'designer', 'admin'] as const)
		it(`tout compte ${role} peut proposer sans personnage relié`, async () => {
			const row = await proposeObservation(test.db, actor(role), {
				beastId: 'visible',
				text: `Observation ${role}`
			});
			expect(row.stamp).toBeNull();
			expect((await listObservations(test.db, 'visible')).some((o) => o.id === row.id)).toBe(false);
		});
	it('visiteur refusé, texte requis et limite 1 000', async () => {
		await expect(
			proposeObservation(test.db, null, { beastId: 'visible', text: 'x' })
		).rejects.toMatchObject({ status: 401 });
		for (const text of ['', 'x'.repeat(1001)])
			await expect(
				proposeObservation(test.db, actor('joueur'), { beastId: 'visible', text })
			).rejects.toMatchObject({ code: 'INVALID' });
		await expect(
			proposeObservation(test.db, actor('joueur'), { beastId: 'visible', text: 'x'.repeat(1000) })
		).resolves.toBeDefined();
		await expect(
			proposeObservation(test.db, actor('joueur'), { beastId: 'hidden', text: 'x' })
		).rejects.toMatchObject({ status: 404 });
	});
	for (const [name, command] of [
		['tamponner', validateObservation],
		['rejeter', rejectObservation]
	] as const) {
		it(`${name} : visiteur et joueur refusés`, async () => {
			for (const a of [null, actor('joueur')]) {
				await expect(
					command(test.db, a, { id: 'x', motif: 'x', expectedRevision: 1 })
				).rejects.toMatchObject({ status: a ? 403 : 401 });
				await expect(listPendingObservations(test.db, a)).rejects.toMatchObject({
					status: a ? 403 : 401
				});
			}
		});
		for (const role of ['mj', 'designer', 'admin'] as const)
			it(`${name} par ${role} : révision, motif, tampon et visibilité`, async () => {
				const row = await proposeObservation(test.db, actor('joueur'), {
					beastId: 'visible',
					text: `${name} ${role}`
				});
				expect(
					(await listPendingObservations(test.db, actor(role))).some((o) => o.id === row.id)
				).toBe(true);
				await expect(
					command(test.db, actor(role), { id: row.id, motif: 'Vu sur Discord' })
				).rejects.toMatchObject({ status: 428 });
				await expect(
					command(test.db, actor(role), {
						id: row.id,
						motif: 'Vu sur Discord',
						expectedRevision: 999
					})
				).rejects.toMatchObject({ status: 409 });
				await expect(
					command(test.db, actor(role), { id: row.id, motif: '', expectedRevision: 1 })
				).rejects.toMatchObject({ code: 'INVALID' });
				const result = await command(test.db, actor(role), {
					id: row.id,
					motif: 'Vu sur Discord',
					expectedRevision: 1
				});
				expect(result.revision).toBe(2);
				expect(result.stamp?.name).toBe(role);
				const [stored] = await test.db
					.select()
					.from(beastObservations)
					.where(eq(beastObservations.id, row.id));
				expect(stored.validatedBy).toBe(actor(role).accountId);
				expect(stored.validatedAt).toBeInstanceOf(Date);
				expect(
					(await getBeast(test.db, null, 'visible')).observations.some((o) => o.id === row.id)
				).toBe(name === 'tamponner');
				await expect(
					command(test.db, actor(role), { id: row.id, motif: 'Rejeu', expectedRevision: 2 })
				).rejects.toMatchObject({ status: 409 });
				expect(
					(await test.db.select().from(auditLog)).some(
						(log) => log.details.id === row.id && log.details.motif === 'Vu sur Discord'
					)
				).toBe(true);
			});
	}
	it('publication rayée : observation retirée du public', async () => {
		await test.db.insert(publications).values({ id: 'struck', text: 'Récit', struck: true });
		await test.db.insert(beastObservations).values({
			id: 'struck_obs',
			beastId: 'visible',
			text: 'Rayée',
			status: 'validated',
			publicationId: 'struck'
		});
		expect((await listObservations(test.db, 'visible')).some((o) => o.id === 'struck_obs')).toBe(
			false
		);
	});
	it('proposition et deux décisions : rollback complet si audit impossible', async () => {
		const row = await proposeObservation(test.db, actor('joueur'), {
			beastId: 'visible',
			text: 'Rollback'
		});
		const before = await test.db.select().from(beastObservations);
		const logs = await test.db.select().from(staffLog);
		await test.db.execute(
			sql`CREATE FUNCTION reject_obs_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit indisponible'; END $$`
		);
		await test.db.execute(
			sql`CREATE TRIGGER reject_obs_audit BEFORE INSERT ON audit_log FOR EACH ROW EXECUTE FUNCTION reject_obs_audit()`
		);
		try {
			await expect(
				proposeObservation(test.db, actor('joueur'), { beastId: 'visible', text: 'Perdue' })
			).rejects.toThrow();
			for (const command of [validateObservation, rejectObservation])
				await expect(
					command(test.db, actor('mj'), { id: row.id, motif: 'Perdu', expectedRevision: 1 })
				).rejects.toThrow();
		} finally {
			await test.db.execute(sql`DROP TRIGGER reject_obs_audit ON audit_log`);
		}
		expect(await test.db.select().from(beastObservations)).toEqual(before);
		expect(await test.db.select().from(staffLog)).toEqual(logs);
	});
});
