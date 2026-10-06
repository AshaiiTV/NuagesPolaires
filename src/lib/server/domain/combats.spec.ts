import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import {
	accounts,
	auditLog,
	beastObservations,
	beasts,
	characterHistory,
	characterItems,
	characters,
	combatParticipants,
	combats,
	declarations,
	oaths,
	publications,
	sceneParticipants,
	scenes,
	sessions,
	staffLog
} from '../db/schema';
import type { Actor, Role } from '../permissions';
import { bindRequestContext } from '../auth/context';
import { listConsequences, sheetForExport } from './characters';
import { addSummon, emptyAction } from '../../game/combat';
import { STATUS_IDS } from '../../game/combat/statuses';
import type { CloseTableInput } from '../../schemas/combats';
import {
	closeTable,
	createTable,
	getPlayerTable,
	getRecit,
	getTable,
	listRecits,
	listTables,
	recitAsText,
	saveTable,
	setShowEnemyNumbers,
	setVisibleToParticipants
} from './combats';

let testDb: TestDb;
const actor = (role: Role, characterId: string | null = null): Actor => {
	const actor: Actor = { accountId: `a_${role}`, pseudo: role, role, characterId };
	bindRequestContext(actor, {
		sessionId: `session_${role}`,
		sessionVersion: 0,
		ip: '127.0.0.1',
		origin: 'https://np.test',
		userAgent: 'Vitest'
	});
	return actor;
};
const mj = actor('mj');
const player = actor('joueur', 'p_a');
beforeEach(async () => {
	testDb = await createTestDb();
	const [oath] = await testDb.db.select().from(oaths).limit(1);
	await testDb.db
		.insert(characters)
		.values(['p_a', 'p_b', 'p_c'].map((id) => ({ id, name: id, oathId: oath.id })));
	await testDb.db.insert(accounts).values(
		(['mj', 'admin', 'designer', 'joueur'] as const).map((role) => ({
			id: `a_${role}`,
			pseudo: role,
			role,
			passwordHash: 'fixture',
			characterId: role === 'joueur' ? 'p_a' : null
		}))
	);
	await testDb.db.insert(sessions).values(
		(['mj', 'admin', 'designer', 'joueur'] as const).map((role) => ({
			id: `session_${role}`,
			accountId: `a_${role}`,
			sessionVersion: 0,
			expiresAt: new Date(Date.now() + 3600000)
		}))
	);
	await testDb.db.insert(beasts).values({
		id: 'b_loup',
		name: 'Loup',
		pv: 100,
		ep: 35,
		skill: 'Données réservées',
		adminNote: 'secret de créature'
	});
});
afterEach(async () => {
	await testDb?.close();
});
const open = () =>
	createTable(testDb.db, mj, {
		name: 'Col des brumes',
		discordUrl: 'https://discord.com/channels/1/2',
		characterIds: ['p_a', 'p_b'],
		beasts: [{ beastId: 'b_loup', qty: 3 }]
	});
function ending(id: string, expectedRevision: number): CloseTableInput {
	return {
		id,
		expectedRevision,
		consequences: ['p_a', 'p_b'].map((characterId) => ({
			characterId,
			pv: 18,
			ep: 20,
			em: 12,
			statuses: ['saignement'],
			xp: 10,
			drops: [{ name: 'Gemme Blanche', beastName: 'Loup' }],
			motif: 'combat archivé'
		})),
		recit: { title: 'Le col franchi', visibleToParticipants: true },
		extract: {
			text: 'Le col est franchi.\nLes brumes gardent la trace.',
			onHome: true,
			beastIds: ['b_loup']
		}
	};
}
async function counts() {
	return {
		history: (await testDb.db.select().from(characterHistory)).length,
		items: (await testDb.db.select().from(characterItems)).length,
		staff: (await testDb.db.select().from(staffLog)).length,
		audit: (await testDb.db.select().from(auditLog)).length,
		publications: (await testDb.db.select().from(publications)).length,
		observations: (await testDb.db.select().from(beastObservations)).length
	};
}

describe('La Table — audit 03 §8 et 04 §10.6', () => {
	it('archive sans changement et sans écrire de conséquence vide sur les fiches ou leur export', async () => {
		await testDb.db
			.update(characters)
			.set({
				statuses: [{ id: 'inspire', desc: 'Promesse tenue.', posedBy: 'mj', posedAt: 42 }]
			})
			.where(eq(characters.id, 'p_a'));
		await testDb.db.insert(characterItems).values({
			id: 'i_garde',
			characterId: 'p_a',
			name: 'Lettre gardée',
			category: 'Divers',
			qty: 2
		});
		const objetsAvant = await testDb.db.select().from(characterItems);
		const table = await open();
		const sheets = await testDb.db
			.select()
			.from(characters)
			.where(sql`${characters.id} in ('p_a', 'p_b')`);
		await closeTable(testDb.db, mj, {
			id: table.row.id,
			expectedRevision: 1,
			consequences: sheets.map((s) => ({
				characterId: s.id,
				pv: s.pvCur,
				ep: s.epCur,
				em: s.emCur,
				xp: 0,
				statuses: STATUS_IDS.filter((id) => s.statuses.some((status) => status.id === id)),
				drops: [],
				motif: 'Combat sans changement.'
			})),
			recit: { title: 'Le calme au col', visibleToParticipants: true }
		});
		expect(await testDb.db.select().from(characterHistory)).toEqual([]);
		expect(await testDb.db.select().from(characterItems)).toEqual(objetsAvant);
		expect((await listConsequences(testDb.db, player, {})).rows).toEqual([]);
		expect((await sheetForExport(testDb.db, player)).consequences).toEqual([]);
		expect((await getRecit(testDb.db, player, table.row.id)).title).toBe('Le calme au col');
		expect(
			(await testDb.db.select().from(combatParticipants)).every((p) => p.outcome?.xpGain === 0)
		).toBe(true);
	});
	it('ouvre une scène et clôt deux fiches en excluant une invocation', async () => {
		const table = await open();
		const state = addSummon(table.state, table.state.fighters[0]!.id, {
			name: 'Tortue',
			pv: 999,
			dmg: 4,
			actCost: 0,
			autoInterpose: true,
			rangeType: 'cac',
			ownerCharacterId: 'p_a'
		});
		state.notes = 'secret du MJ';
		state.log.push({
			n: 40,
			round: 1,
			kind: 'info',
			text: 'secret du journal',
			actorId: null,
			targetId: null,
			private: true
		});
		const saved = await saveTable(testDb.db, mj, {
			id: table.row.id,
			state,
			expectedRevision: 1,
			reason: 'manual'
		});
		expect(await testDb.db.select().from(combatParticipants)).toHaveLength(2);
		expect(await testDb.db.select().from(sceneParticipants)).toHaveLength(2);
		const result = await closeTable(testDb.db, mj, ending(table.row.id, saved.revision));
		expect(result.title).toBe('Le col franchi');
		const sheets = await testDb.db
			.select()
			.from(characters)
			.where(sql`${characters.id} in ('p_a', 'p_b')`);
		expect(sheets.map((s) => [s.pvCur, s.epCur, s.emCur, s.xp, s.revision])).toEqual([
			[18, 20, 12, 10, 2],
			[18, 20, 12, 10, 2]
		]);
		expect(sheets.every((s) => s.statuses[0]?.id === 'saignement')).toBe(true);
		const history = await testDb.db.select().from(characterHistory);
		expect(history).toHaveLength(12);
		expect(
			history.every(
				(h) =>
					h.actorRole === 'mj' &&
					h.actorName === 'mj' &&
					h.combatId === table.row.id &&
					h.motif === 'combat archivé' &&
					h.field &&
					h.oldValue !== null &&
					h.newValue !== null
			)
		).toBe(true);
		expect((await testDb.db.select().from(characterItems)).map((i) => i.description)).toEqual([
			'Obtenue sur : Loup',
			'Obtenue sur : Loup'
		]);
		expect(
			(await testDb.db.select().from(combatParticipants)).every((p) => p.outcome?.xpGain === 10)
		).toBe(true);
		const [scene] = await testDb.db.select().from(scenes);
		expect(scene).toMatchObject({
			status: 'close',
			title: 'Col des brumes',
			discordUrl: table.row.discordUrl
		});
		const [combat] = await testDb.db.select().from(combats);
		expect(combat).toMatchObject({ status: 'termine', revision: 3 });
		expect(combat.closedAt).not.toBeNull();
		expect(combat.publishedExtractId).not.toBeNull();
		expect(
			(await getRecit(testDb.db, player, combat.id)).log.some((e) => e.text.includes('secret'))
		).toBe(false);
		expect(await recitAsText(testDb.db, mj, combat.id)).toContain('secret');
		expect(await recitAsText(testDb.db, player, combat.id)).not.toContain('secret');
		expect((await counts()).publications).toBe(1);
	});
	it('annule aussi la première fiche si la révision de la seconde a changé', async () => {
		const table = await open();
		await testDb.db.update(characters).set({ revision: 2, xp: 7 }).where(eq(characters.id, 'p_b'));
		const before = await counts();
		await expect(closeTable(testDb.db, mj, ending(table.row.id, 1))).rejects.toMatchObject({
			status: 409,
			code: 'VERSION_CONFLICT'
		});
		expect(await counts()).toEqual(before);
		const [a] = await testDb.db.select().from(characters).where(eq(characters.id, 'p_a'));
		expect(a).toMatchObject({ pvCur: 30, xp: 0, revision: 1 });
		expect((await getTable(testDb.db, mj, table.row.id)).row.status).toBe('preparation');
		expect((await testDb.db.select().from(scenes))[0]!.status).toBe('ouverte');
	});
	it('annule toutes les écritures si la publication échoue après les conséquences', async () => {
		const table = await open();
		const input = ending(table.row.id, 1);
		input.extract!.beastIds = ['b_absente'];
		const before = await counts();
		await expect(closeTable(testDb.db, mj, input)).rejects.toMatchObject({ status: 404 });
		expect(await counts()).toEqual(before);
		expect((await testDb.db.select().from(characters)).every((s) => s.revision === 1)).toBe(true);
		expect((await testDb.db.select().from(combats))[0]!.closedAt).toBeNull();
		expect(
			(await testDb.db.select().from(combatParticipants)).every((p) => p.outcome === null)
		).toBe(true);
	});
	it('refuse la double clôture, même avec la nouvelle révision', async () => {
		const table = await open();
		await closeTable(testDb.db, mj, ending(table.row.id, 1));
		const before = await counts();
		await expect(closeTable(testDb.db, mj, ending(table.row.id, 2))).rejects.toMatchObject({
			status: 409
		});
		expect(await counts()).toEqual(before);
	});
	it('deux clôtures concurrentes donnent un succès et un conflit, sans double conséquence', async () => {
		const table = await open();
		const results = await Promise.allSettled([
			closeTable(testDb.db, mj, ending(table.row.id, 1)),
			closeTable(testDb.db, mj, ending(table.row.id, 1))
		]);
		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		const failure = results.find((r) => r.status === 'rejected');
		expect(failure?.status === 'rejected' ? failure.reason : null).toMatchObject({
			code: 'VERSION_CONFLICT',
			status: 409
		});
		expect(await testDb.db.select().from(characterHistory)).toHaveLength(12);
		expect(await testDb.db.select().from(publications)).toHaveLength(1);
	});
	it('applique applyXp et tamponne les niveaux et maxima obtenus', async () => {
		const table = await open();
		const input = ending(table.row.id, 1);
		input.consequences[0]!.xp = 35;
		await closeTable(testDb.db, mj, input);
		const [sheet] = await testDb.db.select().from(characters).where(eq(characters.id, 'p_a'));
		expect(sheet).toMatchObject({ level: 2, xp: 5 });
		expect(sheet.pvCur).toBe(sheet.pvMax);
		expect(
			(await testDb.db.select().from(characterHistory)).some(
				(h) => h.field === 'level' && h.oldValue === '1' && h.newValue === '2'
			)
		).toBe(true);
	});
	it('conserve les statuts IRP et incrémente un objet déjà en inventaire', async () => {
		await testDb.db
			.update(characters)
			.set({ statuses: [{ id: 'dette', desc: 'Dette narrative', posedBy: 'MJ', posedAt: 1 }] })
			.where(eq(characters.id, 'p_a'));
		await testDb.db.insert(characterItems).values({
			id: 'i_old',
			characterId: 'p_a',
			name: 'Gemme Blanche',
			category: 'Gemme',
			qty: 2
		});
		const table = await open();
		await closeTable(testDb.db, mj, ending(table.row.id, 1));
		expect(
			(await testDb.db.select().from(characterItems).where(eq(characterItems.id, 'i_old')))[0]!.qty
		).toBe(3);
		expect(
			(await testDb.db.select().from(characters).where(eq(characters.id, 'p_a')))[0]!.statuses.map(
				(s) => s.id
			)
		).toEqual(['dette', 'saignement']);
	});
	it('refuse les conséquences incomplètes et les ressources supérieures au maximum', async () => {
		const table = await open();
		const input = ending(table.row.id, 1);
		input.consequences.pop();
		await expect(closeTable(testDb.db, mj, input)).rejects.toMatchObject({ code: 'INVALID' });
		const overflow = ending(table.row.id, 1);
		overflow.consequences[1]!.pv = 500;
		await expect(closeTable(testDb.db, mj, overflow)).rejects.toMatchObject({ code: 'INVALID' });
		expect((await testDb.db.select().from(characters)).every((s) => s.revision === 1)).toBe(true);
	});
});

describe('relevé, révisions et récits', () => {
	it('sauve les actions complètes du moteur et refuse les états forgés', async () => {
		const table = await open();
		const fighterId = table.state.fighters[0]!.id;
		table.state.declarations[fighterId] = [emptyAction()];
		await saveTable(testDb.db, mj, {
			id: table.row.id,
			state: table.state,
			expectedRevision: 1,
			reason: 'auto'
		});
		expect((await getTable(testDb.db, mj, table.row.id)).state.declarations[fighterId]).toEqual([
			emptyAction()
		]);
		const badState = {
			...table.state,
			declarations: { [fighterId]: [{ action: 'frappe', secret: 'forgé' }] }
		};
		await expect(
			saveTable(testDb.db, mj, {
				id: table.row.id,
				state: badState,
				expectedRevision: 2,
				reason: 'auto'
			} as unknown as Parameters<typeof saveTable>[2])
		).rejects.toMatchObject({ code: 'INVALID' });
		await expect(
			saveTable(testDb.db, mj, {
				id: table.row.id,
				state: { ...table.state, id: 'autre' },
				expectedRevision: 2,
				reason: 'auto'
			})
		).rejects.toMatchObject({ code: 'INVALID' });
		expect((await getTable(testDb.db, mj, table.row.id)).revision).toBe(2);
	});
	it('annule sauvegarde et participants si une nouvelle fiche est absente', async () => {
		const table = await open();
		table.state.fighters[0]!.characterId = 'absent';
		await expect(
			saveTable(testDb.db, mj, {
				id: table.row.id,
				state: table.state,
				expectedRevision: 1,
				reason: 'auto'
			})
		).rejects.toMatchObject({ status: 404 });
		expect((await getTable(testDb.db, mj, table.row.id)).revision).toBe(1);
		expect(
			(await testDb.db.select().from(combatParticipants)).map((p) => p.characterId).sort()
		).toEqual(['p_a', 'p_b']);
	});
	it('annule une ouverture et les interrupteurs si le journal staff refuse une écriture', async () => {
		const table = await open();
		await testDb.db.execute(
			sql`alter table staff_log add constraint reject_mutation check (action not in ('table_ouverte', 'table_chiffres', 'table_visibilite')) not valid`
		);
		await expect(
			createTable(testDb.db, mj, { name: 'Seconde', characterIds: ['p_a'], beasts: [] })
		).rejects.toBeDefined();
		await expect(
			setShowEnemyNumbers(testDb.db, mj, { id: table.row.id, expectedRevision: 1, value: true })
		).rejects.toBeDefined();
		await expect(
			setVisibleToParticipants(testDb.db, mj, {
				id: table.row.id,
				expectedRevision: 1,
				value: false
			})
		).rejects.toBeDefined();
		expect(await testDb.db.select().from(combats)).toHaveLength(1);
		expect(await testDb.db.select().from(scenes)).toHaveLength(1);
		expect((await getTable(testDb.db, mj, table.row.id)).row).toMatchObject({
			revision: 1,
			showEnemyNumbers: false,
			visibleToParticipants: true
		});
	});
	it('projette LEGER / GRAVE / CRITIQUE sans notes, coûts, compétences ni chiffres adverses', async () => {
		const table = await open();
		table.state.notes = 'secret du MJ';
		const enemies = table.state.fighters.filter((f) => f.type === 'beast');
		[66, 33, 32].forEach((pv, index) => {
			enemies[index]!.pvCur = pv;
		});
		table.state.log.push({
			n: 100,
			round: 1,
			kind: 'damage',
			text: 'Loup 12345 données réservées',
			actorId: enemies[0]!.id,
			targetId: table.state.fighters[0]!.id
		});
		await saveTable(testDb.db, mj, {
			id: table.row.id,
			state: table.state,
			expectedRevision: 1,
			reason: 'auto'
		});
		await setVisibleToParticipants(testDb.db, mj, {
			id: table.row.id,
			value: true,
			expectedRevision: 2
		});
		const projected = await getPlayerTable(testDb.db, player, table.row.id);
		expect(
			projected.projection.fighters.filter((f) => f.type === 'beast').map((f) => f.condition)
		).toEqual(['LEGER', 'GRAVE', 'CRITIQUE']);
		const raw = JSON.stringify(projected);
		for (const key of [
			'secret',
			'12345',
			'skill',
			'gem',
			'history',
			'declarations',
			'ownerAccountId',
			'notes'
		])
			expect(raw).not.toContain(key);
		expect(
			projected.projection.fighters
				.filter((f) => f.type === 'beast')
				.every((f) => f.resources === undefined)
		).toBe(true);
		await setShowEnemyNumbers(testDb.db, mj, {
			id: table.row.id,
			value: true,
			expectedRevision: 3
		});
		expect(
			(await getPlayerTable(testDb.db, player, table.row.id)).projection.fighters.find(
				(f) => f.type === 'beast'
			)!.resources?.pvCur
		).toBe(66);
	});
	it('refuse un non participant, une Table invisible et un compte sans liaison', async () => {
		const table = await open();
		await setVisibleToParticipants(testDb.db, mj, {
			id: table.row.id,
			value: false,
			expectedRevision: 1
		});
		await expect(getPlayerTable(testDb.db, player, table.row.id)).rejects.toMatchObject({
			status: 404
		});
		await setVisibleToParticipants(testDb.db, mj, {
			id: table.row.id,
			value: true,
			expectedRevision: 2
		});
		await expect(
			getPlayerTable(testDb.db, actor('joueur', 'p_c'), table.row.id)
		).rejects.toMatchObject({ code: 'NOT_FOUND', message: "Cette Table n'est pas la tienne." });
		await expect(getPlayerTable(testDb.db, actor('joueur'), table.row.id)).rejects.toMatchObject({
			code: 'NOT_FOUND',
			message: "Cette Table n'est pas la tienne."
		});
	});
	it('refuse 428 et 409 pour chaque mutation de Table sans écriture partielle', async () => {
		const table = await open();
		for (const expectedRevision of [undefined, 999]) {
			const status = expectedRevision === undefined ? 428 : 409;
			await expect(
				saveTable(testDb.db, mj, {
					id: table.row.id,
					state: table.state,
					reason: 'manual',
					expectedRevision
				})
			).rejects.toMatchObject({ status });
			await expect(
				setShowEnemyNumbers(testDb.db, mj, { id: table.row.id, value: true, expectedRevision })
			).rejects.toMatchObject({ status });
			await expect(
				setVisibleToParticipants(testDb.db, mj, { id: table.row.id, value: true, expectedRevision })
			).rejects.toMatchObject({ status });
			await expect(
				closeTable(testDb.db, mj, { ...ending(table.row.id, 1), expectedRevision })
			).rejects.toMatchObject({ status });
		}
		expect((await getTable(testDb.db, mj, table.row.id)).revision).toBe(1);
	});
	it('les sauvegardes mettent à jour les participants et gardent leurs marque-pages', async () => {
		const table = await open();
		await testDb.db
			.update(sceneParticipants)
			.set({ bookmarkText: 'Ma phrase' })
			.where(eq(sceneParticipants.characterId, 'p_a'));
		table.state.fighters = table.state.fighters.filter((f) => f.characterId !== 'p_b');
		await saveTable(testDb.db, mj, {
			id: table.row.id,
			state: table.state,
			expectedRevision: 1,
			reason: 'round'
		});
		expect((await testDb.db.select().from(combatParticipants)).map((p) => p.characterId)).toEqual([
			'p_a'
		]);
		expect((await testDb.db.select().from(sceneParticipants))[0]!.bookmarkText).toBe('Ma phrase');
	});
	it('affiche les déclarations en attente, puis les absorbe au round sans toucher à la fiche', async () => {
		const table = await open();
		await testDb.db.insert(declarations).values({
			id: 'd_1',
			characterId: 'p_a',
			combatId: table.row.id,
			resource: 'ep',
			delta: -8,
			word: 'Esquive'
		});
		expect((await getTable(testDb.db, mj, table.row.id)).pendingDeclarations[0]!.text).toBe(
			'p_a déclare −8 EP (Esquive).'
		);
		await saveTable(testDb.db, mj, {
			id: table.row.id,
			state: table.state,
			expectedRevision: 1,
			reason: 'round'
		});
		expect((await getTable(testDb.db, mj, table.row.id)).pendingDeclarations).toEqual([]);
		expect(
			(await testDb.db.select().from(characters).where(eq(characters.id, 'p_a')))[0]!.epCur
		).toBe(50);
	});
	it('filtre les récits, conserve toutes les lignes du journal et cherche le titre', async () => {
		const table = await open();
		table.state.log = Array.from({ length: 45 }, (_, n) => ({
			n,
			round: 1,
			kind: 'round' as const,
			text: `Ligne ${n}`,
			actorId: null,
			targetId: null
		}));
		await saveTable(testDb.db, mj, {
			id: table.row.id,
			state: table.state,
			expectedRevision: 1,
			reason: 'manual'
		});
		await closeTable(testDb.db, mj, ending(table.row.id, 2));
		expect((await getRecit(testDb.db, player, table.row.id)).log).toHaveLength(46);
		expect(await listRecits(testDb.db, player, { page: 1, search: 'franchi' })).toHaveLength(1);
		expect(await listRecits(testDb.db, actor('joueur', 'p_c'), { page: 1 })).toEqual([]);
		await expect(getRecit(testDb.db, actor('joueur', 'p_c'), table.row.id)).rejects.toMatchObject({
			status: 404
		});
		await setVisibleToParticipants(testDb.db, mj, {
			id: table.row.id,
			value: false,
			expectedRevision: 3
		});
		expect(await listRecits(testDb.db, player, { page: 1 })).toEqual([]);
		expect(await listRecits(testDb.db, mj, { page: 1 })).toHaveLength(1);
		await expect(getRecit(testDb.db, player, table.row.id)).rejects.toMatchObject({ status: 404 });
	});
	it('pagine les récits à vingt et ne mute rien à la lecture', async () => {
		const table = await open();
		await testDb.db.insert(combats).values(
			Array.from({ length: 23 }, (_, n) => ({
				id: `c_arch_${n}`,
				name: `Récit ${n}`,
				status: 'termine' as const,
				state: { ...table.state, id: `c_arch_${n}` }
			}))
		);
		const before = await counts();
		expect(await listRecits(testDb.db, mj, { page: 1 })).toHaveLength(20);
		expect(await listRecits(testDb.db, mj, { page: 2 })).toHaveLength(3);
		await getTable(testDb.db, mj, table.row.id);
		expect(await counts()).toEqual(before);
	});
	it('refuse une session révoquée et un rôle périmé dans la transaction', async () => {
		const table = await open();
		await testDb.db
			.update(accounts)
			.set({ sessionVersion: 1 })
			.where(eq(accounts.id, mj.accountId));
		await expect(closeTable(testDb.db, mj, ending(table.row.id, 1))).rejects.toMatchObject({
			status: 401
		});
		await testDb.db.update(accounts).set({ role: 'designer' }).where(eq(accounts.id, mj.accountId));
		await expect(
			setShowEnemyNumbers(testDb.db, mj, { id: table.row.id, value: true, expectedRevision: 1 })
		).rejects.toMatchObject({ status: 401 });
		expect((await getTable(testDb.db, mj, table.row.id)).revision).toBe(1);
	});
	it('refuse la session exacte supprimée, expirée ou restreinte, malgré une autre session valide', async () => {
		const table = await open();
		await testDb.db.insert(sessions).values({
			id: 'autre_session',
			accountId: mj.accountId,
			sessionVersion: 0,
			expiresAt: new Date(Date.now() + 3600000)
		});
		await testDb.db.delete(sessions).where(eq(sessions.id, 'session_mj'));
		await expect(closeTable(testDb.db, mj, ending(table.row.id, 1))).rejects.toMatchObject({
			status: 401
		});
		await testDb.db.insert(sessions).values({
			id: 'session_mj',
			accountId: mj.accountId,
			sessionVersion: 0,
			createdAt: new Date(Date.now() - 60000),
			expiresAt: new Date(Date.now() - 1000)
		});
		await expect(closeTable(testDb.db, mj, ending(table.row.id, 1))).rejects.toMatchObject({
			status: 401
		});
		await testDb.db
			.update(sessions)
			.set({ scope: 'reset', expiresAt: new Date(Date.now() + 3600000) })
			.where(eq(sessions.id, 'session_mj'));
		await expect(closeTable(testDb.db, mj, ending(table.row.id, 1))).rejects.toMatchObject({
			status: 401
		});
		expect((await getTable(testDb.db, mj, table.row.id)).revision).toBe(1);
	});
});

describe('permissions de la Table', () => {
	it.each(['mj', 'admin'] as const)('%s conduit, sauvegarde et clôt la Table', async (role) => {
		const staff = actor(role);
		const table = await createTable(testDb.db, staff, {
			name: 'Table',
			characterIds: ['p_a', 'p_b'],
			beasts: []
		});
		expect(await listTables(testDb.db, staff, {})).toHaveLength(1);
		expect((await getTable(testDb.db, staff, table.row.id)).revision).toBe(1);
		await setShowEnemyNumbers(testDb.db, staff, {
			id: table.row.id,
			value: true,
			expectedRevision: 1
		});
		await setVisibleToParticipants(testDb.db, staff, {
			id: table.row.id,
			value: true,
			expectedRevision: 2
		});
		await saveTable(testDb.db, staff, {
			id: table.row.id,
			state: table.state,
			expectedRevision: 3,
			reason: 'manual'
		});
		await closeTable(testDb.db, staff, ending(table.row.id, 4));
		expect(await listRecits(testDb.db, staff, { page: 1 })).toHaveLength(1);
		expect(await recitAsText(testDb.db, staff, table.row.id)).toContain('Le col franchi');
	});
	it.each(['joueur', 'designer', null] as const)(
		'refuse les opérations staff au rôle %s',
		async (role) => {
			const denied = role ? actor(role, role === 'joueur' ? 'p_a' : null) : null;
			const table = await open();
			const status = role ? 403 : 401;
			for (const call of [
				() => listTables(testDb.db, denied, {}),
				() => createTable(testDb.db, denied, { name: 'Refus', characterIds: [], beasts: [] }),
				() => getTable(testDb.db, denied, table.row.id),
				() =>
					saveTable(testDb.db, denied, {
						id: table.row.id,
						state: table.state,
						expectedRevision: 1,
						reason: 'manual'
					}),
				() =>
					setShowEnemyNumbers(testDb.db, denied, {
						id: table.row.id,
						value: true,
						expectedRevision: 1
					}),
				() =>
					setVisibleToParticipants(testDb.db, denied, {
						id: table.row.id,
						value: true,
						expectedRevision: 1
					}),
				() => closeTable(testDb.db, denied, ending(table.row.id, 1))
			])
				await expect(call()).rejects.toMatchObject({ status });
			if (role !== 'joueur') {
				await expect(listRecits(testDb.db, denied, { page: 1 })).rejects.toMatchObject({ status });
				await expect(getRecit(testDb.db, denied, table.row.id)).rejects.toMatchObject({ status });
				await expect(recitAsText(testDb.db, denied, table.row.id)).rejects.toMatchObject({
					status
				});
			}
		}
	);
});
