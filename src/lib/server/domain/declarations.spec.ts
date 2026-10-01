// Déclarations : « Kael déclare −8 EP (Esquive). », annulation 10 s, rature, report tamponné,
// expiration à 7 jours. Spécification : 06-contrats §B.3 ; 04 §3.12 ; 03-vision §5.3, §6.6, §12.4.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { count, desc, eq, sql } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import { DEMO_IDS } from '../db/seed';
import type { Db } from '../db/index';
import { characterHistory, characters, declarations, staffLog } from '../db/schema';
import type { Actor } from '../permissions';
import {
	cancelDeclaration,
	declare,
	expireDeclarations,
	listOwnPending,
	listPendingFor,
	reportDeclaration,
	strikeDeclaration,
	strikeOwnDeclaration
} from './declarations';
import { getOwnSheet } from './characters';

const A = DEMO_IDS.accounts;
const P = DEMO_IDS.characters;
const alice: Actor = { accountId: A.alice, role: 'joueur', characterId: P.aria, pseudo: 'alice' };
const bob: Actor = { accountId: A.bob, role: 'joueur', characterId: P.kael, pseudo: 'bob' };
const nova: Actor = { accountId: A.nova, role: 'joueur', characterId: null, pseudo: 'nova' };
const mj: Actor = { accountId: A.mj, role: 'mj', characterId: null, pseudo: 'mj' };
const designer: Actor = {
	accountId: A.designer,
	role: 'designer',
	characterId: null,
	pseudo: 'designer'
};
const admin: Actor = { accountId: A.admin, role: 'admin', characterId: null, pseudo: 'admin' };

async function expectNpError(promise: Promise<unknown>, code: string, status: number) {
	await expect(promise).rejects.toMatchObject({ name: 'NpError', code, status });
}

async function character(db: Db, id: string) {
	const [row] = await db.select().from(characters).where(eq(characters.id, id));
	return row;
}

/** Antidate une déclaration (la fenêtre `cancel_until`, colonne générée, suit `created_at`). */
async function backdate(db: Db, id: string, seconds: number) {
	await db
		.update(declarations)
		.set({ createdAt: sql`now() - make_interval(secs => ${seconds}::double precision)` })
		.where(eq(declarations.id, id));
}

describe('déclarations', () => {
	let t: TestDb;
	beforeAll(async () => {
		t = await createTestDb({ demo: true });
	});
	afterAll(async () => t.close());

	it('declare : texte exact avec le signe moins typographique, annulable 10 s, ressources intactes', async () => {
		const before = await character(t.db, P.aria);
		const d = await declare(t.db, alice, { resource: 'ep', delta: -8, word: 'Esquive' });
		expect(d.text).toBe('Aria Lunval déclare −8 EP (Esquive).');
		expect(d.text).toContain('−');
		expect(d).toMatchObject({
			resource: 'ep',
			delta: -8,
			word: 'Esquive',
			status: 'proposee',
			characterId: P.aria
		});
		expect(new Date(d.cancelUntil).getTime() - new Date(d.at).getTime()).toBe(10_000);
		const after = await character(t.db, P.aria);
		expect(after.epCur).toBe(before.epCur);
		expect(after.revision).toBe(before.revision);
		const plus = await declare(t.db, alice, { resource: 'pv', delta: 5, word: 'soigné de' });
		expect(plus.text).toBe('Aria Lunval déclare +5 PV (soigné de).');
		expect((await getOwnSheet(t.db, alice))?.pendingDeclared).toEqual({ pv: 5, ep: -8, em: 0 });
	});

	it('declare : scène et Table doivent compter le personnage ; Table repliée refusée', async () => {
		const inScene = await declare(t.db, alice, {
			resource: 'em',
			delta: -1,
			word: 'Invoquer son Serment',
			sceneId: DEMO_IDS.scene
		});
		expect(inScene.sceneId).toBe(DEMO_IDS.scene);
		await expectNpError(
			declare(t.db, alice, { resource: 'em', delta: -1, word: 'x', sceneId: 's_inconnue' }),
			'NOT_FOUND',
			404
		);
		await expectNpError(
			declare(t.db, alice, {
				resource: 'ep',
				delta: -6,
				word: 'Frappe',
				combatId: DEMO_IDS.combat
			}),
			'TABLE_CLOSED',
			409
		);
		await expectNpError(
			declare(t.db, alice, { resource: 'ep', delta: -6, word: 'Frappe', combatId: 'c_x' }),
			'NOT_FOUND',
			404
		);
	});

	it('declare : chiffre non nul, mot obligatoire, ressource connue, commande stricte, joueur relié', async () => {
		await expectNpError(
			declare(t.db, alice, { resource: 'ep', delta: 0, word: 'x' }),
			'INVALID',
			400
		);
		await expectNpError(
			declare(t.db, alice, { resource: 'ep', delta: 1.5, word: 'x' }),
			'INVALID',
			400
		);
		await expectNpError(
			declare(t.db, alice, { resource: 'ep', delta: -8, word: '  ' }),
			'INVALID',
			400
		);
		await expectNpError(
			declare(t.db, alice, { resource: 'xp' as 'ep', delta: 5, word: 'x' }),
			'INVALID',
			400
		);
		await expectNpError(
			declare(t.db, alice, { resource: 'ep', delta: -8, word: 'x', characterId: P.kael } as never),
			'INVALID',
			400
		);
		await expectNpError(
			declare(t.db, mj, { resource: 'ep', delta: -8, word: 'x' }),
			'NOT_LINKED',
			403
		);
		await expectNpError(
			declare(t.db, nova, { resource: 'ep', delta: -8, word: 'x' }),
			'NOT_LINKED',
			403
		);
		await expectNpError(
			declare(t.db, null, { resource: 'ep', delta: -8, word: 'x' }),
			'UNAUTHENTICATED',
			401
		);
	});

	it('cancelDeclaration : dans les 10 s seulement ; ensuite seulement rayable', async () => {
		const d1 = await declare(t.db, bob, { resource: 'ep', delta: -4, word: 'Tir à l’arc' });
		expect((await cancelDeclaration(t.db, bob, { id: d1.id })).status).toBe('annulee');
		await expectNpError(cancelDeclaration(t.db, bob, { id: d1.id }), 'DECLARATION_CLOSED', 409);
		const d2 = await declare(t.db, bob, { resource: 'ep', delta: -10, word: 'Se déplacer' });
		await backdate(t.db, d2.id, 11);
		await expectNpError(cancelDeclaration(t.db, bob, { id: d2.id }), 'CANCEL_EXPIRED', 409);
		await expectNpError(cancelDeclaration(t.db, alice, { id: d2.id }), 'NOT_FOUND', 404);
		await expectNpError(strikeOwnDeclaration(t.db, alice, { id: d2.id }), 'NOT_FOUND', 404);
		const struck = await strikeOwnDeclaration(t.db, bob, { id: d2.id });
		expect(struck.status).toBe('rayee');
		await expectNpError(strikeOwnDeclaration(t.db, bob, { id: d2.id }), 'DECLARATION_CLOSED', 409);
	});

	it('listOwnPending / listPendingFor : seulement les proposées ; MJ et admin pour autrui', async () => {
		const own = await listOwnPending(t.db, alice);
		expect(own.map((d) => d.word)).toEqual(['Esquive', 'soigné de', 'Invoquer son Serment']);
		expect(await listOwnPending(t.db, bob)).toEqual([]);
		expect((await listPendingFor(t.db, mj, P.aria)).length).toBe(3);
		expect((await listPendingFor(t.db, admin, P.aria)).length).toBe(3);
		await expectNpError(listPendingFor(t.db, alice, P.aria), 'FORBIDDEN', 403);
		await expectNpError(listPendingFor(t.db, designer, P.aria), 'FORBIDDEN', 403);
		await expectNpError(listPendingFor(t.db, mj, 'p_x'), 'NOT_FOUND', 404);
		await expectNpError(listOwnPending(t.db, mj), 'NOT_LINKED', 403);
	});

	it('reportDeclaration : delta appliqué, conséquence tamponnée liée à la déclaration, révision', async () => {
		const [d] = (await listOwnPending(t.db, alice)).filter((x) => x.word === 'Esquive');
		const c = await character(t.db, P.aria);
		const res = await reportDeclaration(t.db, mj, {
			id: d.id,
			motif: 'Esquive résolue au round 2',
			expectedRevision: c.revision
		});
		expect(res.declaration).toMatchObject({
			status: 'reportee',
			motif: 'Esquive résolue au round 2'
		});
		expect(res.declaration.reportedAt).not.toBeNull();
		expect(res.sheet.ep.cur).toBe(c.epCur - 8);
		expect(res.sheet.revision).toBe(c.revision + 1);
		expect(res.sheet.pendingDeclared.ep).toBe(0);
		const [h] = await t.db
			.select()
			.from(characterHistory)
			.where(eq(characterHistory.declarationId, d.id));
		expect(h).toMatchObject({
			type: 'stat',
			field: 'ep',
			oldValue: String(c.epCur),
			newValue: String(c.epCur - 8),
			text: `−8 EP (Esquive) : ${c.epCur} → ${c.epCur - 8}.`,
			motif: 'Esquive résolue au round 2',
			actorRole: 'mj',
			actorName: 'MJ mj'
		});
		const [log] = await t.db.select().from(staffLog).orderBy(desc(staffLog.id)).limit(1);
		expect(log.action).toBe('declaration_reportee');
		await expectNpError(
			reportDeclaration(t.db, mj, { id: d.id, motif: 'm', expectedRevision: c.revision + 1 }),
			'DECLARATION_CLOSED',
			409
		);
	});

	it('reportDeclaration : borné à [0, max] ; 428, 409 (fiche changée), 400, 403', async () => {
		const [heal] = (await listOwnPending(t.db, alice)).filter((x) => x.word === 'soigné de');
		const c = await character(t.db, P.aria);
		await t.db
			.update(characters)
			.set({ pvCur: c.pvMax - 2 })
			.where(eq(characters.id, P.aria));
		await expectNpError(
			reportDeclaration(t.db, mj, { id: heal.id, motif: 'm' } as never),
			'VERSION_REQUIRED',
			428
		);
		await expectNpError(
			reportDeclaration(t.db, mj, { id: heal.id, motif: 'm', expectedRevision: c.revision - 1 }),
			'VERSION_CONFLICT',
			409
		);
		expect((await listPendingFor(t.db, mj, P.aria)).map((d) => d.id)).toContain(heal.id);
		await expectNpError(
			reportDeclaration(t.db, mj, { id: heal.id, motif: ' ', expectedRevision: c.revision }),
			'INVALID',
			400
		);
		await expectNpError(
			reportDeclaration(t.db, alice, { id: heal.id, motif: 'm', expectedRevision: c.revision }),
			'FORBIDDEN',
			403
		);
		await expectNpError(
			reportDeclaration(t.db, designer, { id: heal.id, motif: 'm', expectedRevision: c.revision }),
			'FORBIDDEN',
			403
		);
		const res = await reportDeclaration(t.db, admin, {
			id: heal.id,
			motif: 'Soin',
			expectedRevision: c.revision
		});
		expect(res.sheet.pv.cur).toBe(c.pvMax); // +5 borné au maximum
		const big = await declare(t.db, bob, { resource: 'pv', delta: -999, word: 'subis' });
		const k = await character(t.db, P.kael);
		const down = await reportDeclaration(t.db, mj, {
			id: big.id,
			motif: 'KO',
			expectedRevision: k.revision
		});
		expect(down.sheet.pv.cur).toBe(0); // borné à 0
	});

	it('strikeDeclaration : rayée par le staff avec motif, ressources intactes', async () => {
		const d = await declare(t.db, bob, { resource: 'em', delta: -3, word: 'Sort' });
		const before = await character(t.db, P.kael);
		await expectNpError(strikeDeclaration(t.db, mj, { id: d.id, motif: '' }), 'INVALID', 400);
		await expectNpError(strikeDeclaration(t.db, bob, { id: d.id, motif: 'm' }), 'FORBIDDEN', 403);
		const struck = await strikeDeclaration(t.db, mj, { id: d.id, motif: 'Déclaration hors scène' });
		expect(struck).toMatchObject({ status: 'rayee', motif: 'Déclaration hors scène' });
		const after = await character(t.db, P.kael);
		expect([after.emCur, after.revision]).toEqual([before.emCur, before.revision]);
		await expectNpError(
			strikeDeclaration(t.db, mj, { id: d.id, motif: 'm' }),
			'DECLARATION_CLOSED',
			409
		);
		await expectNpError(strikeDeclaration(t.db, mj, { id: 'd_x', motif: 'm' }), 'NOT_FOUND', 404);
	});

	it('reportDeclaration : un échec en fin de transaction annule tout', async () => {
		const d = await declare(t.db, bob, { resource: 'ep', delta: -6, word: 'Frappe' });
		const before = await character(t.db, P.kael);
		const [{ n: historyBefore }] = await t.db
			.select({ n: count() })
			.from(characterHistory)
			.where(eq(characterHistory.characterId, P.kael));
		await t.db.execute(
			sql.raw(
				`CREATE OR REPLACE FUNCTION np_test_fail() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'échec simulé'; END $$ LANGUAGE plpgsql`
			)
		);
		await t.db.execute(
			sql.raw(
				`CREATE TRIGGER np_test_fail_staff BEFORE INSERT ON staff_log FOR EACH ROW EXECUTE FUNCTION np_test_fail()`
			)
		);
		try {
			await expect(
				reportDeclaration(t.db, mj, { id: d.id, motif: 'm', expectedRevision: before.revision })
			).rejects.toThrow();
		} finally {
			await t.db.execute(sql.raw(`DROP TRIGGER np_test_fail_staff ON staff_log`));
		}
		const after = await character(t.db, P.kael);
		expect([after.epCur, after.revision]).toEqual([before.epCur, before.revision]);
		const [row] = await t.db.select().from(declarations).where(eq(declarations.id, d.id));
		expect(row.status).toBe('proposee');
		const [{ n: historyAfter }] = await t.db
			.select({ n: count() })
			.from(characterHistory)
			.where(eq(characterHistory.characterId, P.kael));
		expect(historyAfter).toBe(historyBefore);
	});

	it('expireDeclarations : proposée depuis plus de 7 jours → non reportée', async () => {
		const old = await declare(t.db, bob, { resource: 'ep', delta: -2, word: 'Bloquer' });
		const recent = await declare(t.db, bob, { resource: 'ep', delta: -2, word: 'Bloquer' });
		await backdate(t.db, old.id, 8 * 86_400);
		await backdate(t.db, recent.id, 6 * 86_400);
		const res = await expireDeclarations(t.db);
		expect(res.expired).toBeGreaterThanOrEqual(1);
		const [o] = await t.db.select().from(declarations).where(eq(declarations.id, old.id));
		const [r] = await t.db.select().from(declarations).where(eq(declarations.id, recent.id));
		expect(o.status).toBe('non_reportee');
		expect(r.status).toBe('proposee');
		expect((await expireDeclarations(t.db)).expired).toBe(0);
	});
});
