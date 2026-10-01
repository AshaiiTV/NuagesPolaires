// Agenda : rendez-vous, inscriptions, organisation et annonce (06-contrats §B.5 ; 03-vision §5.6 ;
// 04-architecture §3.5, §5, §6, §10.7 ; audit 08 §1 ; audit 05 §3.5, §5.5 `set_event_participation`).
//
// Règles reprises :
//   - inscription : `canRegister` / `canUnregister` de `$lib/game/events` (legacy db.js:931-958) ;
//     participations rattachées à l'identifiant du personnage (les homonymes ne bloquent plus,
//     03-vision §5.6) ;
//   - capacité contrôlée SOUS VERROU : `SELECT … FOR UPDATE` sur le rendez-vous avant le comptage
//     et l'insertion (04 §10.7) ; la dernière place prise entre-temps ⇒ 409 EVENT_FULL
//     « La dernière place vient d'être prise. » (06-contrats §A) ;
//   - `expectedRevision` obligatoire (428), contrôlé dans le WHERE de l'UPDATE (409) ;
//   - rendez-vous masqués jamais servis hors staff (04 §4) ;
//   - annonce (« Prévenir les joueurs ») = marque `extra.announcedAt` : la corne est calculée par
//     `reading.ts` chez chaque compte relié, sans table de notifications (03-vision §5.6, §9.8).
import { and, asc, eq, gte, inArray, isNotNull, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { z } from 'zod';
import type { Db, Tx } from '$lib/server/db';
import {
	accounts,
	characters,
	combatParticipants,
	combats,
	eventParticipants,
	events,
	type Event as EventRecord
} from '$lib/server/db/schema';
import { NpError } from '$lib/server/http';
import { assertCan, can, requireOwnCharacter, type Actor } from '$lib/server/permissions';
import { appendStaffLog } from './staff-log';
import { recordAudit } from './audit';
import {
	EVENT_EDITOR_MESSAGES,
	EVENT_MESSAGES,
	canRegister,
	canUnregister,
	capacityError,
	eventTypeMeta,
	type RegistrationRefusal
} from '$lib/game/events';
import {
	PAST_EVENTS_PER_PAGE,
	createEventSchema,
	listAgendaSchema,
	notifyEventSchema,
	setEventHiddenSchema,
	setParticipationSchema,
	strikeEventSchema,
	updateEventSchema,
	type AgendaView,
	type CreateEventInput,
	type CreateEventResult,
	type EventClosedReason,
	type EventRowView,
	type ListAgendaInput,
	type NotifyEventInput,
	type NotifyEventResult,
	type SetEventHiddenInput,
	type SetParticipationInput,
	type StrikeEventInput,
	type UpdateEventInput
} from '$lib/schemas/events';
import { dateHeure, parisLocalToDate } from '$lib/ui/dates';

type Conn = Db | Tx;

/** Message officiel d'une dernière place prise entre-temps (06-contrats §A). */
export const EVENT_FULL_MESSAGE = "La dernière place vient d'être prise.";

// ---------------------------------------------------------------------------
// Outils communs
// ---------------------------------------------------------------------------

function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
	const result = schema.safeParse(input);
	if (!result.success) {
		throw new NpError('INVALID', result.error.issues[0]?.message ?? 'Saisie invalide.', 400);
	}
	return result.data;
}

/** 04 §6 : une mutation sans `expectedRevision` est refusée (428) avant toute validation. */
function requireRevision(input: unknown): void {
	const value = (input as { expectedRevision?: unknown } | null | undefined)?.expectedRevision;
	if (value === undefined || value === null || value === '') throw NpError.versionRequired();
}

function notFound(): NpError {
	return NpError.notFound(EVENT_MESSAGES.notFound);
}

/**
 * Date de début saisie : ISO avec fuseau, ou heure murale de Paris (`datetime-local`) ; `null` =
 * « Date à confirmer ». Message exact de l'éditeur staff (audit 08 §1.5).
 */
export function parseStartsAt(value: string | null): Date | null {
	if (value === null) return null;
	const local = parisLocalToDate(value);
	if (local) return local;
	if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
		const d = new Date(value);
		if (Number.isFinite(d.getTime())) return d;
	}
	throw new NpError('INVALID', EVENT_EDITOR_MESSAGES.dateInvalid, 400);
}

function extraOf(row: Pick<EventRecord, 'extra'>): Record<string, unknown> {
	return row.extra && typeof row.extra === 'object' ? { ...row.extra } : {};
}

function stringField(extra: Record<string, unknown>, key: string): string | null {
	const v = extra[key];
	return typeof v === 'string' && v !== '' ? v : null;
}

/** Récit rattaché à un rendez-vous (`extra.recitId`, champ de l'agenda). */
export function recitIdOf(row: Pick<EventRecord, 'extra'>): string | null {
	return stringField(extraOf(row), 'recitId');
}

/** Instant de l'annonce (`extra.announcedAt`), ou `null` si le rendez-vous n'a jamais été annoncé. */
export function announcedAtOf(row: Pick<EventRecord, 'extra'>): Date | null {
	const v = stringField(extraOf(row), 'announcedAt');
	if (!v) return null;
	const d = new Date(v);
	return Number.isFinite(d.getTime()) ? d : null;
}

function eventLabel(row: Pick<EventRecord, 'title' | 'startsAt'>): string {
	return `Rendez-vous '${row.title}'${row.startsAt ? ` le ${dateHeure(row.startsAt)}` : ''}`;
}

/** Traduit un refus de la règle pure en erreur serveur. */
function refusal(r: RegistrationRefusal): NpError {
	switch (r.code) {
		case 'EVENT_NOT_FOUND':
			return notFound();
		case 'CHARACTER_UNNAMED':
			return new NpError('INVALID', r.message, 400);
		case 'EVENT_FULL':
			return new NpError('EVENT_FULL', EVENT_FULL_MESSAGE, 409);
		default:
			return new NpError(r.code, r.message, r.status);
	}
}

async function assertRecitExists(db: Conn, recitId: string): Promise<void> {
	const [row] = await db.select({ id: combats.id }).from(combats).where(eq(combats.id, recitId));
	if (!row) throw new NpError('INVALID', 'Ce récit est introuvable.', 400);
}

// ---------------------------------------------------------------------------
// Vues
// ---------------------------------------------------------------------------

/**
 * Construit les lignes d'agenda vues par `actor` (participants nommés, `me`, état d'inscription,
 * organisateur, récit lisible). Exporté pour « Dernières pages » (`reading.ts`).
 */
export async function buildEventRows(
	db: Conn,
	actor: Actor | null,
	rows: readonly EventRecord[],
	now: Date = new Date()
): Promise<EventRowView[]> {
	if (rows.length === 0) return [];
	const ids = rows.map((r) => r.id);
	const myCharacterId = actor?.characterId ?? null;

	const participantRows = await db
		.select({
			eventId: eventParticipants.eventId,
			characterId: eventParticipants.characterId,
			name: characters.name
		})
		.from(eventParticipants)
		.innerJoin(characters, eq(characters.id, eventParticipants.characterId))
		.where(inArray(eventParticipants.eventId, ids))
		.orderBy(asc(eventParticipants.registeredAt), asc(characters.name));
	const participantsByEvent = new Map<string, { characterId: string; name: string }[]>();
	for (const p of participantRows) {
		const list = participantsByEvent.get(p.eventId) ?? [];
		list.push({ characterId: p.characterId, name: p.name });
		participantsByEvent.set(p.eventId, list);
	}

	const creatorIds = [...new Set(rows.map((r) => r.createdBy).filter((v): v is string => !!v))];
	const pseudoById = new Map<string, string>();
	if (creatorIds.length > 0) {
		const creators = await db
			.select({ id: accounts.id, pseudo: accounts.pseudo })
			.from(accounts)
			.where(inArray(accounts.id, creatorIds));
		for (const c of creators) pseudoById.set(c.id, c.pseudo);
	}

	// Récits : servis à qui peut les lire (staff de la Table : tout récit clos ; joueur : récit clos,
	// lisible par ses participants, où son personnage figure ; visiteur : jamais).
	const recitIds = [...new Set(rows.map(recitIdOf).filter((v): v is string => !!v))];
	const readableRecits = new Set<string>();
	if (recitIds.length > 0 && actor) {
		const closed = await db
			.select({ id: combats.id, visible: combats.visibleToParticipants })
			.from(combats)
			.where(and(inArray(combats.id, recitIds), isNotNull(combats.closedAt)));
		if (can(actor.role, 'combat.run')) {
			for (const c of closed) readableRecits.add(c.id);
		} else if (myCharacterId) {
			const visible = closed.filter((c) => c.visible).map((c) => c.id);
			if (visible.length > 0) {
				const mine = await db
					.select({ id: combatParticipants.combatId })
					.from(combatParticipants)
					.where(
						and(
							inArray(combatParticipants.combatId, visible),
							eq(combatParticipants.characterId, myCharacterId)
						)
					);
				for (const m of mine) readableRecits.add(m.id);
			}
		}
	}

	const nowTs = now.getTime();
	return rows.map((row) => {
		const participants = participantsByEvent.get(row.id) ?? [];
		const registered = !!myCharacterId && participants.some((p) => p.characterId === myCharacterId);
		const startTs = row.startsAt ? row.startsAt.getTime() : null;
		const count = participants.length;
		let closedReason: EventClosedReason | null = null;
		if (startTs === null) closedReason = 'undated';
		else if (startTs < nowTs) closedReason = 'past';
		else if (!myCharacterId) closedReason = 'unlinked';
		else if (!registered && row.capacity > 0 && count >= row.capacity) closedReason = 'full';
		// Rayer sa place reste possible tant que le rendez-vous n'est pas passé (legacy db.js:949).
		const canChange = registered
			? !row.hidden && closedReason !== 'past'
			: !row.hidden && closedReason === null;
		const meta = eventTypeMeta(row.type);
		const recitId = recitIdOf(row);
		return {
			id: row.id,
			title: row.title,
			type: row.type,
			typeLabel: meta.label,
			typeColor: meta.color,
			description: row.description,
			startsAt: row.startsAt ? row.startsAt.toISOString() : null,
			capacity: row.capacity,
			count,
			participants: participants.map((p) => ({
				name: p.name,
				me: p.characterId === myCharacterId
			})),
			registered,
			canRegister: canChange,
			closedReason,
			discordUrl: row.discordUrl,
			hidden: row.hidden,
			organizer:
				(row.createdBy ? pseudoById.get(row.createdBy) : undefined) ?? (row.createdByLabel || null),
			recitId: recitId && readableRecits.has(recitId) ? recitId : null,
			revision: row.revision
		};
	});
}

async function loadEventRow(db: Conn, actor: Actor | null, eventId: string): Promise<EventRowView> {
	const [row] = await db.select().from(events).where(eq(events.id, eventId));
	if (!row) throw notFound();
	const [view] = await buildEventRows(db, actor, [row]);
	return view;
}

/** Les `limit` prochains rendez-vous visibles et datés (« Ce qui vient », 03-vision §5.2). */
export async function listUpcomingEvents(
	db: Conn,
	actor: Actor | null,
	limit: number,
	now: Date = new Date()
): Promise<EventRowView[]> {
	const rows = await db
		.select()
		.from(events)
		.where(and(eq(events.hidden, false), gte(events.startsAt, now)))
		.orderBy(asc(events.startsAt), asc(events.id))
		.limit(limit);
	return buildEventRows(db, actor, rows, now);
}

// ---------------------------------------------------------------------------
// Lecture : l'agenda
// ---------------------------------------------------------------------------

/**
 * Agenda vu par `actor` (visiteur compris). Les rendez-vous masqués ne sont servis qu'aux rôles qui
 * organisent (`events.manage`). À venir : sans date d'abord (« Date à confirmer », ordre legacy
 * main.js:15079-15121), puis par date croissante ; passés : du plus récent au plus ancien, 8 par page.
 */
export async function listAgenda(
	db: Db,
	actor: Actor | null,
	input: ListAgendaInput = {}
): Promise<AgendaView> {
	const { pastPage } = parse(listAgendaSchema, input ?? {});
	const staff = can(actor?.role, 'events.manage');
	const rows = await db
		.select()
		.from(events)
		.where(staff ? undefined : eq(events.hidden, false))
		.orderBy(asc(events.startsAt), asc(events.createdAt), asc(events.id));
	const now = new Date();
	const nowTs = now.getTime();
	const undated = rows.filter((r) => !r.startsAt);
	const future = rows.filter((r) => r.startsAt && r.startsAt.getTime() >= nowTs);
	const past = rows.filter((r) => r.startsAt && r.startsAt.getTime() < nowTs).reverse();
	const pastPages = Math.max(1, Math.ceil(past.length / PAST_EVENTS_PER_PAGE));
	const page = Math.min(pastPage ?? 1, pastPages);
	const pastSlice = past.slice((page - 1) * PAST_EVENTS_PER_PAGE, page * PAST_EVENTS_PER_PAGE);
	const upcomingRows = [...undated, ...future];
	const views = await buildEventRows(db, actor, [...upcomingRows, ...pastSlice], now);
	return {
		upcoming: views.slice(0, upcomingRows.length),
		past: views.slice(upcomingRows.length),
		pastPages
	};
}

// ---------------------------------------------------------------------------
// Joueur : participer
// ---------------------------------------------------------------------------

/**
 * « Je viens » / « Rayer ma place » pour le personnage de la session (audit 05 §5.5). Une seule
 * transaction : verrou sur le rendez-vous, contrôle des règles et de la capacité, écriture de la
 * participation, contrôle de révision dans le WHERE de l'UPDATE, audit.
 */
export async function setParticipation(
	db: Db,
	actor: Actor | null,
	input: SetParticipationInput
): Promise<EventRowView> {
	const { actor: present, characterId } = requireOwnCharacter(actor);
	requireRevision(input);
	const data = parse(setParticipationSchema, input);
	const now = new Date();

	return db.transaction(async (tx) => {
		const [event] = await tx.select().from(events).where(eq(events.id, data.eventId)).for('update');
		if (!event) throw notFound();

		const [character] = await tx
			.select({ id: characters.id, name: characters.name })
			.from(characters)
			.where(eq(characters.id, characterId));
		if (!character) throw NpError.notFound('Ta fiche est introuvable.');

		const participantIds = (
			await tx
				.select({ characterId: eventParticipants.characterId })
				.from(eventParticipants)
				.where(eq(eventParticipants.eventId, event.id))
		).map((p) => p.characterId);
		const registrable = {
			id: event.id,
			hidden: event.hidden,
			startsAt: event.startsAt,
			capacity: event.capacity,
			participantIds
		};

		if (data.participating) {
			const verdict = canRegister(registrable, { id: character.id, name: character.name }, now);
			if (!verdict.ok) throw refusal(verdict);
			if (!verdict.alreadyRegistered) {
				await tx
					.insert(eventParticipants)
					.values({ eventId: event.id, characterId: character.id })
					.onConflictDoNothing();
			}
		} else {
			const verdict = canUnregister(registrable, { id: character.id, name: character.name });
			if (!verdict.ok) throw refusal(verdict);
			await tx
				.delete(eventParticipants)
				.where(
					and(
						eq(eventParticipants.eventId, event.id),
						eq(eventParticipants.characterId, character.id)
					)
				);
		}

		const bumped = await tx
			.update(events)
			.set({ revision: sql`${events.revision} + 1` })
			.where(and(eq(events.id, event.id), eq(events.revision, data.expectedRevision)))
			.returning({ id: events.id });
		if (bumped.length === 0) throw NpError.versionConflict();

		await recordAudit(tx, {
			source: 'events',
			action: 'set_event_participation',
			actor: present,
			details: { characterId: character.id, eventId: event.id, participating: data.participating }
		});
		return loadEventRow(tx, present, event.id);
	});
}

// ---------------------------------------------------------------------------
// Staff : organiser
// ---------------------------------------------------------------------------

/**
 * Crée un rendez-vous (MJ, designer, administrateur). « Prévenir les joueurs » (MJ et
 * administrateurs) est exécuté APRÈS l'enregistrement, dans sa propre transaction : son échec est
 * rapporté à part et ne défait pas le rendez-vous (03-vision §5.6 ; audit 08 §1.5 point 4).
 */
export async function createEvent(
	db: Db,
	actor: Actor | null,
	input: CreateEventInput
): Promise<CreateEventResult> {
	const present = assertCan(actor, 'events.manage');
	const data = parse(createEventSchema, input);
	if (data.notify && !can(present.role, 'events.notify')) {
		throw NpError.forbidden('Seuls les MJ et les administrateurs préviennent les joueurs.');
	}
	const startsAt = parseStartsAt(data.startsAt);
	const id = `e_${nanoid(16)}`;

	await db.transaction(async (tx) => {
		if (data.recitId) await assertRecitExists(tx, data.recitId);
		await tx.insert(events).values({
			id,
			title: data.title,
			type: data.type,
			description: data.description,
			startsAt,
			capacity: data.capacity,
			hidden: data.hidden,
			discordUrl: data.discordUrl,
			createdBy: present.accountId,
			createdByLabel: present.pseudo,
			extra: data.recitId ? { recitId: data.recitId } : {}
		});
		await appendStaffLog(tx, {
			action: 'event_cree',
			detail: eventLabel({ title: data.title, startsAt }),
			actor: present,
			target: data.title
		});
		await recordAudit(tx, {
			source: 'events',
			action: 'event_create',
			actor: present,
			details: { eventId: id, title: data.title, hidden: data.hidden, capacity: data.capacity }
		});
	});

	let notified = false;
	let notifyError: string | null = null;
	if (data.notify) {
		if (data.hidden) {
			notifyError = 'Un rendez-vous masqué ne prévient personne : rends-le visible, puis préviens.';
		} else {
			try {
				await notifyEvent(db, present, { eventId: id });
				notified = true;
			} catch (e) {
				notifyError =
					e instanceof NpError
						? e.message
						: 'Le rendez-vous est noté, mais les joueurs n’ont pas été prévenus. Recharge avant de réessayer.';
			}
		}
	}
	return { event: await loadEventRow(db, present, id), notified, notifyError };
}

/**
 * Modifie un rendez-vous (MJ, designer, administrateur). Verrou, puis contrôle de la capacité
 * contre les inscrits (audit 08 §1.5 : « La capacité ne peut pas être inférieure au nombre de
 * participants déjà inscrits. »), puis UPDATE conditionné par la révision. Les inscriptions et les
 * champs hérités (`extra`) sont conservés.
 */
export async function updateEvent(
	db: Db,
	actor: Actor | null,
	input: UpdateEventInput
): Promise<EventRowView> {
	const present = assertCan(actor, 'events.manage');
	requireRevision(input);
	const data = parse(updateEventSchema, input);

	return db.transaction(async (tx) => {
		const [event] = await tx.select().from(events).where(eq(events.id, data.eventId)).for('update');
		if (!event) throw notFound();

		const [{ n }] = await tx
			.select({ n: sql<number>`count(*)::int` })
			.from(eventParticipants)
			.where(eq(eventParticipants.eventId, event.id));
		const capacity = data.capacity ?? event.capacity;
		const capacityMessage = capacityError(capacity, n);
		if (capacityMessage) throw new NpError('INVALID', capacityMessage, 400);

		const startsAt =
			data.startsAt === undefined
				? event.startsAt
				: parseStartsAt(data.startsAt === '' ? null : data.startsAt);

		const extra = extraOf(event);
		if (data.recitId !== undefined) {
			if (data.recitId === null || data.recitId === '') delete extra.recitId;
			else {
				await assertRecitExists(tx, data.recitId);
				extra.recitId = data.recitId;
			}
		}

		const title = data.title ?? event.title;
		const updated = await tx
			.update(events)
			.set({
				title,
				type: data.type ?? event.type,
				description: data.description ?? event.description,
				startsAt,
				capacity,
				discordUrl: data.discordUrl ?? event.discordUrl,
				hidden: data.hidden ?? event.hidden,
				extra,
				revision: sql`${events.revision} + 1`
			})
			.where(and(eq(events.id, event.id), eq(events.revision, data.expectedRevision)))
			.returning({ id: events.id });
		if (updated.length === 0) throw NpError.versionConflict();

		await appendStaffLog(tx, {
			action: 'event_modif',
			detail: eventLabel({ title, startsAt }),
			actor: present,
			target: title
		});
		await recordAudit(tx, {
			source: 'events',
			action: 'event_update',
			actor: present,
			details: {
				eventId: event.id,
				fields: Object.keys(input ?? {}).filter((k) => k !== 'eventId' && k !== 'expectedRevision')
			}
		});
		return loadEventRow(tx, present, event.id);
	});
}

/** Masque ou publie un rendez-vous (« Masqué : visible des MJ et des administrateurs »). */
export async function setEventHidden(
	db: Db,
	actor: Actor | null,
	input: SetEventHiddenInput
): Promise<EventRowView> {
	const present = assertCan(actor, 'events.manage');
	requireRevision(input);
	const data = parse(setEventHiddenSchema, input);

	return db.transaction(async (tx) => {
		const updated = await tx
			.update(events)
			.set({ hidden: data.hidden, revision: sql`${events.revision} + 1` })
			.where(and(eq(events.id, data.eventId), eq(events.revision, data.expectedRevision)))
			.returning({ id: events.id, title: events.title });
		if (updated.length === 0) {
			const [exists] = await tx
				.select({ id: events.id })
				.from(events)
				.where(eq(events.id, data.eventId));
			throw exists ? NpError.versionConflict() : notFound();
		}
		const title = updated[0].title;
		await appendStaffLog(tx, {
			action: 'event_visibilite',
			detail: `Rendez-vous '${title}' ${data.hidden ? 'masqué' : 'publié'}`,
			actor: present,
			target: title
		});
		await recordAudit(tx, {
			source: 'events',
			action: 'event_visibility',
			actor: present,
			details: { eventId: data.eventId, hidden: data.hidden }
		});
		return loadEventRow(tx, present, data.eventId);
	});
}

/**
 * Raye un rendez-vous : il sort de l'agenda avec ses inscriptions (legacy `deleteEvent`,
 * main.js:15312-15327). La version complète (titre, date, inscrits) reste dans le journal d'audit.
 */
export async function strikeEvent(
	db: Db,
	actor: Actor | null,
	input: StrikeEventInput
): Promise<{ eventId: string; struck: true }> {
	const present = assertCan(actor, 'events.manage');
	requireRevision(input);
	const data = parse(strikeEventSchema, input);

	return db.transaction(async (tx) => {
		const [event] = await tx.select().from(events).where(eq(events.id, data.eventId)).for('update');
		if (!event) throw notFound();
		const participants = (
			await tx
				.select({ name: characters.name })
				.from(eventParticipants)
				.innerJoin(characters, eq(characters.id, eventParticipants.characterId))
				.where(eq(eventParticipants.eventId, event.id))
		).map((p) => p.name);

		const deleted = await tx
			.delete(events)
			.where(and(eq(events.id, event.id), eq(events.revision, data.expectedRevision)))
			.returning({ id: events.id });
		if (deleted.length === 0) throw NpError.versionConflict();

		await appendStaffLog(tx, {
			action: 'event_supprime',
			detail: `${eventLabel(event)} rayé`,
			actor: present,
			target: event.title
		});
		await recordAudit(tx, {
			source: 'events',
			action: 'event_strike',
			actor: present,
			details: {
				eventId: event.id,
				title: event.title,
				type: event.type,
				startsAt: event.startsAt ? event.startsAt.toISOString() : null,
				capacity: event.capacity,
				hidden: event.hidden,
				participants
			}
		});
		return { eventId: event.id, struck: true as const };
	});
}

/**
 * « Prévenir les joueurs » (MJ et administrateurs) : marque le rendez-vous comme annoncé
 * (`extra.announcedAt`). Chaque compte relié à un personnage y voit une corne dans « Dernières
 * pages » (calculée par `reading.ts`). Une nouvelle annonce déplace la corne à la date de l'annonce.
 * Ne touche ni la révision (aucun champ éditable ne change) ni l'historique des fiches.
 */
export async function notifyEvent(
	db: Db,
	actor: Actor | null,
	input: NotifyEventInput
): Promise<NotifyEventResult> {
	const present = assertCan(actor, 'events.notify');
	const data = parse(notifyEventSchema, input);
	const announcedAt = new Date();

	return db.transaction(async (tx) => {
		const [event] = await tx.select().from(events).where(eq(events.id, data.eventId)).for('update');
		if (!event) throw notFound();
		if (event.hidden) {
			throw new NpError(
				'EVENT_UNAVAILABLE',
				'Un rendez-vous masqué ne prévient personne : rends-le visible, puis préviens.',
				409
			);
		}
		const extra = {
			...extraOf(event),
			announcedAt: announcedAt.toISOString(),
			announcedBy: present.pseudo
		};
		await tx.update(events).set({ extra }).where(eq(events.id, event.id));

		const [{ n }] = await tx
			.select({ n: sql<number>`count(*)::int` })
			.from(accounts)
			.where(isNotNull(accounts.characterId));
		await appendStaffLog(tx, {
			action: 'event_notif',
			detail: `Corne déposée chez ${n} compte${n > 1 ? 's' : ''} relié${n > 1 ? 's' : ''} pour '${event.title}'`,
			actor: present,
			target: event.title
		});
		await recordAudit(tx, {
			source: 'events',
			action: 'event_notify',
			actor: present,
			details: { eventId: event.id, linkedAccounts: n }
		});
		return { eventId: event.id, announcedAt: announcedAt.toISOString(), linkedAccounts: n };
	});
}
