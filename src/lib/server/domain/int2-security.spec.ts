import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import { DEMO_IDS } from '../db/seed';
import * as s from '../db/schema';
import type { Actor } from '../permissions';
import { bindRequestContext } from '../auth/context';
import { createSession } from '../auth/session';
import { ensureTestEnv } from '../auth/testing';
import { setParticipation } from './events';
import { consumeOwnItem, setOwnPortrait, correctResource } from './characters';
import { declare, cancelDeclaration, strikeOwnDeclaration } from './declarations';
import { writeEntry, amendEntry, strikeEntry } from './journal';
import { proposeFact } from './facts';
import { setBookmark, openPage, unfoldAll } from './reading';
import { openScene, setSummary, setOpenQuestion, pin, unpin, closeScene } from './scenes';
import { proposeObservation } from './observations';
import { setSetting } from './settings';
import { selectTheme, unlinkCharacter } from './accounts';
import { createEvent } from './events';
import { createTable } from './combats';
import { drawSpawn } from './spawn';
import { publishExtract } from './publications';
import { createBeast } from './beasts';
import { createZone } from './zones';
import { createOath } from './oaths';
import { validateObservation } from './observations';

const A = DEMO_IDS.accounts;
const P = DEMO_IDS.characters;
type Mutation = (t: TestDb, actor: Actor) => Promise<unknown>;
const playerMutations: [string, Mutation][] = [
	[
		'participation',
		(t, a) =>
			setParticipation(t.db, a, {
				eventId: DEMO_IDS.events.conseil,
				participating: true,
				expectedRevision: 1
			})
	],
	[
		'consommation',
		async (t, a) => {
			const [item] = await t.db
				.select()
				.from(s.characterItems)
				.where(eq(s.characterItems.characterId, P.aria));
			return consumeOwnItem(t.db, a, { itemId: item.id, expectedRevision: 1 });
		}
	],
	['portrait', (t, a) => setOwnPortrait(t.db, a, { url: '', expectedRevision: 1 })],
	['declaration', (t, a) => declare(t.db, a, { resource: 'ep', delta: -1, word: 'Esquive' })],
	['annuler', (t, a) => cancelDeclaration(t.db, a, { id: 'd_missing' })],
	['rayer declaration', (t, a) => strikeOwnDeclaration(t.db, a, { id: 'd_missing' })],
	['note', (t, a) => writeEntry(t.db, a, { text: 'Une note.' })],
	[
		'corriger note',
		(t, a) => amendEntry(t.db, a, { entryId: 'j_demo_aria_1', text: 'Correction.' })
	],
	['rayer note', (t, a) => strikeEntry(t.db, a, { entryId: 'j_demo_aria_1' })],
	['fait', (t, a) => proposeFact(t.db, a, { kind: 'dette', text: 'Une dette.' })],
	['marque-page', (t, a) => setBookmark(t.db, a, { text: 'Reprise.' })],
	['ouvrir page', (t, a) => openPage(t.db, a, { lineId: 'j:j_demo_aria_1' })],
	['deplier', (t, a) => unfoldAll(t.db, a)],
	[
		'ouvrir scene',
		(t, a) =>
			openScene(t.db, a, {
				title: 'Une scene',
				discordUrl: 'https://discord.com/channels/demo/test'
			})
	],
	[
		'resume scene',
		(t, a) =>
			setSummary(t.db, a, { sceneId: DEMO_IDS.scene, summary: 'Reprise.', expectedRevision: 1 })
	],
	[
		'question scene',
		(t, a) =>
			setOpenQuestion(t.db, a, {
				sceneId: DEMO_IDS.scene,
				openQuestion: 'Et ensuite ?',
				expectedRevision: 1
			})
	],
	['epingle', (t, a) => pin(t.db, a, { sceneId: DEMO_IDS.scene, kind: 'regle', ref: 'esquive' })],
	['retirer epingle', (t, a) => unpin(t.db, a, { pinId: 'sp_missing' })],
	['clore scene', (t, a) => closeScene(t.db, a, { sceneId: DEMO_IDS.scene, expectedRevision: 1 })],
	[
		'observation',
		(t, a) => proposeObservation(t.db, a, { beastId: DEMO_IDS.beasts.loup, text: 'Une trace.' })
	]
];

describe('INT-2 : acteur du hook devenu invalide avant la transaction', () => {
	let t: TestDb;
	beforeAll(async () => {
		ensureTestEnv();
		t = await createTestDb({ demo: true });
	});
	afterAll(async () => t.close());
	async function snapshot() {
		const result: unknown[] = [];
		for (const table of [
			s.characters,
			s.characterItems,
			s.characterHistory,
			s.eventParticipants,
			s.events,
			s.declarations,
			s.journalEntries,
			s.validatedFacts,
			s.readingMarks,
			s.scenes,
			s.sceneParticipants,
			s.scenePins,
			s.beastObservations,
			s.auditLog,
			s.staffLog,
			s.combats,
			s.publications,
			s.beasts,
			s.zones,
			s.oaths,
			s.spawnRuns,
			s.settings,
			s.accounts
		]) {
			result.push(await t.db.select().from(table));
		}
		return result;
	}
	for (const mode of ['revoked', 'expired', 'unlinked'] as const) {
		it.each(playerMutations)(`${mode} : %s, aucune ecriture`, async (_name, mutate) => {
			await t.db.update(s.accounts).set({ characterId: P.aria }).where(eq(s.accounts.id, A.alice));
			const [account] = await t.db.select().from(s.accounts).where(eq(s.accounts.id, A.alice));
			const actor: Actor = {
				accountId: account.id,
				role: account.role,
				pseudo: account.pseudo,
				characterId: account.characterId
			};
			const session = await createSession(t.db, {
				accountId: account.id,
				scope: 'full',
				sessionVersion: account.sessionVersion
			});
			bindRequestContext(actor, {
				sessionId: session.id,
				sessionVersion: account.sessionVersion,
				ip: 'test',
				userAgent: 'test',
				origin: 'http://localhost'
			});
			if (mode === 'revoked') await t.db.delete(s.sessions).where(eq(s.sessions.id, session.id));
			if (mode === 'expired')
				await t.db
					.update(s.sessions)
					.set({ createdAt: new Date(0), expiresAt: new Date(1) })
					.where(eq(s.sessions.id, session.id));
			if (mode === 'unlinked')
				await t.db
					.update(s.accounts)
					.set({ characterId: null })
					.where(eq(s.accounts.id, account.id));
			const before = await snapshot();
			await expect(mutate(t, actor)).rejects.toMatchObject({
				status: mode === 'unlinked' ? 403 : 401
			});
			expect(await snapshot()).toEqual(before);
		});
	}
	it.each(['expired', 'scope', 'version', 'reset'] as const)(
		'compte : session %s refusee',
		async (mode) => {
			await t.db
				.update(s.accounts)
				.set({ characterId: P.aria, forcePasswordReset: false, resetExpiresAt: null })
				.where(eq(s.accounts.id, A.alice));
			const [account] = await t.db.select().from(s.accounts).where(eq(s.accounts.id, A.alice));
			const actor: Actor = {
				accountId: account.id,
				role: account.role,
				pseudo: account.pseudo,
				characterId: account.characterId
			};
			const session = await createSession(t.db, {
				accountId: account.id,
				scope: 'full',
				sessionVersion: account.sessionVersion
			});
			bindRequestContext(actor, {
				sessionId: session.id,
				sessionVersion: account.sessionVersion,
				ip: 'test',
				userAgent: 'test',
				origin: 'http://localhost'
			});
			if (mode === 'expired')
				await t.db
					.update(s.sessions)
					.set({ createdAt: new Date(0), expiresAt: new Date(1) })
					.where(eq(s.sessions.id, session.id));
			if (mode === 'scope')
				await t.db.update(s.sessions).set({ scope: 'reset' }).where(eq(s.sessions.id, session.id));
			if (mode === 'version')
				await t.db
					.update(s.sessions)
					.set({ sessionVersion: account.sessionVersion + 1 })
					.where(eq(s.sessions.id, session.id));
			if (mode === 'reset')
				await t.db
					.update(s.accounts)
					.set({ forcePasswordReset: true, resetExpiresAt: new Date(Date.now() + 60_000) })
					.where(eq(s.accounts.id, account.id));
			await expect(selectTheme(t.db, actor, { themeId: 'light' })).rejects.toMatchObject({
				status: 401
			});
			const [after] = await t.db.select().from(s.accounts).where(eq(s.accounts.id, account.id));
			expect(after.selectedTheme).toBe(account.selectedTheme);
		}
	);
	it.each(['revoked', 'expired', 'demoted'] as const)('mutations staff : %s', async (mode) => {
		await t.db.update(s.accounts).set({ role: 'admin' }).where(eq(s.accounts.id, A.admin));
		const [account] = await t.db.select().from(s.accounts).where(eq(s.accounts.id, A.admin));
		const actor: Actor = {
			accountId: account.id,
			role: 'admin',
			pseudo: account.pseudo,
			characterId: null
		};
		const session = await createSession(t.db, {
			accountId: account.id,
			scope: 'full',
			sessionVersion: account.sessionVersion
		});
		bindRequestContext(actor, {
			sessionId: session.id,
			sessionVersion: account.sessionVersion,
			ip: 'test',
			userAgent: 'test',
			origin: 'http://localhost'
		});
		if (mode === 'revoked') await t.db.delete(s.sessions).where(eq(s.sessions.id, session.id));
		if (mode === 'expired')
			await t.db
				.update(s.sessions)
				.set({ createdAt: new Date(0), expiresAt: new Date(1) })
				.where(eq(s.sessions.id, session.id));
		if (mode === 'demoted')
			await t.db.update(s.accounts).set({ role: 'joueur' }).where(eq(s.accounts.id, account.id));
		const before = await snapshot();
		await expect(
			correctResource(t.db, actor, {
				characterId: P.aria,
				resource: 'pv',
				newValue: 1,
				motif: 'Correction.',
				expectedRevision: 1
			})
		).rejects.toMatchObject({ status: 401 });
		await expect(
			setSetting(t.db, actor, { key: 'discord_invite_url', value: 'https://discord.gg/test' })
		).rejects.toMatchObject({ status: 401 });
		const staffMutations = [
			() => createEvent(t.db, actor, { title: 'Une rencontre' }),
			() => createTable(t.db, actor, { name: 'Une table', characterIds: [P.aria], beasts: [] }),
			() => drawSpawn(t.db, actor, { zoneId: 'foret' }),
			() => publishExtract(t.db, actor, { text: 'Une ligne.\nUne autre.' }),
			() => createBeast(t.db, actor, { name: 'Une creature' }),
			() => createZone(t.db, actor, { name: 'Une zone' }),
			() => createOath(t.db, actor, { name: 'Un serment' }),
			() =>
				validateObservation(t.db, actor, {
					id: 'o_missing',
					motif: 'Validation.',
					expectedRevision: 1
				}),
			() => unlinkCharacter(t.db, actor, { accountId: A.bob, expectedRevision: 1 })
		];
		for (const mutate of staffMutations)
			await expect(mutate()).rejects.toMatchObject({ status: 401 });

		expect(await snapshot()).toEqual(before);
	});
});
