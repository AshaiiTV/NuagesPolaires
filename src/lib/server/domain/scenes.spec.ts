// Scènes : qui ouvre, qui écrit, épingles, clôture, fermeture automatique après 14 jours.
// Intégration sur PGlite (createTestDb + jeu de démonstration).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import { DEMO_IDS } from '../db/seed';
import * as schema from '../db/schema';
import type { Actor } from '../permissions';
import { channelFromTitle } from '../../schemas/scenes';
import {
	autoCloseScenes,
	closeScene,
	getSceneContext,
	listOpenScenes,
	openScene,
	pin,
	setOpenQuestion,
	setSummary,
	unpin
} from './scenes';

const A = DEMO_IDS.accounts;
const P = DEMO_IDS.characters;
const S = DEMO_IDS.scene;
const URL = 'https://discord.com/channels/demo/col-des-brumes';

const actors = {
	admin: { accountId: A.admin, role: 'admin', characterId: null, pseudo: 'admin' },
	alice: { accountId: A.alice, role: 'joueur', characterId: P.aria, pseudo: 'alice' },
	bob: { accountId: A.bob, role: 'joueur', characterId: P.kael, pseudo: 'bob' },
	mj: { accountId: A.mj, role: 'mj', characterId: null, pseudo: 'mj' },
	designer: { accountId: A.designer, role: 'designer', characterId: null, pseudo: 'designer' },
	nova: { accountId: A.nova, role: 'joueur', characterId: null, pseudo: 'nova' }
} satisfies Record<string, Actor>;

const DAY = 86_400_000;
let t: TestDb;

async function sceneCount(): Promise<number> {
	return (await t.db.select({ id: schema.scenes.id }).from(schema.scenes)).length;
}

beforeAll(async () => {
	t = await createTestDb({ demo: true });
});
afterAll(async () => {
	await t.close();
});

describe('channelFromTitle', () => {
	it('prend le #salon du titre, sinon réduit le titre', () => {
		expect(channelFromTitle('Embuscade #Col-des-brumes')).toBe('#col-des-brumes');
		expect(channelFromTitle('Brume sur la forêt-centre')).toBe('#brume-sur-la-foret-centre');
		expect(channelFromTitle('   ')).toBe('');
	});
});

describe('openScene — qui ouvre', () => {
	it('un joueur ouvre pour lui-même', async () => {
		const view = await openScene(t.db, actors.alice, { title: 'Col des brumes', discordUrl: URL });
		expect(view).toMatchObject({
			title: 'Col des brumes',
			channel: '#col-des-brumes',
			discordUrl: URL,
			status: 'ouverte',
			summary: '',
			openQuestion: '',
			participants: [{ characterId: P.aria, name: 'Aria Lunval', me: true }],
			pins: [],
			bookmark: null,
			revision: 1
		});
		expect(view.id).toMatch(/^s_/);
		const [audit] = await t.db
			.select()
			.from(schema.auditLog)
			.where(eq(schema.auditLog.action, 'scene_open'));
		expect(audit.details).toMatchObject({ sceneId: view.id, characterIds: [P.aria] });
		// Aucune ligne de journal staff pour un joueur.
		const logs = await t.db
			.select()
			.from(schema.staffLog)
			.where(eq(schema.staffLog.action, 'scene_ouverte'));
		expect(logs).toHaveLength(0);
	});

	it('un joueur ne peut pas ouvrir pour un autre ; compte sans personnage, visiteur', async () => {
		await expect(
			openScene(t.db, actors.alice, { title: 'X', discordUrl: URL, characterIds: [P.kael] })
		).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
		const own = await openScene(t.db, actors.alice, {
			title: 'Seule',
			discordUrl: URL,
			characterIds: [P.aria]
		});
		expect(own.participants).toHaveLength(1);
		await expect(
			openScene(t.db, actors.nova, { title: 'X', discordUrl: URL })
		).rejects.toMatchObject({
			code: 'NOT_LINKED'
		});
		await expect(
			openScene(t.db, actors.designer, { title: 'X', discordUrl: URL })
		).rejects.toMatchObject({
			code: 'NOT_LINKED'
		});
		await expect(openScene(t.db, null, { title: 'X', discordUrl: URL })).rejects.toMatchObject({
			status: 401
		});
	});

	it('titre et lien du salon obligatoires, lien Discord seulement', async () => {
		await expect(
			openScene(t.db, actors.alice, { title: '', discordUrl: URL })
		).rejects.toMatchObject({
			code: 'INVALID',
			message: 'Donne un titre à la scène.'
		});
		await expect(openScene(t.db, actors.alice, { title: 'X' } as never)).rejects.toMatchObject({
			code: 'INVALID',
			message: 'Le lien du salon est obligatoire.'
		});
		await expect(
			openScene(t.db, actors.alice, { title: 'X', discordUrl: 'https://exemple.org/salon' })
		).rejects.toMatchObject({ code: 'INVALID' });
	});

	it('un MJ ou un administrateur ouvre pour plusieurs personnages ; journal staff', async () => {
		const view = await openScene(t.db, actors.mj, {
			title: 'Conseil #arbre-geant',
			discordUrl: URL,
			characterIds: [P.kael, P.aria, P.kael]
		});
		expect(view.participants.map((p) => p.name)).toEqual(['Aria Lunval', 'Kael Morvan']);
		expect(view.channel).toBe('#arbre-geant');
		const [log] = await t.db
			.select()
			.from(schema.staffLog)
			.where(eq(schema.staffLog.action, 'scene_ouverte'));
		expect(log.detail).toBe("Scène 'Conseil #arbre-geant' ouverte pour Aria Lunval, Kael Morvan");
		await expect(
			openScene(t.db, actors.admin, { title: 'Vide', discordUrl: URL })
		).rejects.toMatchObject({
			code: 'INVALID'
		});
	});

	it('personnage inconnu : 404 et rien n’est écrit (transaction)', async () => {
		const before = await sceneCount();
		await expect(
			openScene(t.db, actors.mj, {
				title: 'Fantôme',
				discordUrl: URL,
				characterIds: [P.aria, 'p_absent']
			})
		).rejects.toMatchObject({ code: 'NOT_FOUND' });
		expect(await sceneCount()).toBe(before);
	});
});

describe('listOpenScenes et getSceneContext', () => {
	it('chacun voit ses scènes ; le staff les voit toutes ; épingles personnelles', async () => {
		const scene = await openScene(t.db, actors.mj, {
			title: 'Partagée',
			discordUrl: URL,
			characterIds: [P.aria, P.kael]
		});
		await pin(t.db, actors.alice, {
			sceneId: scene.id,
			kind: 'regle',
			ref: 'esquive',
			note: 'coûte 8 EP'
		});
		await pin(t.db, actors.bob, { sceneId: scene.id, kind: 'objet', ref: 'i_demo_kael_potion' });

		const alice = await listOpenScenes(t.db, actors.alice);
		const bob = await listOpenScenes(t.db, actors.bob);
		const mj = await listOpenScenes(t.db, actors.mj);
		expect(alice.some((s) => s.title === 'Col des brumes')).toBe(true);
		expect(bob.some((s) => s.title === 'Col des brumes')).toBe(false);
		expect(bob.map((s) => s.id)).toContain(S);
		expect(mj.length).toBeGreaterThanOrEqual(alice.length);
		expect(mj.map((s) => s.id)).toEqual(
			expect.arrayContaining([...alice, ...bob].map((s) => s.id))
		);
		expect(await listOpenScenes(t.db, actors.nova)).toEqual([]);
		await expect(listOpenScenes(t.db, null)).rejects.toMatchObject({ status: 401 });

		const aliceView = alice.find((s) => s.id === scene.id)!;
		expect(aliceView.pins).toEqual([
			expect.objectContaining({ kind: 'regle', ref: 'esquive', note: 'coûte 8 EP', mine: true })
		]);
		expect(bob.find((s) => s.id === scene.id)!.pins.map((p) => p.ref)).toEqual([
			'i_demo_kael_potion'
		]);
		expect(mj.find((s) => s.id === scene.id)!.pins).toHaveLength(2);

		// Marque-page de scène du jeu de démonstration (Aria).
		expect(alice.find((s) => s.id === S)?.bookmark).toEqual({
			text: 'Je venais de trouver les cendres encore tièdes.',
			url: ''
		});
		expect(bob.find((s) => s.id === S)?.bookmark).toBeNull();
	});

	it('contexte du feuillet : la scène la plus récente, et la Table montrée aux participants', async () => {
		const ctx = await getSceneContext(t.db, actors.bob);
		expect(ctx.scene).not.toBeNull();
		expect(ctx.table).toMatchObject({ id: DEMO_IDS.openCombat, round: 2 });
		expect(ctx.channel).toBe(ctx.scene!.channel);

		await t.db.insert(schema.combats).values([
			{ id: 'c_cache', name: 'Cachée', status: 'en_cours', round: 2 },
			{
				id: 'c_table',
				name: 'Col des brumes',
				status: 'en_cours',
				round: 3,
				phase: 'declarations',
				visibleToParticipants: true,
				discordUrl: URL
			}
		]);
		await t.db.insert(schema.combatParticipants).values([
			{ combatId: 'c_cache', characterId: P.kael },
			{ combatId: 'c_table', characterId: P.kael }
		]);
		const withTable = await getSceneContext(t.db, actors.bob);
		expect(withTable.table).toEqual({
			id: 'c_table',
			name: 'Col des brumes',
			discordUrl: URL,
			round: 3,
			phase: 'declarations',
			status: 'en_cours'
		});
		expect(await getSceneContext(t.db, actors.nova)).toEqual({
			scene: null,
			table: null,
			channel: null
		});
		await expect(getSceneContext(t.db, null)).rejects.toMatchObject({ status: 401 });
	});
});

describe('setSummary, setOpenQuestion — où nous en sommes', () => {
	it('participant : écrit, révision, activité ; 428 et 409', async () => {
		const scene = await openScene(t.db, actors.alice, { title: 'Résumé', discordUrl: URL });
		const view = await setSummary(t.db, actors.alice, {
			sceneId: scene.id,
			summary: 'Nous suivons la piste.\r\nLa brume monte.',
			expectedRevision: 1
		});
		expect(view).toMatchObject({ summary: 'Nous suivons la piste.\nLa brume monte.', revision: 2 });
		await expect(
			setSummary(t.db, actors.alice, { sceneId: scene.id, summary: 'x' } as never)
		).rejects.toMatchObject({ code: 'VERSION_REQUIRED', status: 428 });
		await expect(
			setSummary(t.db, actors.alice, { sceneId: scene.id, summary: 'écrasé', expectedRevision: 1 })
		).rejects.toMatchObject({ code: 'VERSION_CONFLICT', status: 409 });
		const [row] = await t.db.select().from(schema.scenes).where(eq(schema.scenes.id, scene.id));
		expect(row.summary).toBe('Nous suivons la piste.\nLa brume monte.');

		const q = await setOpenQuestion(t.db, actors.alice, {
			sceneId: scene.id,
			openQuestion: 'Qui a allumé le feu ?',
			expectedRevision: 2
		});
		expect(q).toMatchObject({ openQuestion: 'Qui a allumé le feu ?', revision: 3 });
	});

	it('non participant : 404 ; MJ et administrateur : oui (journal staff) ; designer : non', async () => {
		const scene = await openScene(t.db, actors.alice, { title: 'Privée', discordUrl: URL });
		await expect(
			setSummary(t.db, actors.bob, { sceneId: scene.id, summary: 'x', expectedRevision: 1 })
		).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
		await expect(
			setOpenQuestion(t.db, actors.designer, {
				sceneId: scene.id,
				openQuestion: 'x',
				expectedRevision: 1
			})
		).rejects.toMatchObject({ code: 'NOT_FOUND' });
		const view = await setSummary(t.db, actors.mj, {
			sceneId: scene.id,
			summary: 'Noté par le MJ.',
			expectedRevision: 1
		});
		expect(view.summary).toBe('Noté par le MJ.');
		const logs = await t.db
			.select()
			.from(schema.staffLog)
			.where(eq(schema.staffLog.action, 'scene_resume'));
		expect(logs.length).toBeGreaterThanOrEqual(1);
		await setOpenQuestion(t.db, actors.admin, {
			sceneId: scene.id,
			openQuestion: 'Et après ?',
			expectedRevision: 2
		});
		await expect(
			setSummary(t.db, actors.mj, { sceneId: 's_absente', summary: 'x', expectedRevision: 1 })
		).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'Cette scène est introuvable.' });
	});
});

describe('pin, unpin — la marge', () => {
	it('épingle une fois, retire, refuse la marge d’un autre', async () => {
		const scene = await openScene(t.db, actors.mj, {
			title: 'Épingles',
			discordUrl: URL,
			characterIds: [P.aria, P.kael]
		});
		const first = await pin(t.db, actors.alice, {
			sceneId: scene.id,
			kind: 'capacite',
			ref: 'elan-1'
		});
		expect(first.pins).toHaveLength(1);
		let view = await pin(t.db, actors.alice, {
			sceneId: scene.id,
			kind: 'capacite',
			ref: 'elan-1'
		});
		expect(view.pins).toHaveLength(1);
		const pinId = view.pins[0].id;
		await expect(unpin(t.db, actors.bob, { pinId })).rejects.toMatchObject({ code: 'NOT_FOUND' });
		await expect(
			pin(t.db, actors.alice, { sceneId: scene.id, kind: 'sort', ref: 'x' } as never)
		).rejects.toMatchObject({
			code: 'INVALID'
		});
		view = await unpin(t.db, actors.alice, { pinId });
		expect(view.pins).toEqual([]);
		await expect(
			pin(t.db, actors.mj, { sceneId: scene.id, kind: 'regle', ref: 'x' })
		).rejects.toMatchObject({
			code: 'NOT_LINKED'
		});
		const other = await openScene(t.db, actors.alice, { title: 'À moi', discordUrl: URL });
		await expect(
			pin(t.db, actors.bob, { sceneId: other.id, kind: 'regle', ref: 'x' })
		).rejects.toMatchObject({
			code: 'NOT_FOUND'
		});
	});

	it('la marge tient 24 épingles', async () => {
		const scene = await openScene(t.db, actors.bob, { title: 'Pleine', discordUrl: URL });
		await t.db.insert(schema.scenePins).values(
			Array.from({ length: 24 }, (_, i) => ({
				id: `sp_plein_${i}`,
				sceneId: scene.id,
				characterId: P.kael,
				kind: 'regle' as const,
				ref: `r${i}`
			}))
		);
		await expect(
			pin(t.db, actors.bob, { sceneId: scene.id, kind: 'regle', ref: 'r99' })
		).rejects.toMatchObject({
			code: 'INVALID'
		});
	});
});

describe('closeScene — clore', () => {
	it('participant non auteur : refus ; auteur : oui ; refermée : SCENE_CLOSED', async () => {
		const scene = await openScene(t.db, actors.mj, {
			title: 'À clore',
			discordUrl: URL,
			characterIds: [P.aria]
		});
		await expect(
			closeScene(t.db, actors.alice, { sceneId: scene.id, expectedRevision: 1 })
		).rejects.toMatchObject({
			code: 'FORBIDDEN'
		});
		await expect(
			closeScene(t.db, actors.bob, { sceneId: scene.id, expectedRevision: 1 })
		).rejects.toMatchObject({
			code: 'NOT_FOUND'
		});
		const own = await openScene(t.db, actors.alice, { title: 'La mienne', discordUrl: URL });
		await expect(
			closeScene(t.db, actors.alice, { sceneId: own.id, expectedRevision: 9 })
		).rejects.toMatchObject({
			code: 'VERSION_CONFLICT'
		});
		const closed = await closeScene(t.db, actors.alice, { sceneId: own.id, expectedRevision: 1 });
		expect(closed).toMatchObject({ status: 'close', autoClosed: false, revision: 2 });
		expect(closed.closedAt).not.toBeNull();
		await expect(
			closeScene(t.db, actors.alice, { sceneId: own.id, expectedRevision: 2 })
		).rejects.toMatchObject({
			code: 'SCENE_CLOSED',
			status: 409
		});
		await expect(
			setSummary(t.db, actors.alice, { sceneId: own.id, summary: 'x', expectedRevision: 2 })
		).rejects.toMatchObject({ code: 'SCENE_CLOSED' });
		expect((await listOpenScenes(t.db, actors.alice)).map((s) => s.id)).not.toContain(own.id);

		const byMj = await closeScene(t.db, actors.mj, { sceneId: scene.id, expectedRevision: 1 });
		expect(byMj.status).toBe('close');
		const logs = await t.db
			.select()
			.from(schema.staffLog)
			.where(eq(schema.staffLog.action, 'scene_close'));
		expect(logs).toHaveLength(1);
	});
});

describe('autoCloseScenes — 14 jours sans activité', () => {
	it('referme, écrit « refermée d’elle-même » chez chaque participant, audite ; idempotent', async () => {
		const db = await createTestDb({ demo: true });
		try {
			const now = new Date();
			await db.db.insert(schema.scenes).values([
				{
					id: 's_vieille',
					title: 'Vieille piste',
					discordUrl: URL,
					lastActivityAt: new Date(now.getTime() - 15 * DAY)
				},
				{
					id: 's_recente',
					title: 'Récente',
					discordUrl: URL,
					lastActivityAt: new Date(now.getTime() - 13 * DAY)
				}
			]);
			await db.db.insert(schema.sceneParticipants).values([
				{ sceneId: 's_vieille', characterId: P.aria },
				{ sceneId: 's_vieille', characterId: P.kael }
			]);
			expect(await autoCloseScenes(db.db, now)).toEqual({ closed: ['s_vieille'] });
			const [row] = await db.db
				.select()
				.from(schema.scenes)
				.where(eq(schema.scenes.id, 's_vieille'));
			expect(row).toMatchObject({ status: 'close', autoClosed: true, revision: 2 });
			const [recent] = await db.db
				.select()
				.from(schema.scenes)
				.where(eq(schema.scenes.id, 's_recente'));
			expect(recent.status).toBe('ouverte');
			const history = await db.db
				.select()
				.from(schema.characterHistory)
				.where(and(eq(schema.characterHistory.type, 'scene')));
			expect(history.map((h) => h.characterId).sort()).toEqual([P.aria, P.kael]);
			expect(history[0].text).toMatch(
				/^Scène « Vieille piste » refermée d’elle-même · \d{1,2} \S+\.$/
			);
			expect(history[0].actorRole).toBe('regles');
			const audits = await db.db
				.select()
				.from(schema.auditLog)
				.where(eq(schema.auditLog.action, 'scene_auto_close'));
			expect(audits).toHaveLength(1);
			expect(await autoCloseScenes(db.db, now)).toEqual({ closed: [] });
		} finally {
			await db.close();
		}
	});
});
