import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestDb } from '../../../../../../tests/helpers/db';
import { accounts, beasts, characters, oaths, sessions } from '$lib/server/db/schema';
import type { Actor } from '$lib/server/permissions';
import { createTable, setVisibleToParticipants } from '$lib/server/domain/combats';
import { GET } from './+server';

let testDb: TestDb;
let tableId: string;
const mj: Actor = { accountId: 'a_mj', pseudo: 'MJ', role: 'mj', characterId: null };
const player: Actor = {
	accountId: 'a_player',
	pseudo: 'Alice',
	role: 'joueur',
	characterId: 'p_a'
};
beforeEach(async () => {
	testDb = await createTestDb();
	const [oath] = await testDb.db.select().from(oaths).limit(1);
	await testDb.db.insert(characters).values([
		{ id: 'p_a', name: 'Alice', oathId: oath.id },
		{ id: 'p_b', name: 'Bob', oathId: oath.id }
	]);
	await testDb.db.insert(accounts).values([
		{ id: 'a_mj', pseudo: 'MJ', role: 'mj', passwordHash: 'fixture' },
		{ id: 'a_player', pseudo: 'Alice', characterId: 'p_a', passwordHash: 'fixture' }
	]);
	await testDb.db.insert(sessions).values({
		id: 'session',
		accountId: 'a_mj',
		sessionVersion: 0,
		expiresAt: new Date(Date.now() + 3600000)
	});
	await testDb.db.insert(beasts).values({ id: 'b_loup', name: 'Loup' });
	const table = await createTable(testDb.db, mj, {
		name: 'Col',
		characterIds: ['p_a'],
		beasts: [{ beastId: 'b_loup', qty: 1 }]
	});
	tableId = table.row.id;
	await setVisibleToParticipants(testDb.db, mj, { id: tableId, value: true, expectedRevision: 1 });
});
afterEach(async () => {
	await testDb?.close();
});
async function get(actor: Actor | null, etag?: string) {
	// Événement minimal : seuls ces champs sont lus par le handler ; aucune session simulée côté domaine.
	return GET({
		locals: { db: testDb.db, actor, session: actor ? { id: 'session', scope: 'full' } : null },
		params: { id: tableId },
		request: new Request(`https://np.test/api/table/${tableId}/etat`, {
			headers: etag ? { 'If-None-Match': etag } : {}
		})
	} as unknown as Parameters<typeof GET>[0]);
}
describe('GET /api/table/[id]/etat — 04 §10.14 et 06 C', () => {
	it('renvoie la projection avec ETag et interdit le stockage partagé', async () => {
		const response = await get(player);
		expect(response.status).toBe(200);
		expect(response.headers.get('ETag')).toBe('"2"');
		expect(response.headers.get('Cache-Control')).toBe('private, no-store');
		const body = await response.json();
		expect(body).toMatchObject({ name: 'Col', revision: 2, projection: { schemaVersion: 2 } });
		expect(JSON.stringify(body)).not.toContain('notes');
	});
	it('répond 304 sans corps pour la révision correspondante, 200 sinon', async () => {
		const unchanged = await get(player, '"2"');
		expect(unchanged.status).toBe(304);
		expect(await unchanged.text()).toBe('');
		expect(unchanged.headers.get('ETag')).toBe('"2"');
		expect(unchanged.headers.get('Cache-Control')).toBe('private, no-store');
		expect((await get(player, '"1"')).status).toBe(200);
	});
	it('vérifie les droits avant le 304 : visiteur 401, non participant 404', async () => {
		expect((await get(null, '"2"')).status).toBe(401);
		const response = await get({ ...player, characterId: 'p_b' }, '"2"');
		expect(response.status).toBe(404);
		expect(await response.json()).toMatchObject({
			code: 'NOT_FOUND',
			message: "Cette Table n'est pas la tienne."
		});
		expect(response.headers.get('Cache-Control')).toBe('private, no-store');
	});
});
