// Ruban, cornes et marque-page : pages calculées par requête, signet par compte, marque-page.
// Intégration sur PGlite (createTestDb + jeu de démonstration).
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import { DEMO_IDS } from '../db/seed';
import * as schema from '../db/schema';
import type { Actor } from '../permissions';
import { getLastPages, hasCorners, openPage, setBookmark, unfoldAll } from './reading';
import { notifyEvent } from './events';

const A = DEMO_IDS.accounts;
const P = DEMO_IDS.characters;
const E = DEMO_IDS.events;

const actors = {
	alice: { accountId: A.alice, role: 'joueur', characterId: P.aria, pseudo: 'alice' },
	bob: { accountId: A.bob, role: 'joueur', characterId: P.kael, pseudo: 'bob' },
	mj: { accountId: A.mj, role: 'mj', characterId: null, pseudo: 'mj' },
	nova: { accountId: A.nova, role: 'joueur', characterId: null, pseudo: 'nova' }
} satisfies Record<string, Actor>;

const DAY = 86_400_000;
const ago = (ms: number) => new Date(Date.now() - ms);

describe('getLastPages — jeu de démonstration', () => {
	let t: TestDb;
	beforeAll(async () => {
		t = await createTestDb({ demo: true });
	});
	afterAll(async () => {
		await t.close();
	});
	it('ne répète ni le salon ni la scène automatique d’une Table ouverte', async () => {
		const id = 's_double_table';
		await t.db.insert(schema.scenes).values({
			id,
			title: 'Aux racines de la lisière',
			status: 'ouverte',
			combatId: DEMO_IDS.openCombat,
			discordUrl: 'https://discord.com/channels/demo/lisiere-du-canyon'
		});
		await t.db.insert(schema.sceneParticipants).values({ sceneId: id, characterId: P.aria });
		try {
			const vue = await getLastPages(t.db, actors.alice);
			expect(vue.waiting.map((w) => w.kind)).toEqual(['scene', 'table', 'event']);
			expect(vue.waiting.some((w) => w.id === id)).toBe(false);
			expect(vue.waiting.filter((w) => w.kind === 'table')).toHaveLength(1);
		} finally {
			await t.db.delete(schema.scenes).where(eq(schema.scenes.id, id));
		}
	});

	it('Alice : fiche, signet, marque-page, ce qui attend, depuis, ce qui vient', async () => {
		const view = await getLastPages(t.db, actors.alice);
		expect(view.state).toBe('linked');
		expect(view.pseudo).toBe('alice');
		expect(view.sheet).toMatchObject({
			id: P.aria,
			name: 'Aria Lunval',
			oathName: 'Duelliste',
			rank: 'basic',
			rankLabel: 'Basique',
			level: 7,
			xp: 140,
			xpMax: 210,
			pv: { cur: 51, max: 66 },
			ep: { cur: 70, max: 86 },
			em: { cur: 32, max: 32 },
			pendingDeclared: { pv: 0, ep: 0, em: 0 }
		});
		expect(view.bookmark).toEqual({ text: 'Reprendre au gué.', url: '' });
		expect(view.daysAway).toBeGreaterThanOrEqual(2);
		expect(view.daysAway).toBeLessThanOrEqual(3);

		// Ordre imposé : scène ouverte d'abord, puis le rendez-vous où Aria vient.
		expect(view.waiting.map((w) => w.kind)).toEqual(['scene', 'table', 'event']);
		expect(view.waiting[0]).toMatchObject({
			id: DEMO_IDS.scene,
			text: 'Scène ouverte · #brume-sur-la-foret-centre',
			href: '/carnet/scene',
			discordUrl: 'https://discord.com/channels/demo/foret-centre'
		});
		expect(view.waiting[1].id).toBe(DEMO_IDS.openCombat);
		expect(view.waiting[2].text).toMatch(/^Rendez-vous .+ — tu viens$/);

		// Depuis la dernière lecture (−3 j) : le tampon du MJ (−2 j) puis la note en scène (−1 j).
		expect(view.since.map((l) => l.text)).toEqual([
			'Un MJ a tamponné ta fiche — PV : 66 → 51.',
			expect.stringMatching(/^Ta note du .+ · notée en scène$/)
		]);
		expect(view.since.every((l) => l.cornered)).toBe(true);
		expect(view.since[0].id).toMatch(/^s:\d+$/);
		expect(view.since[1]).toMatchObject({ id: 'j:j_demo_aria_2', href: '/carnet/journal' });
		expect(view.sincePage).toBe(1);
		expect(view.sincePages).toBe(1);

		expect(view.upcoming.map((e) => e.id)).toEqual([E.chasse, E.conseil]);
		expect(view.upcoming[0].registered).toBe(true);
	});

	it('compte en attente : état « pending », rien d’écrit, l’agenda reste lisible', async () => {
		const view = await getLastPages(t.db, actors.nova);
		expect(view).toMatchObject({
			state: 'pending',
			sheet: null,
			waiting: [],
			since: [],
			pseudo: 'nova'
		});
		expect(view.upcoming).toHaveLength(2);
		expect(view.upcoming.every((e) => e.closedReason === 'unlinked')).toBe(true);
		expect(await hasCorners(t.db, actors.nova)).toBe(false);
	});

	it('liaison vers une fiche introuvable : état « unavailable »', async () => {
		const view = await getLastPages(t.db, { ...actors.nova, characterId: 'p_disparu' });
		expect(view.state).toBe('unavailable');
		expect(view.sheet).toBeNull();
	});

	it('visiteur : 401', async () => {
		await expect(getLastPages(t.db, null)).rejects.toMatchObject({ status: 401 });
		await expect(hasCorners(t.db, null)).rejects.toMatchObject({ status: 401 });
		await expect(unfoldAll(t.db, null)).rejects.toMatchObject({ status: 401 });
	});

	it('sans signet : tout ce qui suit la création du compte est à lire', async () => {
		// Bob n'a pas de signet ; son historique de combat (−10 j) précède la création du compte.
		expect(await hasCorners(t.db, actors.bob)).toBe(false);
		await t.db.insert(schema.characterHistory).values({
			characterId: P.kael,
			type: 'stat',
			text: 'EP : 44 → 40.',
			actorName: 'MJ mj',
			actorAccountId: A.mj,
			actorRole: 'mj',
			field: 'ep',
			oldValue: '44',
			newValue: '40',
			motif: 'Fatigue du gué.'
		});
		expect(await hasCorners(t.db, actors.bob)).toBe(true);
		// Les pages de Bob ne sont pas celles d'Alice.
		const alice = await getLastPages(t.db, actors.alice);
		expect(alice.since.some((l) => l.text.includes('EP : 44 → 40.'))).toBe(false);
	});
});

describe('les sources de pages', () => {
	let t: TestDb;
	beforeEach(async () => {
		t = await createTestDb({ demo: true });
		// Signet d'Alice posé il y a une heure : seules les pages écrites ensuite comptent.
		await t.db
			.update(schema.readingMarks)
			.set({ lastReadAt: ago(3_600_000) })
			.where(eq(schema.readingMarks.accountId, A.alice));
	});
	afterEach(async () => {
		await t.close();
	});

	it('chaque source écrit sa ligne dans la voix du carnet, chronologiquement', async () => {
		const at = (minutes: number) => ago(minutes * 60_000);
		const history = (values: Partial<typeof schema.characterHistory.$inferInsert>) =>
			t.db.insert(schema.characterHistory).values({
				characterId: P.aria,
				type: 'stat',
				text: 'texte',
				actorName: 'MJ mj',
				...values
			});
		// Tampon admin hors combat.
		await history({
			ts: at(50),
			actorRole: 'admin',
			actorAccountId: A.admin,
			motif: 'Correction',
			text: 'XP : 120 → 150.'
		});
		// Non-pages : écriture du joueur, MJ sans motif, entrée masquée.
		await history({ ts: at(49), actorRole: 'joueur', motif: 'moi' });
		await history({ ts: at(48), actorRole: 'mj', motif: '' });
		await history({ ts: at(47), actorRole: 'mj', motif: 'masquée', dismissed: true });
		// Combat clos, lisible par ses participants, tamponné deux fois : une ligne de tampon, une de récit.
		await t.db.insert(schema.combats).values({
			id: 'c_test_col',
			name: 'Col des brumes',
			status: 'termine',
			visibleToParticipants: true,
			closedAt: at(38)
		});
		await t.db
			.insert(schema.combatParticipants)
			.values({ combatId: 'c_test_col', characterId: P.aria });
		await history({
			ts: at(41),
			actorRole: 'mj',
			motif: 'Clôture',
			combatId: 'c_test_col',
			type: 'combat'
		});
		await history({
			ts: at(40),
			actorRole: 'mj',
			motif: 'Clôture',
			combatId: 'c_test_col',
			type: 'xp'
		});
		// Combat clos mais non montré aux participants : pas de récit.
		await t.db
			.insert(schema.combats)
			.values({ id: 'c_test_cache', name: 'Caché', status: 'termine', closedAt: at(39) });
		await t.db
			.insert(schema.combatParticipants)
			.values({ combatId: 'c_test_cache', characterId: P.aria });
		// Faits : validé, puis réglé ; un fait proposé n'est pas une page.
		await t.db.insert(schema.validatedFacts).values([
			{
				id: 'f_test_dette',
				characterId: P.aria,
				kind: 'dette',
				counterpart: 'envers Kael',
				text: 'Il m’a couverte au gué.',
				status: 'validated',
				validatedBy: A.mj,
				validatedAt: at(30)
			},
			{
				id: 'f_test_promesse',
				characterId: P.aria,
				kind: 'promesse',
				counterpart: 'envers le conseil',
				text: 'Revenir.',
				status: 'settled',
				validatedBy: A.admin,
				validatedAt: at(2 * 24 * 60),
				settledAt: at(25)
			},
			{
				id: 'f_test_propose',
				characterId: P.aria,
				kind: 'alliance',
				text: 'À voir.',
				status: 'proposed'
			}
		]);
		// Déclarations : reportée, non reportée, rayée par un MJ ; en attente (somme en tête), rayée par soi.
		await t.db.insert(schema.declarations).values([
			{
				id: 'd_test_rep',
				characterId: P.aria,
				resource: 'ep',
				delta: -8,
				word: 'Esquive',
				status: 'reportee',
				reportedBy: A.mj,
				reportedAt: at(20)
			},
			{ id: 'd_test_attente', characterId: P.aria, resource: 'ep', delta: -5, word: 'Frappe' },
			{ id: 'd_test_attente2', characterId: P.aria, resource: 'pv', delta: 3, word: 'soigné de' },
			{
				id: 'd_test_soi',
				characterId: P.aria,
				resource: 'em',
				delta: -1,
				word: 'x',
				status: 'rayee'
			}
		]);
		await t.db.insert(schema.declarations).values({
			id: 'd_test_nonrep',
			characterId: P.aria,
			resource: 'pv',
			delta: -4,
			word: 'subis',
			status: 'non_reportee'
		});
		// Journal : une entrée amendée (seule la dernière version compte), une rayée.
		await t.db.insert(schema.journalEntries).values([
			{ id: 'j_test_v1', characterId: P.aria, ts: at(15), text: 'v1' },
			{ id: 'j_test_v2', characterId: P.aria, ts: at(14), text: 'v2', replacesId: 'j_test_v1' },
			{ id: 'j_test_raye', characterId: P.aria, ts: at(13), text: 'rayée', struck: true }
		]);
		// Annonce d'un rendez-vous visible ; une annonce sur un masqué ne compte pas.
		await notifyEvent(t.db, actors.mj, { eventId: E.chasse });
		await t.db
			.update(schema.events)
			.set({ announcedAt: new Date() })
			.where(eq(schema.events.id, E.masque));

		const view = await getLastPages(t.db, actors.alice);
		expect(view.sheet?.pendingDeclared).toEqual({ pv: 3, ep: -5, em: 0 });
		const texts = view.since.map((l) => l.text);
		expect(texts).toEqual([
			'Un administrateur a tamponné ta fiche — XP : 120 → 150.',
			expect.stringMatching(/^Un MJ a tamponné le combat du \d{1,2} \S+$/),
			'Le récit « Col des brumes » est dans ton journal',
			'Un MJ a validé un fait : dette envers Kael',
			'Un fait est réglé : promesse envers le conseil',
			'Un MJ a reporté ta déclaration : −8 EP (Esquive)',
			expect.stringMatching(/^Ta note du \d{1,2} \S+$/),
			expect.stringMatching(/^Ta déclaration −4 PV \(subis\) n’a pas été reportée$/),
			expect.stringMatching(/^Rendez-vous .+ : Chasse dans la forêt aux lianes — 1 inscrit$/)
		]);
		expect(view.since.map((l) => l.id.split(':')[0])).toEqual([
			's',
			'c',
			'r',
			'f',
			'fr',
			'd',
			'j',
			'd',
			'e'
		]);
		expect(view.since.find((l) => l.id === 'r:c_test_col')?.href).toBe('/carnet/recits/c_test_col');
		expect(view.since.find((l) => l.id === 'j:j_test_v2')).toBeDefined();
		expect(view.since.find((l) => l.id === `e:${E.chasse}`)?.href).toBe('/agenda');
		// Les instants sont croissants.
		const times = view.since.map((l) => Date.parse(l.at));
		expect([...times].sort((a, b) => a - b)).toEqual(times);

		// Rien de tout cela chez Bob.
		const bob = await getLastPages(t.db, actors.bob);
		expect(bob.since.map((l) => l.id)).toEqual([`e:${E.chasse}`]);
	});

	it('ouvrir une page avance le signet jusqu’à elle, jamais en arrière', async () => {
		for (const [i, minutes] of [30, 20, 10].entries()) {
			await t.db
				.insert(schema.journalEntries)
				.values({ id: `j_o_${i}`, characterId: P.aria, ts: ago(minutes * 60_000), text: `n${i}` });
		}
		const first = await getLastPages(t.db, actors.alice);
		expect(first.since.map((l) => l.id)).toEqual(['j:j_o_0', 'j:j_o_1', 'j:j_o_2']);

		const opened = await openPage(t.db, actors.alice, { lineId: 'j:j_o_1' });
		expect(opened.href).toBe('/carnet/journal');
		expect(opened.lastReadAt).toBe(first.since[1].at);
		const after = await getLastPages(t.db, actors.alice);
		expect(after.since.map((l) => l.id)).toEqual(['j:j_o_2']);
		expect(after.lastReadAt).toBe(first.since[1].at);

		// Rouvrir une page plus ancienne ne recule pas le signet.
		const older = await openPage(t.db, actors.alice, { lineId: 'j:j_o_0' });
		expect(older.lastReadAt).toBe(first.since[1].at);
		expect(await hasCorners(t.db, actors.alice)).toBe(true);
	});

	it('openPage refuse une page d’un autre carnet ou malformée', async () => {
		const [kael] = await t.db
			.insert(schema.characterHistory)
			.values({
				characterId: P.kael,
				type: 'stat',
				text: 'Kael',
				actorRole: 'mj',
				motif: 'm'
			})
			.returning({ id: schema.characterHistory.id });
		await expect(openPage(t.db, actors.alice, { lineId: `s:${kael.id}` })).rejects.toMatchObject({
			code: 'NOT_FOUND'
		});
		expect((await openPage(t.db, actors.bob, { lineId: `s:${kael.id}` })).href).toBe(
			'/carnet/fiche#consequences'
		);
		for (const lineId of ['zz:1', 's:abc', 'j:inconnue', 'sans-separateur']) {
			await expect(openPage(t.db, actors.alice, { lineId })).rejects.toMatchObject({ status: 404 });
		}
		for (const lineId of ['', 'j:']) {
			await expect(openPage(t.db, actors.alice, { lineId })).rejects.toMatchObject({
				code: 'INVALID'
			});
		}
		await expect(openPage(t.db, actors.nova, { lineId: 'j:j_demo_aria_2' })).rejects.toMatchObject({
			status: 404
		});
	});

	it('« Déplier toutes les cornes » pose le signet à maintenant', async () => {
		await t.db
			.insert(schema.journalEntries)
			.values({ id: 'j_u', characterId: P.aria, ts: ago(60_000), text: 'u' });
		expect(await hasCorners(t.db, actors.alice)).toBe(true);
		const { lastReadAt } = await unfoldAll(t.db, actors.alice);
		expect(Date.now() - Date.parse(lastReadAt)).toBeLessThan(5_000);
		expect(await hasCorners(t.db, actors.alice)).toBe(false);
		expect((await getLastPages(t.db, actors.alice)).since).toEqual([]);
		// Bob n'avait pas de signet : unfoldAll le crée.
		await unfoldAll(t.db, actors.bob);
		const [mark] = await t.db
			.select()
			.from(schema.readingMarks)
			.where(eq(schema.readingMarks.accountId, A.bob));
		expect(mark).toBeDefined();
	});

	it('20 pages par page, chronologiques ; une page trop loin revient à la dernière', async () => {
		await t.db.insert(schema.journalEntries).values(
			Array.from({ length: 25 }, (_, i) => ({
				id: `j_p_${String(i).padStart(2, '0')}`,
				characterId: P.aria,
				ts: ago((50 - i) * 60_000),
				text: `p${i}`
			}))
		);
		const first = await getLastPages(t.db, actors.alice);
		expect(first.since).toHaveLength(20);
		expect(first.sincePages).toBe(2);
		expect(first.since[0].id).toBe('j:j_p_00');
		const second = await getLastPages(t.db, actors.alice, { page: '2' } as never);
		expect(second.sincePage).toBe(2);
		expect(second.since.map((l) => l.id)).toEqual([
			'j:j_p_20',
			'j:j_p_21',
			'j:j_p_22',
			'j:j_p_23',
			'j:j_p_24'
		]);
		expect((await getLastPages(t.db, actors.alice, { page: 7 })).sincePage).toBe(2);
	});

	it('absence prolongée : daysAway compte les jours depuis le signet', async () => {
		await t.db
			.update(schema.readingMarks)
			.set({ lastReadAt: ago(42 * DAY + 3_600_000) })
			.where(eq(schema.readingMarks.accountId, A.alice));
		expect((await getLastPages(t.db, actors.alice)).daysAway).toBe(42);
	});
});

describe('setBookmark — marque-page', () => {
	let t: TestDb;
	beforeAll(async () => {
		t = await createTestDb({ demo: true });
	});
	afterAll(async () => {
		await t.close();
	});

	it('phrase et lien Discord ; le signet ne bouge pas', async () => {
		const before = await getLastPages(t.db, actors.alice);
		const saved = await setBookmark(t.db, actors.alice, {
			text: 'Je tenais la torche.',
			url: 'https://discord.com/channels/1/2/3'
		});
		expect(saved).toMatchObject({
			text: 'Je tenais la torche.',
			url: 'https://discord.com/channels/1/2/3'
		});
		const after = await getLastPages(t.db, actors.alice);
		expect(after.bookmark).toEqual({
			text: 'Je tenais la torche.',
			url: 'https://discord.com/channels/1/2/3'
		});
		expect(after.lastReadAt).toBe(before.lastReadAt);
		await setBookmark(t.db, actors.alice, { url: 'https://discordapp.com/channels/9/8/7' });
		expect((await getLastPages(t.db, actors.alice)).bookmark).toEqual({
			text: '',
			url: 'https://discordapp.com/channels/9/8/7'
		});
		await setBookmark(t.db, actors.alice, { text: '', url: '' });
		expect((await getLastPages(t.db, actors.alice)).bookmark).toBeNull();
	});

	it('refus : texte trop long, lien hors Discord (400), visiteur (401)', async () => {
		await expect(setBookmark(t.db, actors.alice, { text: 'x'.repeat(281) })).rejects.toMatchObject({
			code: 'INVALID',
			status: 400
		});
		for (const url of [
			'http://discord.com/channels/1',
			'https://evil.example/discord.com/',
			'https://discord.com.evil.example/x',
			'javascript:alert(1)'
		]) {
			await expect(setBookmark(t.db, actors.alice, { url })).rejects.toMatchObject({
				code: 'INVALID'
			});
		}
		await expect(setBookmark(t.db, null, { text: 'x' })).rejects.toMatchObject({ status: 401 });
	});

	it('compte sans signet : le marque-page crée le signet à la création du compte', async () => {
		await setBookmark(t.db, actors.nova, { text: 'En attente.' });
		const view = await getLastPages(t.db, actors.nova);
		expect(view.bookmark).toEqual({ text: 'En attente.', url: '' });
		const [account] = await t.db
			.select()
			.from(schema.accounts)
			.where(eq(schema.accounts.id, A.nova));
		expect(view.lastReadAt).toBe(account.createdAt.toISOString());
	});

	it('avec une scène : la reprise de scène est notée pour le participant seulement', async () => {
		await setBookmark(t.db, actors.bob, {
			text: 'Kael écoute la brume.',
			url: 'https://discord.com/channels/demo/foret-centre/42',
			sceneId: DEMO_IDS.scene
		});
		const [row] = await t.db
			.select()
			.from(schema.sceneParticipants)
			.where(eq(schema.sceneParticipants.characterId, P.kael));
		expect(row).toMatchObject({ bookmarkText: 'Kael écoute la brume.' });
		await expect(
			setBookmark(t.db, actors.nova, { text: 'x', sceneId: DEMO_IDS.scene })
		).rejects.toMatchObject({ code: 'NOT_LINKED' });
		await t.db
			.insert(schema.scenes)
			.values({ id: 's_autre', title: 'Autre', discordUrl: 'https://discord.com/x' });
		await expect(
			setBookmark(t.db, actors.alice, { text: 'x', sceneId: 's_autre' })
		).rejects.toMatchObject({
			code: 'NOT_FOUND'
		});
		// Refus de la scène : le marque-page général n'a pas été écrit non plus (transaction).
		expect((await getLastPages(t.db, actors.alice)).bookmark?.text).not.toBe('x');
	});
});
