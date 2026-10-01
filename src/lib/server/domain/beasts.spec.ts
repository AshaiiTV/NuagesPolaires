import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import { accounts, beasts, beastZones, combats, staffLog, auditLog } from '../db/schema';
import type { Actor, Role } from '../permissions';
import {
	createBeast,
	updateBeast,
	duplicateBeast,
	setBeastHidden,
	archiveBeast,
	restoreBeast,
	getBeast,
	listBeasts
} from './beasts';
import type { BeastCommandInput } from '$lib/schemas/beasts';
import { bindRequestContext } from '../auth/context';

describe('Bestiaire — intégration PGlite', () => {
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
	}, 30000);
	afterAll(async () => {
		await test?.close();
	});
	it('filtre les créatures et ne sert jamais les notes hors calque', async () => {
		await test.db.insert(beasts).values([
			{ id: 'public', name: 'Alpha', adminNote: 'SECRET', extra: { adminNotes: 'SECRET' } },
			{ id: 'hidden', name: 'Hidden', hidden: true },
			{ id: 'archived', name: 'Archived', archived: true }
		]);
		for (const reader of [null, actor('joueur')]) {
			expect((await listBeasts(test.db, reader)).map((b) => b.id)).toEqual(['public']);
			expect(JSON.stringify(await getBeast(test.db, reader, 'public'))).not.toContain('SECRET');
			for (const id of ['hidden', 'archived'])
				await expect(getBeast(test.db, reader, id)).rejects.toMatchObject({ status: 404 });
		}
		for (const role of ['mj', 'designer', 'admin'] as const) {
			expect((await listBeasts(test.db, actor(role))).length).toBe(3);
			expect((await getBeast(test.db, actor(role), 'public')).reserved?.adminNote).toBe('SECRET');
		}
	});
	const commands: [string, (a: Actor | null, input: BeastCommandInput) => Promise<unknown>][] = [
		['modifier', (a, i) => updateBeast(test.db, a, { ...i, subtitle: 'Modifié' })],
		['dupliquer', (a, i) => duplicateBeast(test.db, a, i)],
		['masquer', (a, i) => setBeastHidden(test.db, a, { ...i, hidden: true })],
		['archiver', (a, i) => archiveBeast(test.db, a, i)],
		['restaurer', (a, i) => restoreBeast(test.db, a, i)]
	];
	for (const [name, command] of commands) {
		it(`${name} : refuse visiteur, joueur et MJ`, async () => {
			for (const a of [null, actor('joueur'), actor('mj')])
				await expect(command(a, { id: 'public', expectedRevision: 1 })).rejects.toMatchObject({
					status: a ? 403 : 401
				});
		});
		for (const role of ['designer', 'admin'] as const)
			it(`${name} : ${role}, révision requise et conflit`, async () => {
				const row = await createBeast(test.db, actor(role), { name: `${name} ${role}` });
				await expect(command(actor(role), { id: row.id })).rejects.toMatchObject({ status: 428 });
				await expect(
					command(actor(role), { id: row.id, expectedRevision: 999 })
				).rejects.toMatchObject({ status: 409 });
				await expect(
					command(actor(role), { id: row.id, expectedRevision: row.revision })
				).resolves.toBeDefined();
			});
	}
	it('créer : permissions, validations et bornes', async () => {
		for (const a of [null, actor('joueur'), actor('mj')])
			await expect(createBeast(test.db, a, { name: 'Refus' })).rejects.toMatchObject({
				status: a ? 403 : 401
			});
		for (const input of [
			{ name: '' },
			{ name: 'x'.repeat(81) },
			{ name: 'x', level: 0 },
			{ name: 'x', pv: 0 },
			{ name: 'x', ep: -1 },
			{ name: 'x', qtyMin: 4, qtyMax: 2 },
			{ name: 'x', spawnWeight: -1 },
			{ name: 'x', imageUrl: 'javascript:alert(1)' },
			{ name: 'x', tags: Array(25).fill('x') },
			{ name: 'x', statuses: Array(65).fill('x') }
		])
			await expect(createBeast(test.db, actor('admin'), input)).rejects.toMatchObject({
				code: 'INVALID'
			});
	});
	it('recherche, tri et filtre de zone sont appliqués côté serveur', async () => {
		await test.db.insert(beasts).values([
			{ id: 'search_z', name: 'Zèbre unique', behavior: 'Gibier', level: 2 },
			{ id: 'search_a', name: 'Antilope unique', behavior: 'Gibier', level: 7 }
		]);
		const zone = (
			await test.db
				.select()
				.from((await import('../db/schema')).zones)
				.limit(1)
		)[0];
		await test.db.insert(beastZones).values({ beastId: 'search_a', zoneId: zone.id });
		expect(
			(
				await listBeasts(test.db, null, {
					search: 'UNIQUE',
					behavior: 'Gibier',
					sort: 'level_desc'
				})
			).map((b) => b.id)
		).toEqual(['search_a', 'search_z']);
		expect(
			(await listBeasts(test.db, null, { search: 'unique', zoneId: zone.id })).map((b) => b.id)
		).toEqual(['search_a']);
		expect(await listBeasts(test.db, null, { search: '%' })).toEqual([]);
	});
	it('duplique les zones en conservant la visibilité sans copier les observations', async () => {
		const copy = await duplicateBeast(test.db, actor('designer'), {
			id: 'search_a',
			expectedRevision: 1
		});
		expect(copy.reserved).toMatchObject({ hidden: false, archived: false });
		expect(copy.zones).toHaveLength(1);
		expect(copy.observations).toEqual([]);
	});
	it('usage réservé : récits terminés, morts, date, plusieurs adversaires', async () => {
		await test.db.insert(combats).values([
			{
				id: 'usage',
				status: 'termine',
				name: 'Récit',
				savedAt: new Date('2026-09-30T12:00:00Z'),
				state: {
					fighters: [
						{ type: 'beast', bid: 'public', pvCur: 0 },
						{ type: 'beast', beastId: 'public', pvCur: 5 }
					]
				}
			},
			{ id: 'draft', state: { fighters: [{ type: 'beast', bid: 'public', pvCur: 0 }] } }
		]);
		expect((await getBeast(test.db, actor('mj'), 'public')).reserved?.usage).toMatchObject({
			uses: 2,
			deaths: 1,
			lastAt: '2026-09-30T12:00:00.000Z'
		});
	});
	it('rollback de création et mise à jour si une zone manque', async () => {
		const before = await test.db.select().from(beasts);
		const logs = await test.db.select().from(staffLog);
		await expect(
			createBeast(test.db, actor('admin'), { name: 'Rollback', zones: ['absente'] })
		).rejects.toMatchObject({ code: 'INVALID' });
		expect(await test.db.select().from(beasts)).toEqual(before);
		await expect(
			updateBeast(test.db, actor('admin'), {
				id: 'search_a',
				expectedRevision: 1,
				name: 'Perdu',
				zones: ['absente']
			})
		).rejects.toMatchObject({ code: 'INVALID' });
		expect((await getBeast(test.db, null, 'search_a')).name).toBe('Antilope unique');
		expect(await test.db.select().from(staffLog)).toEqual(logs);
	});
	it('rollback total si le journal échoue après la mutation', async () => {
		await test.db.execute(
			sql`CREATE FUNCTION reject_reference_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit indisponible'; END $$`
		);
		await test.db.execute(
			sql`CREATE TRIGGER reject_reference_audit BEFORE INSERT ON audit_log FOR EACH ROW EXECUTE FUNCTION reject_reference_audit()`
		);
		const logs = await test.db.select().from(staffLog);
		const audits = await test.db.select().from(auditLog);
		try {
			await expect(createBeast(test.db, actor('admin'), { name: 'Perdue' })).rejects.toThrow();
			for (const [, command] of commands)
				await expect(
					command(actor('admin'), { id: 'public', expectedRevision: 1 })
				).rejects.toThrow();
			await expect(
				updateBeast(test.db, actor('admin'), { id: 'public', expectedRevision: 1, name: 'Perdu' })
			).rejects.toThrow();
		} finally {
			await test.db.execute(sql`DROP TRIGGER reject_reference_audit ON audit_log`);
		}
		expect((await getBeast(test.db, null, 'public')).name).toBe('Alpha');
		expect(await test.db.select().from(staffLog)).toEqual(logs);
		expect(await test.db.select().from(auditLog)).toEqual(audits);
	});
	it('valide les quantités sur une modification partielle et accepte un poids nul', async () => {
		await expect(
			updateBeast(test.db, actor('admin'), { id: 'public', expectedRevision: 1, qtyMin: 4 })
		).rejects.toMatchObject({ code: 'INVALID' });
		const row = await createBeast(test.db, actor('admin'), { name: 'Poids nul', spawnWeight: 0 });
		expect(row.revision).toBe(1);
	});
	it('relit le rôle du compte dans la transaction', async () => {
		await test.db.update(accounts).set({ role: 'joueur' }).where(eq(accounts.id, 'test_designer'));
		await expect(
			createBeast(test.db, actor('designer'), { name: 'Interdit' })
		).rejects.toMatchObject({ status: 401 });
	});
	it('refuse une session révoquée et garde les métadonnées de requête dans l’audit', async () => {
		const a = actor('admin');
		bindRequestContext(a, {
			sessionId: 'session_supprimee',
			sessionVersion: 0,
			ip: '127.0.0.1',
			origin: 'https://example.test',
			userAgent: 'Vitest'
		});
		await expect(createBeast(test.db, a, { name: 'Refusée' })).rejects.toMatchObject({
			status: 401
		});
		const fresh = actor('admin');
		bindRequestContext(fresh, {
			sessionId: null,
			sessionVersion: 0,
			ip: '127.0.0.1',
			origin: 'https://example.test',
			userAgent: 'Vitest'
		});
		const row = await createBeast(test.db, fresh, { name: 'Métadonnées' });
		const audit = (await test.db.select().from(auditLog)).find(
			(entry) => entry.details.id === row.id
		);
		expect(audit).toMatchObject({
			ip: '127.0.0.1',
			origin: 'https://example.test',
			userAgent: 'Vitest'
		});
	});
});
