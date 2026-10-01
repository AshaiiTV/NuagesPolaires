import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import { accounts, oaths, characters, characterHistory, staffLog } from '../db/schema';
import type { Actor, Role } from '../permissions';
import { BUILTIN_OATHS } from '$lib/game/oaths';
import {
	createOath,
	updateOath,
	setOathHidden,
	listOaths,
	getOath,
	ensureBuiltinOaths,
	tiersFor
} from './oaths';
describe('Serments — intégration PGlite', () => {
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
	it('catalogue semé et idempotent ; jamais écrasé ni complété après administration', async () => {
		await test.db.delete(oaths);
		await ensureBuiltinOaths(test.db);
		expect(await test.db.select().from(oaths)).toHaveLength(BUILTIN_OATHS.length);
		await test.db.update(oaths).set({ lore: 'La base fait foi.' }).where(eq(oaths.id, 'duelliste'));
		await ensureBuiltinOaths(test.db);
		expect((await getOath(test.db, null, 'duelliste')).lore).toBe('La base fait foi.');
		await test.db.delete(oaths).where(eq(oaths.id, 'claymore'));
		await ensureBuiltinOaths(test.db);
		expect(await test.db.select().from(oaths)).toHaveLength(BUILTIN_OATHS.length - 1);
	});
	it('cachés et rangs hors vitrine absents pour visiteur, joueur, MJ et designer', async () => {
		for (const a of [null, actor('joueur'), actor('mj'), actor('designer')]) {
			expect((await listOaths(test.db, a)).some((o) => o.id === 'bretteur')).toBe(false);
			await expect(getOath(test.db, a, 'bretteur')).rejects.toMatchObject({ status: 404 });
			expect((await getOath(test.db, a, 'duelliste')).reserved).toBeNull();
		}
		expect((await getOath(test.db, actor('admin'), 'bretteur')).reserved?.hidden).toBe(true);
		expect(
			(await listOaths(test.db, actor('admin'), { rank: 'seasoned' })).every(
				(o) => o.rank === 'seasoned'
			)
		).toBe(true);
		expect(
			(await listOaths(test.db, null, { category: 'magie' })).every((o) => o.category === 'magie')
		).toBe(true);
	});
	it('paliers publics et Aguerris avec niveaux requis, aucun sans branche', async () => {
		const basic = await getOath(test.db, null, 'Duelliste');
		expect(basic.branches[0].tiers.map((t) => t.level)).toEqual([2, 5, 7, 10]);
		expect(tiersFor(basic, basic.branches[0].label, 5).reached.map((t) => t.level)).toEqual([2, 5]);
		expect(tiersFor(basic, basic.branches[0].label, 5).next[0].level).toBe(7);
		expect(tiersFor(basic, 'Aucune', 20)).toEqual({ reached: [], next: [] });
		const seasoned = await getOath(test.db, actor('admin'), 'bretteur');
		expect(seasoned.branches[0].tiers.map((t) => t.level)).toEqual([10, 13, 16, 20]);
		expect(tiersFor(BUILTIN_OATHS[0], BUILTIN_OATHS[0].branches.bA!.nom, 10).next).toEqual([]);
	});
	it('toutes les mutations réservées à admin', async () => {
		for (const a of [null, actor('joueur'), actor('mj'), actor('designer')]) {
			await expect(createOath(test.db, a, { name: 'Refus' })).rejects.toMatchObject({
				status: a ? 403 : 401
			});
			await expect(
				updateOath(test.db, a, { id: 'duelliste', motif: 'x', expectedRevision: 1 })
			).rejects.toMatchObject({ status: a ? 403 : 401 });
			await expect(
				setOathHidden(test.db, a, { id: 'duelliste', hidden: true, expectedRevision: 1 })
			).rejects.toMatchObject({ status: a ? 403 : 401 });
		}
	});
	it('création custom, bornes, doublons et lignée sans boucle', async () => {
		const row = await createOath(test.db, actor('admin'), {
			name: 'Nouvelle voie',
			evolvesFrom: 'duelliste'
		});
		expect(row.growth).toEqual({ pvN: 3, epN: 5, emN: 2 });
		expect(row.rank).toBe('singular');
		expect(row.lineage).toBe('Duelliste');
		await expect(
			createOath(test.db, actor('admin'), { name: 'Nouvelle voie' })
		).rejects.toMatchObject({ code: 'INVALID' });
		await expect(
			createOath(test.db, actor('admin'), { name: 'x', baseDamage: -1 })
		).rejects.toMatchObject({ code: 'INVALID' });
		await expect(
			updateOath(test.db, actor('admin'), {
				id: 'duelliste',
				evolvesFrom: row.id,
				motif: 'x',
				expectedRevision: 1
			})
		).rejects.toMatchObject({ code: 'INVALID' });
	});
	for (const [name, command] of [
		[
			'modifier',
			(revision?: number) =>
				updateOath(test.db, actor('admin'), {
					id: 'nouvelle-voie',
					lore: 'Texte',
					motif: 'Correction',
					expectedRevision: revision
				})
		],
		[
			'masquer',
			(revision?: number) =>
				setOathHidden(test.db, actor('admin'), {
					id: 'nouvelle-voie',
					hidden: true,
					expectedRevision: revision
				})
		]
	] as const)
		it(`${name} exige révision et refuse un conflit`, async () => {
			await expect(command()).rejects.toMatchObject({ status: 428 });
			await expect(command(999)).rejects.toMatchObject({ status: 409 });
			const row = await getOath(test.db, actor('admin'), 'nouvelle-voie');
			expect((await command(row.revision)).revision).toBe(row.revision + 1);
		});
	it('synchronise les porteurs et conserve les conséquences brutes motivées', async () => {
		const row = await getOath(test.db, actor('admin'), 'duelliste');
		await test.db
			.insert(characters)
			.values({
				id: 'carrier',
				name: 'Porteur',
				oathId: row.id,
				level: 3,
				weapon: 'Ancienne arme',
				branch: row.branches[0].label,
				pvMax: 100,
				pvCur: 90
			});
		const branches = { bA: { nom: 'Branche renommée', paliers: [] }, bB: null };
		await updateOath(test.db, actor('admin'), {
			id: row.id,
			expectedRevision: row.revision,
			motif: 'Correction du Serment',
			weapon: '<arme>',
			growth: { pvN: 2, epN: 3, emN: 4 },
			branches
		});
		const [carrier] = await test.db.select().from(characters).where(eq(characters.id, 'carrier'));
		expect(carrier).toMatchObject({
			weapon: '<arme>',
			branch: 'Branche renommée',
			pvMax: 34,
			pvCur: 34,
			revision: 2
		});
		const history = await test.db.select().from(characterHistory);
		expect(
			history.every(
				(h) =>
					h.motif === 'Correction du Serment' &&
					h.actorRole === 'admin' &&
					h.oldValue !== null &&
					h.newValue !== null
			)
		).toBe(true);
		expect(history.some((h) => h.text.includes('<arme>'))).toBe(true);
	});
	it('rollback du Serment, des fiches, conséquences et journal si audit impossible', async () => {
		const old = await test.db.select().from(oaths);
		const carriers = await test.db.select().from(characters);
		const history = await test.db.select().from(characterHistory);
		const logs = await test.db.select().from(staffLog);
		const row = await getOath(test.db, actor('admin'), 'duelliste');
		await test.db.execute(
			sql`CREATE FUNCTION reject_oath_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit indisponible'; END $$`
		);
		await test.db.execute(
			sql`CREATE TRIGGER reject_oath_audit BEFORE INSERT ON audit_log FOR EACH ROW EXECUTE FUNCTION reject_oath_audit()`
		);
		try {
			await expect(
				updateOath(test.db, actor('admin'), {
					id: row.id,
					expectedRevision: row.revision,
					weapon: 'Perdu',
					motif: 'Perdu'
				})
			).rejects.toThrow();
			await expect(createOath(test.db, actor('admin'), { name: 'Perdu' })).rejects.toThrow();
			await expect(
				setOathHidden(test.db, actor('admin'), {
					id: row.id,
					expectedRevision: row.revision,
					hidden: true
				})
			).rejects.toThrow();
		} finally {
			await test.db.execute(sql`DROP TRIGGER reject_oath_audit ON audit_log`);
		}
		expect(await test.db.select().from(oaths)).toEqual(old);
		expect(await test.db.select().from(characters)).toEqual(carriers);
		expect(await test.db.select().from(characterHistory)).toEqual(history);
		expect(await test.db.select().from(staffLog)).toEqual(logs);
	});
});
