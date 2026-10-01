// Agenda : lecture filtrée par rôle, participation sous verrou, organisation et annonce.
// Intégration sur PGlite (createTestDb + jeu de démonstration).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import { DEMO_IDS } from '../db/seed';
import * as schema from '../db/schema';
import type { Actor } from '../permissions';
import {
	EVENT_FULL_MESSAGE,
	announcedAtOf,
	createEvent,
	listAgenda,
	notifyEvent,
	setEventHidden,
	setParticipation,
	strikeEvent,
	updateEvent
} from './events';

const A = DEMO_IDS.accounts;
const P = DEMO_IDS.characters;
const E = DEMO_IDS.events;

const actors = {
	admin: { accountId: A.admin, role: 'admin', characterId: null, pseudo: 'admin' },
	alice: { accountId: A.alice, role: 'joueur', characterId: P.aria, pseudo: 'alice' },
	bob: { accountId: A.bob, role: 'joueur', characterId: P.kael, pseudo: 'bob' },
	mj: { accountId: A.mj, role: 'mj', characterId: null, pseudo: 'mj' },
	designer: { accountId: A.designer, role: 'designer', characterId: null, pseudo: 'designer' },
	nova: { accountId: A.nova, role: 'joueur', characterId: null, pseudo: 'nova' }
} satisfies Record<string, Actor>;

const DAY = 86_400_000;
const future = (days: number) => new Date(Date.now() + days * DAY).toISOString();

let t: TestDb;
let seq = 0;

/** Ajoute un joueur relié (compte + personnage) pour les scénarios de capacité. */
async function newPlayer(name: string): Promise<Actor> {
	seq += 1;
	const characterId = `p_test_${seq}`;
	const accountId = `a_test_${seq}`;
	await t.db.insert(schema.characters).values({ id: characterId, name, oathId: 'rodeur' });
	await t.db.insert(schema.accounts).values({
		id: accountId,
		pseudo: `joueur${seq}`,
		passwordHash: 'scrypt$test',
		characterId
	});
	return { accountId, role: 'joueur', characterId, pseudo: `joueur${seq}` };
}

async function revisionOf(eventId: string): Promise<number> {
	const [row] = await t.db
		.select({ r: schema.events.revision })
		.from(schema.events)
		.where(eq(schema.events.id, eventId));
	return row.r;
}

async function participantsOf(eventId: string): Promise<string[]> {
	return (
		await t.db
			.select({ id: schema.eventParticipants.characterId })
			.from(schema.eventParticipants)
			.where(eq(schema.eventParticipants.eventId, eventId))
	)
		.map((r) => r.id)
		.sort();
}

async function staffLogActions(): Promise<string[]> {
	return (await t.db.select({ a: schema.staffLog.action }).from(schema.staffLog)).map((r) => r.a);
}

async function makeEvent(overrides: Record<string, unknown> = {}): Promise<string> {
	const { event } = await createEvent(t.db, actors.mj, {
		title: 'Rendez-vous de test',
		type: 'social',
		startsAt: future(5),
		capacity: 0,
		...overrides
	});
	return event.id;
}

beforeAll(async () => {
	t = await createTestDb({ demo: true });
});
afterAll(async () => {
	await t.close();
});

describe('listAgenda — lecture filtrée', () => {
	it('visiteur : rendez-vous masqués retirés, types et état « unlinked »', async () => {
		const agenda = await listAgenda(t.db, null);
		const ids = [...agenda.upcoming, ...agenda.past].map((e) => e.id);
		expect(ids).not.toContain(E.masque);
		const chasse = agenda.upcoming.find((e) => e.id === E.chasse)!;
		expect(chasse).toMatchObject({
			type: 'combat',
			typeLabel: 'Combat / Chasse',
			typeColor: '--red',
			capacity: 4,
			count: 1,
			participants: [{ name: 'Aria Lunval', me: false }],
			registered: false,
			canRegister: false,
			closedReason: 'unlinked',
			hidden: false,
			organizer: 'mj',
			recitId: null
		});
		expect(agenda.past.map((e) => e.id)).toContain(E.passe);
		expect(agenda.past.find((e) => e.id === E.passe)?.closedReason).toBe('past');
	});

	it('joueur : « me », inscrit, complet, passé', async () => {
		const alice = await listAgenda(t.db, actors.alice);
		const chasse = alice.upcoming.find((e) => e.id === E.chasse)!;
		expect(chasse.participants).toEqual([{ name: 'Aria Lunval', me: true }]);
		expect(chasse).toMatchObject({ registered: true, canRegister: true, closedReason: null });
		const conseil = alice.upcoming.find((e) => e.id === E.conseil)!;
		// Complet, mais Aria y est : elle peut rayer sa place.
		expect(conseil).toMatchObject({
			registered: true,
			canRegister: true,
			closedReason: null,
			count: 2
		});
		const passe = alice.past.find((e) => e.id === E.passe)!;
		expect(passe).toMatchObject({ registered: true, canRegister: false, closedReason: 'past' });

		const bob = await listAgenda(t.db, actors.bob);
		expect(bob.upcoming.find((e) => e.id === E.chasse)).toMatchObject({
			registered: false,
			canRegister: true,
			closedReason: null
		});

		const extra = await newPlayer('Lys');
		const lys = await listAgenda(t.db, extra);
		expect(lys.upcoming.find((e) => e.id === E.conseil)).toMatchObject({
			registered: false,
			canRegister: false,
			closedReason: 'full'
		});

		const nova = await listAgenda(t.db, actors.nova);
		expect(nova.upcoming.find((e) => e.id === E.chasse)?.closedReason).toBe('unlinked');
		expect(nova.upcoming.map((e) => e.id)).not.toContain(E.masque);
	});

	it('MJ, designer, administrateur voient les rendez-vous masqués ; pas le joueur', async () => {
		for (const actor of [actors.mj, actors.designer, actors.admin]) {
			const agenda = await listAgenda(t.db, actor);
			const masque = agenda.upcoming.find((e) => e.id === E.masque);
			expect(masque?.hidden).toBe(true);
			expect(masque?.canRegister).toBe(false);
		}
		const alice = await listAgenda(t.db, actors.alice);
		expect(alice.upcoming.map((e) => e.id)).not.toContain(E.masque);
	});

	it('date à confirmer : « undated », listé en tête des rendez-vous à venir', async () => {
		const id = await makeEvent({ startsAt: null, title: 'Date à venir' });
		const agenda = await listAgenda(t.db, actors.bob);
		expect(agenda.upcoming[0].id).toBe(id);
		expect(agenda.upcoming[0]).toMatchObject({
			startsAt: null,
			closedReason: 'undated',
			canRegister: false
		});
	});

	it('passés : du plus récent au plus ancien, 8 par page', async () => {
		const db = await createTestDb({ demo: true });
		try {
			for (let i = 1; i <= 10; i++) {
				await db.db.insert(schema.events).values({
					id: `e_past_${i}`,
					title: `Passé ${i}`,
					startsAt: new Date(Date.now() - i * DAY)
				});
			}
			const first = await listAgenda(db.db, null);
			expect(first.pastPages).toBe(2);
			expect(first.past).toHaveLength(8);
			expect(first.past[0].id).toBe('e_past_1');
			const second = await listAgenda(db.db, null, { pastPage: 2 });
			// 10 + « Exploration de la lisière » (−10 j, 20 h UTC) = 11 passés.
			expect(second.past).toHaveLength(3);
			const beyond = await listAgenda(db.db, null, { pastPage: 9 });
			expect(beyond.past.map((e) => e.id)).toEqual(second.past.map((e) => e.id));
		} finally {
			await db.close();
		}
	});

	it('récit rattaché : servi à qui peut le lire seulement', async () => {
		const id = await makeEvent({ title: 'Avec récit', recitId: DEMO_IDS.combat });
		const seen = async (actor: Actor | null) =>
			(await listAgenda(t.db, actor)).upcoming.find((e) => e.id === id)?.recitId ?? null;
		expect(await seen(actors.alice)).toBe(DEMO_IDS.combat);
		expect(await seen(actors.mj)).toBe(DEMO_IDS.combat);
		expect(await seen(null)).toBeNull();
		expect(await seen(await newPlayer('Étrangère'))).toBeNull();
		expect(await seen(actors.designer)).toBeNull();
	});
});

describe('setParticipation — inscription sous verrou', () => {
	it('inscrit, incrémente la révision, audite ; rayer libère la place', async () => {
		const rev = await revisionOf(E.chasse);
		const row = await setParticipation(t.db, actors.bob, {
			eventId: E.chasse,
			participating: true,
			expectedRevision: rev
		});
		expect(row).toMatchObject({ registered: true, count: 2, revision: rev + 1 });
		expect(row.participants.find((p) => p.me)?.name).toBe('Kael Morvan');
		const audits = await t.db
			.select()
			.from(schema.auditLog)
			.where(eq(schema.auditLog.action, 'set_event_participation'));
		expect(audits.at(-1)?.details).toEqual({
			characterId: P.kael,
			eventId: E.chasse,
			participating: true
		});

		const back = await setParticipation(t.db, actors.bob, {
			eventId: E.chasse,
			participating: 'false',
			expectedRevision: String(rev + 1)
		});
		expect(back).toMatchObject({ registered: false, count: 1, revision: rev + 2 });
	});

	it('déjà inscrit : sans doublon', async () => {
		const rev = await revisionOf(E.chasse);
		const row = await setParticipation(t.db, actors.alice, {
			eventId: E.chasse,
			participating: true,
			expectedRevision: rev
		});
		expect(row.count).toBe(1);
		expect(await participantsOf(E.chasse)).toEqual([P.aria]);
	});

	it('428 sans révision, 409 révision périmée avec annulation complète', async () => {
		await expect(
			setParticipation(t.db, actors.bob, { eventId: E.chasse, participating: true } as never)
		).rejects.toMatchObject({ code: 'VERSION_REQUIRED', status: 428 });
		const rev = await revisionOf(E.chasse);
		await expect(
			setParticipation(t.db, actors.bob, {
				eventId: E.chasse,
				participating: true,
				expectedRevision: rev - 1
			})
		).rejects.toMatchObject({ code: 'VERSION_CONFLICT', status: 409 });
		// L'insertion faite avant le contrôle de révision a été annulée.
		expect(await participantsOf(E.chasse)).toEqual([P.aria]);
		expect(await revisionOf(E.chasse)).toBe(rev);
	});

	it('complet : EVENT_FULL « La dernière place vient d’être prise. »', async () => {
		const lys = await newPlayer('Lys complet');
		await expect(
			setParticipation(t.db, lys, {
				eventId: E.conseil,
				participating: true,
				expectedRevision: await revisionOf(E.conseil)
			})
		).rejects.toMatchObject({ code: 'EVENT_FULL', status: 409, message: EVENT_FULL_MESSAGE });
		expect(EVENT_FULL_MESSAGE).toBe("La dernière place vient d'être prise.");
	});

	it('course à la dernière place : une seule inscription passe', async () => {
		const id = await makeEvent({ title: 'Une place', capacity: 1 });
		const [p1, p2] = [await newPlayer('Course un'), await newPlayer('Course deux')];
		const rev = await revisionOf(id);
		const results = await Promise.allSettled([
			setParticipation(t.db, p1, { eventId: id, participating: true, expectedRevision: rev }),
			setParticipation(t.db, p2, { eventId: id, participating: true, expectedRevision: rev })
		]);
		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
		expect(rejected.reason).toMatchObject({ code: 'EVENT_FULL' });
		expect(await participantsOf(id)).toHaveLength(1);
	});

	it('fermé : passé ou sans date (EVENT_CLOSED) ; masqué : 404', async () => {
		await expect(
			setParticipation(t.db, actors.bob, {
				eventId: E.passe,
				participating: true,
				expectedRevision: await revisionOf(E.passe)
			})
		).rejects.toMatchObject({ code: 'EVENT_CLOSED', status: 409 });
		const undated = await makeEvent({ startsAt: '' });
		await expect(
			setParticipation(t.db, actors.bob, {
				eventId: undated,
				participating: true,
				expectedRevision: 1
			})
		).rejects.toMatchObject({ code: 'EVENT_CLOSED' });
		await expect(
			setParticipation(t.db, actors.bob, {
				eventId: E.masque,
				participating: true,
				expectedRevision: await revisionOf(E.masque)
			})
		).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
		await expect(
			setParticipation(t.db, actors.bob, {
				eventId: 'e_absent',
				participating: true,
				expectedRevision: 1
			})
		).rejects.toMatchObject({ code: 'NOT_FOUND' });
	});

	it('rayer sa place reste possible sur un rendez-vous passé (legacy db.js:949)', async () => {
		const row = await setParticipation(t.db, actors.bob, {
			eventId: E.passe,
			participating: false,
			expectedRevision: await revisionOf(E.passe)
		});
		expect(row.registered).toBe(false);
		expect(await participantsOf(E.passe)).toEqual([P.aria]);
	});

	it('refus par rôle : visiteur 401, compte sans personnage 403, saisie invalide 400', async () => {
		await expect(
			setParticipation(t.db, null, { eventId: E.chasse, participating: true, expectedRevision: 1 })
		).rejects.toMatchObject({ status: 401 });
		await expect(
			setParticipation(t.db, actors.nova, {
				eventId: E.chasse,
				participating: true,
				expectedRevision: 1
			})
		).rejects.toMatchObject({ code: 'NOT_LINKED', status: 403 });
		await expect(
			setParticipation(t.db, actors.mj, {
				eventId: E.chasse,
				participating: true,
				expectedRevision: 1
			})
		).rejects.toMatchObject({ code: 'NOT_LINKED' });
		await expect(
			setParticipation(t.db, actors.bob, {
				eventId: E.chasse,
				participating: 'peut-être',
				expectedRevision: 1
			} as never)
		).rejects.toMatchObject({ code: 'INVALID', status: 400 });
	});
});

describe('createEvent — organiser', () => {
	it('MJ : crée, journal staff et audit dans la même transaction', async () => {
		const before = (await staffLogActions()).length;
		const { event, notified, notifyError } = await createEvent(t.db, actors.mj, {
			title: '  Veillée au col  ',
			type: 'evenement',
			description: 'Ligne 1\r\nLigne 2',
			startsAt: '2030-01-01T20:00',
			capacity: '6',
			discordUrl: 'https://discord.com/channels/1/2',
			hidden: 'false'
		});
		expect(event).toMatchObject({
			title: 'Veillée au col',
			type: 'evenement',
			typeLabel: 'Événement majeur',
			description: 'Ligne 1\nLigne 2',
			startsAt: '2030-01-01T19:00:00.000Z',
			capacity: 6,
			count: 0,
			organizer: 'mj',
			revision: 1
		});
		expect(event.id).toMatch(/^e_[A-Za-z0-9_-]{16}$/);
		expect(notified).toBe(false);
		expect(notifyError).toBeNull();
		const actions = await staffLogActions();
		expect(actions.length).toBe(before + 1);
		expect(actions.at(-1)).toBe('event_cree');
		const [audit] = await t.db
			.select()
			.from(schema.auditLog)
			.where(and(eq(schema.auditLog.action, 'event_create'), eq(schema.auditLog.actorPseudo, 'mj')))
			.orderBy(schema.auditLog.id);
		expect(audit).toBeDefined();
	});

	it('designer : crée, mais ne prévient pas (403) ; joueur 403 ; visiteur 401', async () => {
		const { event } = await createEvent(t.db, actors.designer, {
			title: 'Atelier',
			startsAt: future(2)
		});
		expect(event.organizer).toBe('designer');
		await expect(
			createEvent(t.db, actors.designer, { title: 'Annonce', startsAt: future(2), notify: true })
		).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
		await expect(createEvent(t.db, actors.alice, { title: 'Non' })).rejects.toMatchObject({
			status: 403
		});
		await expect(createEvent(t.db, null, { title: 'Non' })).rejects.toMatchObject({ status: 401 });
	});

	it('validations : titre, capacité, date, lien du salon, récit', async () => {
		const bad = async (input: Record<string, unknown>, message: string) =>
			expect(createEvent(t.db, actors.mj, { title: 'X', ...input } as never)).rejects.toMatchObject(
				{
					code: 'INVALID',
					status: 400,
					message
				}
			);
		await bad({ title: '   ' }, "Donne un titre à l'événement.");
		await bad(
			{ capacity: -1 },
			'Le nombre de places doit être un entier positif, ou 0 pour aucune limite.'
		);
		await bad(
			{ capacity: '1.5' },
			'Le nombre de places doit être un entier positif, ou 0 pour aucune limite.'
		);
		await bad({ startsAt: 'demain soir' }, 'Choisis une date valide.');
		await bad(
			{ discordUrl: 'https://exemple.org/salon' },
			'Le lien doit être un lien Discord (https://discord.com/… ou https://discordapp.com/…).'
		);
		await bad({ recitId: 'c_absent' }, 'Ce récit est introuvable.');
	});

	it('« Prévenir les joueurs » : corne déposée ; masqué : enregistré mais pas prévenu', async () => {
		const done = await createEvent(t.db, actors.mj, {
			title: 'Annoncé',
			startsAt: future(4),
			notify: 'on'
		});
		expect(done.notified).toBe(true);
		const [row] = await t.db
			.select()
			.from(schema.events)
			.where(eq(schema.events.id, done.event.id));
		expect(announcedAtOf(row)).toBeInstanceOf(Date);
		expect((await staffLogActions()).slice(-2)).toEqual(['event_cree', 'event_notif']);

		const hidden = await createEvent(t.db, actors.admin, {
			title: 'Secret',
			startsAt: future(4),
			hidden: true,
			notify: true
		});
		expect(hidden.notified).toBe(false);
		expect(hidden.notifyError).toMatch(/masqué/);
		expect(hidden.event.hidden).toBe(true);
	});
});

describe('updateEvent, setEventHidden, strikeEvent — staff', () => {
	it('modifie en gardant inscrits et champs hérités ; journal staff', async () => {
		await t.db
			.update(schema.events)
			.set({ extra: { ancien: 'conservé' } })
			.where(eq(schema.events.id, E.chasse));
		const rev = await revisionOf(E.chasse);
		const row = await updateEvent(t.db, actors.designer, {
			eventId: E.chasse,
			expectedRevision: rev,
			title: 'Chasse renommée',
			capacity: 3
		});
		expect(row).toMatchObject({
			title: 'Chasse renommée',
			capacity: 3,
			count: 1,
			revision: rev + 1
		});
		const [stored] = await t.db.select().from(schema.events).where(eq(schema.events.id, E.chasse));
		expect(stored.extra).toEqual({ ancien: 'conservé' });
		expect((await staffLogActions()).at(-1)).toBe('event_modif');
	});

	it('capacité sous le nombre d’inscrits : refus (audit 08 §1.5)', async () => {
		await expect(
			updateEvent(t.db, actors.mj, {
				eventId: E.conseil,
				expectedRevision: await revisionOf(E.conseil),
				capacity: 1
			})
		).rejects.toMatchObject({
			code: 'INVALID',
			message: 'La capacité ne peut pas être inférieure au nombre de participants déjà inscrits.'
		});
	});

	it('428, 409 sans écriture ni journal, 404, refus joueur', async () => {
		const logs = (await staffLogActions()).length;
		await expect(
			updateEvent(t.db, actors.mj, { eventId: E.chasse, title: 'X' } as never)
		).rejects.toMatchObject({
			status: 428
		});
		const rev = await revisionOf(E.chasse);
		await expect(
			updateEvent(t.db, actors.mj, {
				eventId: E.chasse,
				expectedRevision: rev + 5,
				title: 'Écrasé'
			})
		).rejects.toMatchObject({ code: 'VERSION_CONFLICT', status: 409 });
		const [stored] = await t.db.select().from(schema.events).where(eq(schema.events.id, E.chasse));
		expect(stored.title).not.toBe('Écrasé');
		expect((await staffLogActions()).length).toBe(logs);
		await expect(
			updateEvent(t.db, actors.mj, { eventId: 'e_absent', expectedRevision: 1, title: 'X' })
		).rejects.toMatchObject({ status: 404 });
		await expect(
			updateEvent(t.db, actors.bob, { eventId: E.chasse, expectedRevision: rev, title: 'X' })
		).rejects.toMatchObject({ status: 403 });
	});

	it('date effacée : « Date à confirmer » ; récit rattaché puis détaché', async () => {
		const id = await makeEvent();
		let row = await updateEvent(t.db, actors.mj, {
			eventId: id,
			expectedRevision: 1,
			startsAt: null,
			recitId: DEMO_IDS.combat
		});
		expect(row).toMatchObject({
			startsAt: null,
			closedReason: 'undated',
			recitId: DEMO_IDS.combat
		});
		row = await updateEvent(t.db, actors.mj, { eventId: id, expectedRevision: 2, recitId: '' });
		expect(row.recitId).toBeNull();
	});

	it('masquer / publier', async () => {
		const id = await makeEvent();
		const hidden = await setEventHidden(t.db, actors.mj, {
			eventId: id,
			hidden: true,
			expectedRevision: 1
		});
		expect(hidden.hidden).toBe(true);
		expect((await listAgenda(t.db, actors.alice)).upcoming.map((e) => e.id)).not.toContain(id);
		expect((await staffLogActions()).at(-1)).toBe('event_visibilite');
		await expect(
			setEventHidden(t.db, actors.mj, { eventId: id, hidden: false, expectedRevision: 1 })
		).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
		await expect(
			setEventHidden(t.db, actors.mj, { eventId: 'e_absent', hidden: false, expectedRevision: 1 })
		).rejects.toMatchObject({ code: 'NOT_FOUND' });
		await expect(
			setEventHidden(t.db, actors.alice, { eventId: id, hidden: false, expectedRevision: 2 })
		).rejects.toMatchObject({ status: 403 });
		const shown = await setEventHidden(t.db, actors.admin, {
			eventId: id,
			hidden: false,
			expectedRevision: 2
		});
		expect(shown.hidden).toBe(false);
	});

	it('rayer : sort de l’agenda avec ses inscriptions, l’audit garde la version complète', async () => {
		const id = await makeEvent({ title: 'À rayer', capacity: 3 });
		const p = await newPlayer('Témoin');
		await setParticipation(t.db, p, { eventId: id, participating: true, expectedRevision: 1 });
		await expect(
			strikeEvent(t.db, actors.mj, { eventId: id, expectedRevision: 1 })
		).rejects.toMatchObject({
			code: 'VERSION_CONFLICT'
		});
		await expect(
			strikeEvent(t.db, actors.alice, { eventId: id, expectedRevision: 2 })
		).rejects.toMatchObject({
			status: 403
		});
		expect(await strikeEvent(t.db, actors.designer, { eventId: id, expectedRevision: 2 })).toEqual({
			eventId: id,
			struck: true
		});
		expect(await participantsOf(id)).toEqual([]);
		const [audit] = await t.db
			.select()
			.from(schema.auditLog)
			.where(eq(schema.auditLog.action, 'event_strike'));
		expect(audit.details).toMatchObject({
			eventId: id,
			title: 'À rayer',
			participants: ['Témoin']
		});
		expect((await staffLogActions()).at(-1)).toBe('event_supprime');
		await expect(
			strikeEvent(t.db, actors.mj, { eventId: id, expectedRevision: 2 })
		).rejects.toMatchObject({
			status: 404
		});
	});
});

describe('notifyEvent — annonce', () => {
	it('MJ et administrateur annoncent ; la révision ne bouge pas', async () => {
		const rev = await revisionOf(E.chasse);
		const result = await notifyEvent(t.db, actors.mj, { eventId: E.chasse });
		expect(result.eventId).toBe(E.chasse);
		expect(result.linkedAccounts).toBeGreaterThanOrEqual(2);
		expect(await revisionOf(E.chasse)).toBe(rev);
		const again = await notifyEvent(t.db, actors.admin, { eventId: E.chasse });
		expect(again.announcedAt >= result.announcedAt).toBe(true);
	});

	it('refus : designer et joueur 403, masqué EVENT_UNAVAILABLE, absent 404', async () => {
		await expect(notifyEvent(t.db, actors.designer, { eventId: E.chasse })).rejects.toMatchObject({
			status: 403
		});
		await expect(notifyEvent(t.db, actors.alice, { eventId: E.chasse })).rejects.toMatchObject({
			status: 403
		});
		await expect(notifyEvent(t.db, null, { eventId: E.chasse })).rejects.toMatchObject({
			status: 401
		});
		await expect(notifyEvent(t.db, actors.mj, { eventId: E.masque })).rejects.toMatchObject({
			code: 'EVENT_UNAVAILABLE',
			status: 409
		});
		await expect(notifyEvent(t.db, actors.mj, { eventId: 'e_absent' })).rejects.toMatchObject({
			status: 404
		});
	});
});
