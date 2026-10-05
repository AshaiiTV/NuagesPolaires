import { afterAll, beforeAll, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import { DEMO_IDS } from '../db/seed';
import * as s from '../db/schema';
import { actorFor, ensureTestEnv } from '../auth/testing';
import { getLastPages, hasCorners } from './reading';
import { createTable, getPlayerTable, listRecits } from './combats';
import { getSceneContext, listOpenScenes } from './scenes';
import { proposeFact, rejectFact, listFacts } from './facts';
import { listCharacters, sheetForExport } from './characters';
import { listPending } from './accounts';
import { listAgenda, setParticipation } from './events';
import { listEntries } from './journal';
import { declare, listOwnPending } from './declarations';
import { maintainDatabase } from './maintenance';

let t: TestDb;
beforeAll(async () => {
	ensureTestEnv();
	t = await createTestDb({ demo: true });
});
afterAll(async () => t.close());
it('staff sans personnage : fiche absente, agenda servi, Table ouverte visible', async () => {
	const mj = await actorFor(t.db, DEMO_IDS.accounts.mj);
	const table = await createTable(t.db, mj, {
		name: 'Table ouverte',
		characterIds: [DEMO_IDS.characters.aria],
		beasts: []
	});
	expect(table.row.visibleToParticipants).toBe(true);
	const alice = await actorFor(t.db, DEMO_IDS.accounts.alice);
	expect(
		(await getLastPages(t.db, alice)).waiting.some(
			(w) => w.kind === 'table' && w.id === table.row.id
		)
	).toBe(true);
	expect((await getSceneContext(t.db, alice)).table?.id).toBe(table.row.id);
	for (const id of [DEMO_IDS.accounts.mj, DEMO_IDS.accounts.designer, DEMO_IDS.accounts.admin]) {
		const view = await getLastPages(t.db, await actorFor(t.db, id));
		expect(view.state).toBe('staff');
		expect(view.sheet).toBeNull();
		expect(view.upcoming).toHaveLength(2);
	}
});
it('un fait refusé dépose aussi une corne', async () => {
	const alice = await actorFor(t.db, DEMO_IDS.accounts.alice);
	const fact = await proposeFact(t.db, alice, { kind: 'promesse', text: 'Une promesse.' });
	await rejectFact(t.db, await actorFor(t.db, DEMO_IDS.accounts.mj), {
		id: fact.id,
		motif: 'Non retenue.',
		expectedRevision: fact.revision
	});
	expect((await getLastPages(t.db, alice)).since).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				id: `f:${fact.id}`,
				text: expect.stringContaining('a refusé'),
				cornered: true
			})
		])
	);
});
it('personnage rayé exclu de toutes les pages, conservé dans l’export admin', async () => {
	const alice = await actorFor(t.db, DEMO_IDS.accounts.alice);
	const mj = await actorFor(t.db, DEMO_IDS.accounts.mj);
	const admin = await actorFor(t.db, DEMO_IDS.accounts.admin);
	await t.db
		.update(s.characters)
		.set({ struckAt: new Date() })
		.where(eq(s.characters.id, DEMO_IDS.characters.aria));
	await t.db
		.update(s.characters)
		.set({ struckAt: new Date() })
		.where(eq(s.characters.id, DEMO_IDS.characters.seren));
	expect((await listCharacters(t.db, mj)).some((c) => c.id === DEMO_IDS.characters.aria)).toBe(
		false
	);
	expect((await listPending(t.db, admin)).unlinkedCharacters).toHaveLength(0);
	const view = await getLastPages(t.db, alice);
	expect(view.state).toBe('unavailable');
	expect(view.since).toHaveLength(0);
	expect(await hasCorners(t.db, alice)).toBe(false);
	expect(
		(await listAgenda(t.db, alice)).upcoming
			.flatMap((e) => e.participants)
			.some((p) => p.name === 'Aria Lunval')
	).toBe(false);
	expect((await getSceneContext(t.db, alice)).scene).toBeNull();
	expect(await listOpenScenes(t.db, alice)).toHaveLength(0);
	expect(await listOwnPending(t.db, alice)).toHaveLength(0);
	await expect(listFacts(t.db, alice)).rejects.toMatchObject({ status: 404 });
	await expect(listEntries(t.db, alice)).rejects.toMatchObject({ status: 404 });
	await expect(listRecits(t.db, alice, {})).rejects.toMatchObject({ status: 404 });
	await expect(getPlayerTable(t.db, alice, DEMO_IDS.combat)).rejects.toMatchObject({ status: 404 });
	await expect(
		setParticipation(t.db, alice, {
			eventId: DEMO_IDS.events.conseil,
			participating: true,
			expectedRevision: 1
		})
	).rejects.toMatchObject({ status: 404 });
	await expect(
		declare(t.db, alice, { resource: 'ep', delta: -1, word: 'Esquive' })
	).rejects.toMatchObject({ status: 404 });
	expect((await sheetForExport(t.db, admin, DEMO_IDS.characters.aria)).sheet.id).toBe(
		DEMO_IDS.characters.aria
	);
});
it('entretien : purge par âge, échéances et deuxième passage sans effet', async () => {
	const now = new Date();
	await t.db.insert(s.sessions).values({
		id: 'expired',
		accountId: DEMO_IDS.accounts.admin,
		scope: 'full',
		sessionVersion: 0,
		createdAt: new Date(0),
		expiresAt: new Date(1)
	});
	await t.db
		.insert(s.authRateLimits)
		.values({ scope: 'ip', subject: 'expired', count: 1, windowStart: new Date(0) });
	await t.db
		.insert(s.auditLog)
		.values({ source: 'test', action: 'old', ts: new Date(now.getTime() - 181 * 86_400_000) });
	await t.db.insert(s.scenes).values({
		id: 'idle',
		title: 'Inactive',
		lastActivityAt: new Date(now.getTime() - 15 * 86_400_000)
	});
	await t.db.insert(s.declarations).values({
		id: 'expired',
		characterId: DEMO_IDS.characters.kael,
		resource: 'ep',
		delta: -1,
		word: 'Esquive',
		createdAt: new Date(now.getTime() - 8 * 86_400_000)
	});
	const first = await maintainDatabase(t.db, now);
	expect(first.sessions).toBe(1);
	expect(first.rateLimits).toBe(1);
	expect(first.audit).toBe(1);
	expect(first.declarations.expired).toBe(1);
	expect(first.scenes.closed).toEqual(['idle']);
	const second = await maintainDatabase(t.db, now);
	expect(second).toEqual({
		sessions: 0,
		rateLimits: 0,
		audit: 0,
		declarations: { expired: 0 },
		scenes: { closed: [] }
	});
});
