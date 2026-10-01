// Faits validés : proposition du joueur, tampon du MJ ou de l'administrateur (valider, refuser,
// régler), contrôle de version, journal staff. Spécification : 06-contrats §B.3 ; 04 §3.12 ;
// 03-vision §5.5.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { count, desc, eq, sql } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import { DEMO_IDS } from '../db/seed';
import { staffLog, validatedFacts } from '../db/schema';
import type { Actor } from '../permissions';
import { listFacts, proposeFact, rejectFact, settleFact, validateFact } from './facts';

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

describe('faits validés', () => {
	let t: TestDb;
	let detteId = '';
	let promesseId = '';
	beforeAll(async () => {
		t = await createTestDb({ demo: true });
	});
	afterAll(async () => t.close());

	it('proposeFact : le joueur relié propose, le fait attend un tampon', async () => {
		const fact = await proposeFact(t.db, alice, {
			kind: 'dette',
			counterpart: 'envers Kael',
			text: 'Aria doit une faveur à Kael pour le gué.',
			witness: 'Seren'
		});
		detteId = fact.id;
		expect(fact).toMatchObject({
			characterId: P.aria,
			kind: 'dette',
			counterpart: 'envers Kael',
			status: 'proposed',
			witness: 'Seren',
			stamp: null,
			settledAt: null,
			revision: 1
		});
		promesseId = (await proposeFact(t.db, alice, { kind: 'promesse', text: 'Revenir au chêne.' }))
			.id;
	});

	it('proposeFact : refus sans personnage, type inconnu, texte vide ou > 1 000, champ en trop', async () => {
		await expectNpError(proposeFact(t.db, mj, { kind: 'dette', text: 'x' }), 'NOT_LINKED', 403);
		await expectNpError(proposeFact(t.db, nova, { kind: 'dette', text: 'x' }), 'NOT_LINKED', 403);
		await expectNpError(
			proposeFact(t.db, null, { kind: 'dette', text: 'x' }),
			'UNAUTHENTICATED',
			401
		);
		await expectNpError(
			proposeFact(t.db, alice, { kind: 'rumeur' as 'dette', text: 'x' }),
			'INVALID',
			400
		);
		await expectNpError(proposeFact(t.db, alice, { kind: 'dette', text: ' ' }), 'INVALID', 400);
		await expectNpError(
			proposeFact(t.db, alice, { kind: 'dette', text: 'x'.repeat(1001) }),
			'INVALID',
			400
		);
		await expectNpError(
			proposeFact(t.db, alice, { kind: 'dette', text: 'x', status: 'validated' } as never),
			'INVALID',
			400
		);
	});

	it('listFacts : le propriétaire, les MJ et les administrateurs ; file des proposés pour le staff', async () => {
		expect((await listFacts(t.db, alice)).map((f) => f.id).sort()).toEqual(
			[detteId, promesseId].sort()
		);
		expect((await listFacts(t.db, mj, { characterId: P.aria })).length).toBe(2);
		expect((await listFacts(t.db, admin)).map((f) => f.status)).toEqual(['proposed', 'proposed']);
		expect(await listFacts(t.db, bob)).toEqual([]);
		await expectNpError(listFacts(t.db, bob, { characterId: P.aria }), 'FORBIDDEN', 403);
		await expectNpError(listFacts(t.db, designer, { characterId: P.aria }), 'FORBIDDEN', 403);
		await expectNpError(listFacts(t.db, designer), 'FORBIDDEN', 403);
		await expectNpError(listFacts(t.db, null), 'UNAUTHENTICATED', 401);
	});

	it('validateFact : tampon du MJ avec motif et témoin, journal staff', async () => {
		const fact = await validateFact(t.db, mj, {
			id: detteId,
			motif: 'Confirmé sur Discord',
			witness: 'Seren Vallombre',
			expectedRevision: 1
		});
		expect(fact.status).toBe('validated');
		expect(fact.revision).toBe(2);
		expect(fact.witness).toBe('Seren Vallombre');
		expect(fact.stamp).toMatchObject({ role: 'MJ', name: 'mj', motif: 'Confirmé sur Discord' });
		const [log] = await t.db.select().from(staffLog).orderBy(desc(staffLog.id)).limit(1);
		expect(log).toMatchObject({ action: 'fait_valide', actorName: 'mj', target: 'Aria Lunval' });
	});

	it('validateFact : 428 sans version, 409 périmée ou déjà tamponné, 400 sans motif, 403 hors staff', async () => {
		await expectNpError(
			validateFact(t.db, mj, { id: detteId, motif: 'm' } as never),
			'VERSION_REQUIRED',
			428
		);
		await expectNpError(
			validateFact(t.db, mj, { id: detteId, motif: 'm', expectedRevision: 1 }),
			'VERSION_CONFLICT',
			409
		);
		await expectNpError(
			validateFact(t.db, mj, { id: detteId, motif: 'm', expectedRevision: 2 }),
			'FACT_STATE',
			409
		);
		await expectNpError(
			validateFact(t.db, mj, { id: promesseId, motif: ' ', expectedRevision: 1 }),
			'INVALID',
			400
		);
		await expectNpError(
			validateFact(t.db, alice, { id: promesseId, motif: 'm', expectedRevision: 1 }),
			'FORBIDDEN',
			403
		);
		await expectNpError(
			validateFact(t.db, designer, { id: promesseId, motif: 'm', expectedRevision: 1 }),
			'FORBIDDEN',
			403
		);
		await expectNpError(
			validateFact(t.db, mj, { id: 'f_x', motif: 'm', expectedRevision: 1 }),
			'NOT_FOUND',
			404
		);
	});

	it('settleFact : seul un fait validé se règle ; il reste lisible, jamais supprimé', async () => {
		await expectNpError(
			settleFact(t.db, admin, { id: promesseId, motif: 'm', expectedRevision: 1 }),
			'FACT_STATE',
			409
		);
		const settled = await settleFact(t.db, admin, {
			id: detteId,
			motif: 'Faveur rendue',
			expectedRevision: 2
		});
		expect(settled.status).toBe('settled');
		expect(settled.settledAt).not.toBeNull();
		expect(settled.stamp).toMatchObject({ role: 'Admin', name: 'admin', motif: 'Faveur rendue' });
		expect((await listFacts(t.db, alice)).find((f) => f.id === detteId)?.status).toBe('settled');
	});

	it('rejectFact : refus tamponné', async () => {
		const rejected = await rejectFact(t.db, mj, {
			id: promesseId,
			motif: 'Pas encore joué',
			expectedRevision: 1
		});
		expect(rejected.status).toBe('rejected');
		expect(rejected.stamp?.motif).toBe('Pas encore joué');
		await expectNpError(
			rejectFact(t.db, bob, { id: promesseId, motif: 'm', expectedRevision: 2 }),
			'FORBIDDEN',
			403
		);
	});

	it('un échec en fin de transaction laisse le fait proposé, révision inchangée', async () => {
		const fact = await proposeFact(t.db, alice, {
			kind: 'alliance',
			counterpart: 'avec Kael',
			text: 'Pacte du gué.'
		});
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
				validateFact(t.db, mj, { id: fact.id, motif: 'm', expectedRevision: 1 })
			).rejects.toThrow();
		} finally {
			await t.db.execute(sql.raw(`DROP TRIGGER np_test_fail_staff ON staff_log`));
		}
		const [row] = await t.db.select().from(validatedFacts).where(eq(validatedFacts.id, fact.id));
		expect(row).toMatchObject({ status: 'proposed', revision: 1, validatedBy: null });
		const [{ n }] = await t.db
			.select({ n: count() })
			.from(staffLog)
			.where(eq(staffLog.action, 'fait_valide'));
		expect(n).toBe(1);
	});
});
