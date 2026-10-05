import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import {
	accounts,
	auditLog,
	beasts,
	beastZones,
	characters,
	combats,
	oaths,
	scenes,
	sessions,
	spawnCounters,
	spawnRuns,
	spawnSettings,
	staffLog,
	zones
} from '../db/schema';
import type { Actor, Role } from '../permissions';
import { bindRequestContext } from '../auth/context';
import { drawEncounter } from '../../game/spawn';
import { drawSpawn, spawnHistory, spawnToTable, spawnTotals } from './spawn';

let testDb: TestDb;
const actor = (role: Role): Actor => {
	const actor: Actor = { accountId: `a_${role}`, pseudo: role, role, characterId: null };
	bindRequestContext(actor, {
		sessionId: `session_${role}`,
		sessionVersion: 0,
		ip: '',
		origin: '',
		userAgent: ''
	});
	return actor;
};
const mj = actor('mj');
beforeEach(async () => {
	testDb = await createTestDb();
	await testDb.db.insert(accounts).values(
		(['mj', 'admin', 'designer', 'joueur'] as const).map((role) => ({
			id: `a_${role}`,
			pseudo: role,
			role,
			passwordHash: 'fixture'
		}))
	);
	await testDb.db.insert(sessions).values(
		(['mj', 'admin'] as const).map((role) => ({
			id: `session_${role}`,
			accountId: `a_${role}`,
			sessionVersion: 0,
			expiresAt: new Date(Date.now() + 3600000)
		}))
	);
	await testDb.db.insert(zones).values({ id: 'z_test', name: 'Salon des brumes' });
	await testDb.db.insert(beasts).values([
		{ id: 'b_loup', name: 'Loup', spawnWeight: 10, qtyMin: 2, qtyMax: 2 },
		{ id: 'b_ours', name: 'Ours', spawnWeight: 10, qtyMin: 1, qtyMax: 1 },
		{ id: 'b_secret', name: 'Secret', hidden: true, spawnWeight: 1000 },
		{ id: 'b_archive', name: 'Archive', archived: true, spawnWeight: 1000 },
		{ id: 'b_zero', name: 'Poids nul', spawnWeight: 0 }
	]);
	await testDb.db.insert(beastZones).values(
		['b_loup', 'b_ours', 'b_secret', 'b_archive', 'b_zero'].map((beastId) => ({
			beastId,
			zoneId: 'z_test'
		}))
	);
	const [oath] = await testDb.db.select().from(oaths).limit(1);
	await testDb.db.insert(characters).values({ id: 'p_a', name: 'Alice', oathId: oath.id });
});
afterEach(async () => {
	await testDb?.close();
});

describe('Apparitions — audit 03 §10, 04 §10.10', () => {
	it('relit et transfère les packs migrés avec leurs alias ou leur forme minimale', async () => {
		await testDb.db.insert(spawnRuns).values({
			id: 'spawn_legacy',
			zoneId: 'z_test',
			payload: {
				by: 'Ancien MJ',
				packs: [
					{ id: 'b_loup', nom: 'Loup ancien', niv: 3, beh: 'Agressif', qty: 2 },
					{ id: 'b_ours', qty: 1 }
				]
			},
			beastIds: ['b_loup', 'b_ours']
		});
		const history = await spawnHistory(testDb.db, mj);
		expect(history[0]!.packs[0]).toMatchObject({
			name: 'Loup ancien',
			level: 3,
			behavior: 'Agressif',
			qty: 2
		});
		expect(await spawnTotals(testDb.db, mj)).toEqual({
			totals: { b_loup: 2, b_ours: 1 },
			totalDraws: 1
		});
		const table = await spawnToTable(testDb.db, mj, { runId: 'spawn_legacy', characterIds: [] });
		expect(table.state.fighters).toHaveLength(3);
		expect(table.row.name).toContain('Ancien MJ');
	});
	it('annule le tirage déjà inséré si son audit échoue', async () => {
		await testDb.db.execute(
			sql`alter table audit_log add constraint reject_spawn_audit check (source <> 'spawn')`
		);
		await expect(
			drawSpawn(testDb.db, mj, { zoneId: 'z_test', rng: () => 0 })
		).rejects.toBeDefined();
		expect(await testDb.db.select().from(spawnRuns)).toEqual([]);
		expect(await testDb.db.select().from(staffLog)).toEqual([]);
		expect(await spawnTotals(testDb.db, mj)).toEqual({ totals: {}, totalDraws: 0 });
	});
	it('injecte le hasard et réutilise exactement drawEncounter avec les cumuls migrés', async () => {
		await testDb.db.insert(spawnCounters).values({ beastId: 'b_loup', migratedDraws: 20 });
		await testDb.db
			.update(spawnSettings)
			.set({ migratedTotalDraws: 12 })
			.where(eq(spawnSettings.id, 1));
		const run = await drawSpawn(testDb.db, mj, { zoneId: 'z_test', rng: () => 0 });
		const pure = drawEncounter(
			'z_test',
			[
				{
					id: 'b_loup',
					name: 'Loup',
					level: 1,
					behavior: 'Neutre',
					spawnWeight: 10,
					qtyMin: 2,
					qtyMax: 2,
					zones: ['z_test']
				},
				{
					id: 'b_ours',
					name: 'Ours',
					level: 1,
					behavior: 'Neutre',
					spawnWeight: 10,
					qtyMin: 1,
					qtyMax: 1,
					zones: ['z_test']
				}
			],
			{ totals: { b_loup: 20 } },
			() => 0
		)!;
		expect(run.packs).toEqual(pure.packs);
		expect(run.weights).toEqual(pure.weights);
		expect(await spawnTotals(testDb.db, mj)).toEqual({ totals: { b_loup: 22 }, totalDraws: 13 });
		expect((await spawnHistory(testDb.db, mj))[0]).toEqual(run);
		expect((await testDb.db.select().from(spawnRuns))[0]!.beastIds).toEqual(['b_loup']);
	});
	it('cumule les tirages en base et ajuste les poids à chaque groupe', async () => {
		const run = await drawSpawn(testDb.db, mj, { zoneId: 'z_test', count: 3, rng: () => 0 });
		expect(run.packs.map((p) => p.total)).toEqual([0, 2, 4]);
		expect(await spawnTotals(testDb.db, mj)).toEqual({ totals: { b_loup: 6 }, totalDraws: 3 });
		expect(
			run.packs.every((p) => p.id !== 'b_secret' && p.id !== 'b_archive' && p.id !== 'b_zero')
		).toBe(true);
		const last = await drawSpawn(testDb.db, mj, { zoneId: 'z_test', rng: () => 0.999 });
		expect(last.packs[0]!.id).toBe('b_ours');
		expect((await spawnTotals(testDb.db, mj)).totals).toEqual({ b_loup: 6, b_ours: 1 });
	});
	it('garde les 24 dernières apparitions en lecture sans perdre les anciens cumuls', async () => {
		const run = await drawSpawn(testDb.db, mj, { zoneId: 'z_test', rng: () => 0 });
		const [stored] = await testDb.db.select().from(spawnRuns);
		await testDb.db.insert(spawnRuns).values(
			Array.from({ length: 26 }, (_, n) => ({
				id: `spawn_${n}`,
				zoneId: 'z_test',
				generatedAt: new Date(Date.now() + n * 1000),
				payload: stored.payload,
				beastIds: stored.beastIds
			}))
		);
		expect(await spawnHistory(testDb.db, mj)).toHaveLength(24);
		expect((await spawnHistory(testDb.db, mj)).some((r) => r.id === run.id)).toBe(false);
		expect(await spawnTotals(testDb.db, mj)).toEqual({ totals: { b_loup: 54 }, totalDraws: 27 });
	});
	it('transfère les créatures tirées dans une Table en préparation et ouvre sa scène', async () => {
		const run = await drawSpawn(testDb.db, mj, { zoneId: 'z_test', rng: () => 0 });
		const table = await spawnToTable(testDb.db, mj, { runId: run.id, characterIds: ['p_a'] });
		expect(table.row.status).toBe('preparation');
		expect(table.row.visibleToParticipants).toBe(true);
		expect(table.row.name).toMatch(/^Apparition — Salon des brumes — .* — mj$/);
		expect(table.state.fighters.filter((f) => f.type === 'beast')).toHaveLength(2);
		expect(table.state.fighters.find((f) => f.type === 'player')!.characterId).toBe('p_a');
		expect((await testDb.db.select().from(scenes))[0]!.title).toBe(table.row.name);
	});
	it('un transfert invalide ne crée ni Table ni scène ni journal', async () => {
		const run = await drawSpawn(testDb.db, mj, { zoneId: 'z_test', rng: () => 0 });
		const before = (await testDb.db.select().from(staffLog)).length;
		await expect(
			spawnToTable(testDb.db, mj, { runId: run.id, characterIds: ['p_absent'] })
		).rejects.toMatchObject({ status: 404 });
		expect(await testDb.db.select().from(combats)).toEqual([]);
		expect(await testDb.db.select().from(scenes)).toEqual([]);
		expect(await testDb.db.select().from(staffLog)).toHaveLength(before);
		expect(await testDb.db.select().from(auditLog)).toHaveLength(before);
	});
	it('refuse les zones inexistantes, les comptes révoqués et le hasard hors bornes sans rien écrire', async () => {
		await expect(drawSpawn(testDb.db, mj, { zoneId: 'absente' })).rejects.toMatchObject({
			status: 404
		});
		for (const value of [-0.1, 1, NaN])
			await expect(
				drawSpawn(testDb.db, mj, { zoneId: 'z_test', rng: () => value })
			).rejects.toMatchObject({ code: 'INVALID' });
		await testDb.db
			.update(accounts)
			.set({ sessionVersion: 1 })
			.where(eq(accounts.id, mj.accountId));
		await expect(drawSpawn(testDb.db, mj, { zoneId: 'z_test' })).rejects.toMatchObject({
			status: 401
		});
		expect(await testDb.db.select().from(spawnRuns)).toEqual([]);
		expect(await testDb.db.select().from(staffLog)).toEqual([]);
	});
	it('refuse une zone vide, compte zéro et les champs inconnus', async () => {
		await testDb.db.insert(zones).values({ id: 'z_empty', name: 'Vide' });
		await expect(drawSpawn(testDb.db, mj, { zoneId: 'z_empty' })).rejects.toMatchObject({
			code: 'INVALID'
		});
		await expect(drawSpawn(testDb.db, mj, { zoneId: 'z_test', count: 0 })).rejects.toMatchObject({
			code: 'INVALID'
		});
		await expect(
			drawSpawn(testDb.db, mj, {
				zoneId: 'z_test',
				actorAccountId: 'forgé'
			} as unknown as Parameters<typeof drawSpawn>[2])
		).rejects.toMatchObject({ code: 'INVALID' });
		expect(await spawnTotals(testDb.db, mj)).toEqual({ totals: {}, totalDraws: 0 });
	});
	it.each(['mj', 'admin'] as const)('%s peut tirer, relire et transférer', async (role) => {
		const staff = actor(role);
		const run = await drawSpawn(testDb.db, staff, { zoneId: 'z_test', rng: () => 0 });
		expect(await spawnHistory(testDb.db, staff)).toHaveLength(1);
		expect((await spawnTotals(testDb.db, staff)).totalDraws).toBe(1);
		expect(
			(await spawnToTable(testDb.db, staff, { runId: run.id, characterIds: [] })).row.status
		).toBe('preparation');
	});
	it.each(['joueur', 'designer', null] as const)(
		'refuse les apparitions au rôle %s',
		async (role) => {
			const denied = role ? actor(role) : null;
			const status = role ? 403 : 401;
			await expect(drawSpawn(testDb.db, denied, { zoneId: 'z_test' })).rejects.toMatchObject({
				status
			});
			await expect(spawnHistory(testDb.db, denied)).rejects.toMatchObject({ status });
			await expect(spawnTotals(testDb.db, denied)).rejects.toMatchObject({ status });
			await expect(
				spawnToTable(testDb.db, denied, { runId: 'run', characterIds: [] })
			).rejects.toMatchObject({ status });
		}
	);
});
