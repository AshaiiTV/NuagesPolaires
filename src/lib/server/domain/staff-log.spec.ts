import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { isNotNull, isNull } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import { DEMO_IDS } from '$lib/server/db/seed';
import { auditLog, characterHistory, staffLog, staffLogArchives } from '$lib/server/db/schema';
import { actorFor, ensureTestEnv, interceptTransaction } from '$lib/server/auth/testing';
import type { Actor } from '$lib/server/permissions';
import { STAFF_LOG_PAGE_SIZE, appendStaffLog, archiveStaffLog, listStaffLog } from './staff-log';

let t: TestDb;
let admin: Actor;
let mj: Actor;
let designer: Actor;
let alice: Actor;

beforeAll(() => ensureTestEnv());
beforeEach(async () => {
	t = await createTestDb({ demo: true });
	admin = await actorFor(t.db, DEMO_IDS.accounts.admin);
	mj = await actorFor(t.db, DEMO_IDS.accounts.mj);
	designer = await actorFor(t.db, DEMO_IDS.accounts.designer);
	alice = await actorFor(t.db, DEMO_IDS.accounts.alice);
});
afterEach(async () => {
	await t.close();
});

describe('journal staff (04 §3.10, §5 ; audit 05 §3.9)', () => {
	it('appendStaffLog écrit action, phrase, auteur et cible', async () => {
		await appendStaffLog(t.db, {
			action: 'liaison',
			detail: "Compte 'nova' lié au personnage 'Seren'",
			actor: admin,
			target: 'Seren'
		});
		const page = await listStaffLog(t.db, mj);
		expect(page.rows).toEqual([
			{
				id: expect.any(Number),
				at: expect.any(String),
				action: 'liaison',
				detail: "Compte 'nova' lié au personnage 'Seren'",
				actorName: 'admin',
				target: 'Seren'
			}
		]);
	});

	it('lecture : MJ et administrateurs seulement', async () => {
		await expect(listStaffLog(t.db, admin)).resolves.toBeTruthy();
		await expect(listStaffLog(t.db, designer)).rejects.toMatchObject({ status: 403 });
		await expect(listStaffLog(t.db, alice)).rejects.toMatchObject({ status: 403 });
		await expect(listStaffLog(t.db, null)).rejects.toMatchObject({ status: 401 });
	});

	it('pagine du plus récent au plus ancien', async () => {
		for (let i = 0; i < 60; i++) {
			await t.db.insert(staffLog).values({
				action: 'event_cree',
				detail: `n${i}`,
				actorName: 'mj',
				ts: new Date(Date.UTC(2026, 8, 1) + i * 60_000)
			});
		}
		const first = await listStaffLog(t.db, mj, { page: 1 });
		expect(first.rows).toHaveLength(STAFF_LOG_PAGE_SIZE);
		expect(first.rows[0].detail).toBe('n59');
		expect(first.pages).toBe(2);
		expect((await listStaffLog(t.db, mj, { page: 2 })).rows).toHaveLength(10);
	});

	it('archivage : marque les lignes courantes, garde les historiques, laisse une ligne de trace', async () => {
		for (let i = 0; i < 3; i++)
			await appendStaffLog(t.db, { action: 'connexion', detail: `c${i}`, actor: mj });
		const historyBefore = (await t.db.select().from(characterHistory)).length;
		const res = await archiveStaffLog(t.db, mj, { label: 'Archive de septembre' });
		expect(res).toMatchObject({ label: 'Archive de septembre', archived: 3 });
		expect(await t.db.select().from(staffLogArchives)).toHaveLength(1);
		expect(await t.db.select().from(staffLog).where(isNotNull(staffLog.archiveId))).toHaveLength(3);
		const current = await t.db.select().from(staffLog).where(isNull(staffLog.archiveId));
		expect(current.map((r) => r.action)).toEqual(['journal_archive']);
		// L'ancien archivage vidait l'historique de tous les personnages (main.js:1195) : plus maintenant.
		expect(await t.db.select().from(characterHistory)).toHaveLength(historyBefore);
		const page = await listStaffLog(t.db, admin);
		expect(page.rows.map((r) => r.action)).toEqual(['journal_archive']);
		expect((await t.db.select().from(auditLog)).map((r) => r.action)).toContain(
			'staff_log_archive'
		);
	});

	it('libellé par défaut daté ; droits d’archivage : MJ et admin', async () => {
		const res = await archiveStaffLog(t.db, admin);
		expect(res.label).toMatch(/^Archive du \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
		await expect(archiveStaffLog(t.db, designer)).rejects.toMatchObject({ status: 403 });
		await expect(archiveStaffLog(t.db, alice)).rejects.toMatchObject({ status: 403 });
	});

	it('échec de l’archivage ⇒ rollback total (aucune archive, aucune ligne marquée)', async () => {
		await appendStaffLog(t.db, { action: 'connexion', detail: 'c', actor: mj });
		const failing = interceptTransaction(t.db, {
			wrapTx: (tx) =>
				new Proxy(tx as object, {
					get(target, prop) {
						const value = Reflect.get(target, prop, target) as unknown;
						if (prop === 'update') {
							return () => {
								throw new Error('échec simulé');
							};
						}
						return typeof value === 'function'
							? (value as (...a: unknown[]) => unknown).bind(target)
							: value;
					}
				})
		});
		await expect(archiveStaffLog(failing, mj, { label: 'x' })).rejects.toThrow(/échec simulé/);
		expect(await t.db.select().from(staffLogArchives)).toHaveLength(0);
		expect(await t.db.select().from(staffLog).where(isNotNull(staffLog.archiveId))).toHaveLength(0);
	});
});
