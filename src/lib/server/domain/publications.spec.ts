import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import {
	accounts,
	auditLog,
	beastObservations,
	beasts,
	events,
	publicationBeasts,
	publications,
	sessions,
	staffLog
} from '../db/schema';
import type { Actor, Role } from '../permissions';
import { bindRequestContext } from '../auth/context';
import { listHomeLeaves, publishExtract, strikePublication } from './publications';

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
	await testDb.db
		.insert(accounts)
		.values(
			(['mj', 'admin', 'designer', 'joueur'] as const).map((role) => ({
				id: `a_${role}`,
				pseudo: role,
				role,
				passwordHash: 'fixture'
			}))
		);
	await testDb.db
		.insert(sessions)
		.values(
			(['mj', 'admin'] as const).map((role) => ({
				id: `session_${role}`,
				accountId: `a_${role}`,
				sessionVersion: 0,
				expiresAt: new Date(Date.now() + 3600000)
			}))
		);
	await testDb.db.insert(beasts).values([
		{ id: 'b_loup', name: 'Loup' },
		{ id: 'b_ours', name: 'Ours' }
	]);
});
afterEach(async () => {
	await testDb?.close();
});
const extract = {
	text: 'Le col est franchi.\nLes brumes gardent la trace.',
	onHome: true,
	beastIds: ['b_loup', 'b_ours', 'b_loup']
};

describe('Extraits et feuillets publics — vision §5.1, §5.7, §9.4', () => {
	it('publie le texte exact et tamponne une observation par créature, puis rature sans effacer', async () => {
		const publication = await publishExtract(testDb.db, mj, extract);
		expect(publication.text).toBe(extract.text);
		expect(await testDb.db.select().from(publicationBeasts)).toHaveLength(2);
		expect(
			(await testDb.db.select().from(beastObservations)).every(
				(o) =>
					o.text === extract.text &&
					o.status === 'validated' &&
					o.validatedBy === mj.accountId &&
					o.validatedAt &&
					o.publicationId === publication.id
			)
		).toBe(true);
		expect((await listHomeLeaves(testDb.db))[0]).toMatchObject({
			id: publication.id,
			kind: 'recit',
			excerpt: extract.text,
			href: null
		});
		await strikePublication(testDb.db, mj, {
			id: publication.id,
			motif: 'Correction de la publication'
		});
		expect(await listHomeLeaves(testDb.db)).toEqual([]);
		expect((await testDb.db.select().from(publications))[0]).toMatchObject({
			text: extract.text,
			struck: true
		});
		expect(
			(await testDb.db.select().from(beastObservations)).every(
				(o) => o.status === 'rejected' && o.revision === 2
			)
		).toBe(true);
		expect((await testDb.db.select().from(staffLog))[1]!.detail).toBe(
			'Correction de la publication'
		);
		expect((await testDb.db.select().from(auditLog))[1]!.details).toMatchObject({
			motif: 'Correction de la publication'
		});
		await strikePublication(testDb.db, mj, { id: publication.id, motif: 'Rature rejouée' });
		expect(await testDb.db.select().from(staffLog)).toHaveLength(2);
	});
	it('sert au plus trois feuillets : extrait, dernier rendez-vous passé, prochain visible', async () => {
		await publishExtract(testDb.db, mj, { ...extract, text: 'Première ligne.\nDeuxième ligne.' });
		const last = await publishExtract(testDb.db, mj, extract);
		const now = Date.now();
		await testDb.db.insert(events).values([
			{ id: 'e_old', title: 'Ancien', startsAt: new Date(now - 10000) },
			{ id: 'e_past', title: 'Dernier passé', startsAt: new Date(now - 5000) },
			{ id: 'e_next', title: 'Prochain', startsAt: new Date(now + 5000) },
			{ id: 'e_later', title: 'Plus tard', startsAt: new Date(now + 10000) },
			{ id: 'e_hidden_past', title: 'Secret passé', startsAt: new Date(now - 1000), hidden: true },
			{ id: 'e_hidden_next', title: 'Secret futur', startsAt: new Date(now + 1000), hidden: true },
			{ id: 'e_no_date', title: 'Sans date' }
		]);
		const leaves = await listHomeLeaves(testDb.db);
		expect(leaves.map((l) => l.id)).toEqual([last.id, 'e_past', 'e_next']);
		expect(leaves.map((l) => l.kind)).toEqual(['recit', 'passe', 'a-venir']);
		expect(
			leaves.every(
				(l) => Object.keys(l).sort().join(',') === 'excerpt,href,id,kind,margin,stamp,title'
			)
		).toBe(true);
	});
	it('une publication hors accueil reste une observation et ne remplace pas le feuillet', async () => {
		const home = await publishExtract(testDb.db, mj, extract);
		await publishExtract(testDb.db, mj, { ...extract, onHome: false });
		expect((await listHomeLeaves(testDb.db))[0]!.id).toBe(home.id);
		expect(await testDb.db.select().from(beastObservations)).toHaveLength(4);
	});
	it.each(['une ligne', 'a\nb\nc\nd\ne', 'a\n\nb', ''])(
		'refuse un extrait hors des deux à quatre lignes : %s',
		async (text) => {
			await expect(publishExtract(testDb.db, mj, { ...extract, text })).rejects.toMatchObject({
				code: 'INVALID'
			});
			expect(await testDb.db.select().from(publications)).toEqual([]);
		}
	);
	it('annule publication, observations et journaux si une créature ou un combat est absent', async () => {
		await expect(
			publishExtract(testDb.db, mj, { ...extract, beastIds: ['b_loup', 'b_absent'] })
		).rejects.toMatchObject({ status: 404 });
		await expect(
			publishExtract(testDb.db, mj, { ...extract, combatId: 'c_absent' })
		).rejects.toMatchObject({ status: 404 });
		expect(await testDb.db.select().from(publications)).toEqual([]);
		expect(await testDb.db.select().from(beastObservations)).toEqual([]);
		expect(await testDb.db.select().from(staffLog)).toEqual([]);
		expect(await testDb.db.select().from(auditLog)).toEqual([]);
	});
	it('annule la publication déjà insérée si une observation échoue', async () => {
		await testDb.db.execute(
			sql`alter table beast_observations add constraint reject_test_text check (text <> 'Le col est franchi.\nLes brumes gardent la trace.')`
		);
		await expect(publishExtract(testDb.db, mj, extract)).rejects.toBeDefined();
		expect(await testDb.db.select().from(publications)).toEqual([]);
		expect(await testDb.db.select().from(publicationBeasts)).toEqual([]);
		expect(await testDb.db.select().from(beastObservations)).toEqual([]);
		expect(await testDb.db.select().from(auditLog)).toEqual([]);
	});
	it('refuse un motif vide, une rature absente et une session révoquée', async () => {
		const publication = await publishExtract(testDb.db, mj, extract);
		await expect(
			strikePublication(testDb.db, mj, { id: publication.id, motif: ' ' })
		).rejects.toMatchObject({ code: 'INVALID' });
		await expect(
			strikePublication(testDb.db, mj, { id: 'absent', motif: 'Motif' })
		).rejects.toMatchObject({ status: 404 });
		await testDb.db
			.update(accounts)
			.set({ sessionVersion: 1 })
			.where(eq(accounts.id, mj.accountId));
		await expect(
			strikePublication(testDb.db, mj, { id: publication.id, motif: 'Motif' })
		).rejects.toMatchObject({ status: 401 });
		expect((await listHomeLeaves(testDb.db))[0]!.id).toBe(publication.id);
	});
	it.each(['mj', 'admin'] as const)('%s publie et rature', async (role) => {
		const publication = await publishExtract(testDb.db, actor(role), extract);
		expect(publication.struck).toBe(false);
		await strikePublication(testDb.db, actor(role), { id: publication.id, motif: 'Rature' });
		expect(await listHomeLeaves(testDb.db)).toEqual([]);
	});
	it.each(['joueur', 'designer', null] as const)(
		'refuse les publications au rôle %s',
		async (role) => {
			const denied = role ? actor(role) : null;
			const status = role ? 403 : 401;
			await expect(publishExtract(testDb.db, denied, extract)).rejects.toMatchObject({ status });
			await expect(
				strikePublication(testDb.db, denied, { id: 'id', motif: 'Rature' })
			).rejects.toMatchObject({ status });
		}
	);
});
