// Agenda (06-contrats §B.5 ; 03-vision §5.6 ; audit 08 §1) : schémas Zod d'entrée et vues.
// Types purs, importables côté client.
import { z } from 'zod';
import { EVENT_EDITOR_MESSAGES, EVENT_TYPES, type EventType } from '$lib/game/events';
import {
	expectedRevisionSchema,
	formBoolean,
	idSchema,
	optionalDiscordUrlSchema,
	pageSchema
} from './reading';

export type { EventType };

/** Rendez-vous passés affichés par page (audit 08 §1.3 : « Les 8 derniers rendez-vous. »). */
export const PAST_EVENTS_PER_PAGE = 8;
export const EVENT_TITLE_MAX = 120;
export const EVENT_DESCRIPTION_MAX = 4000;

export const eventTypeSchema = z.enum(EVENT_TYPES as unknown as [EventType, ...EventType[]], {
	error: 'Type de rendez-vous inconnu.'
});

/** Capacité : entier ≥ 0, `0` = sans limite (audit 08 §3.2, message exact de l'éditeur). */
export const capacitySchema = z.preprocess(
	(v) => (typeof v === 'string' ? (v.trim() === '' ? 0 : Number(v)) : (v ?? 0)),
	z
		.number({ error: EVENT_EDITOR_MESSAGES.capacityInvalid })
		.int(EVENT_EDITOR_MESSAGES.capacityInvalid)
		.min(0, EVENT_EDITOR_MESSAGES.capacityInvalid)
		.max(10_000, EVENT_EDITOR_MESSAGES.capacityInvalid)
);

/**
 * Date de début : ISO 8601 avec fuseau, ou heure murale de Paris d'un champ `datetime-local`
 * (`2030-01-01T20:00`) ; vide ou `null` ⇒ « Date à confirmer ». La conversion est faite par le domaine.
 */
export const startsAtSchema = z
	.union([z.string().trim().max(40, EVENT_EDITOR_MESSAGES.dateInvalid), z.null()])
	.optional()
	.transform((v) => (v === undefined || v === null || v === '' ? null : v));

const titleSchema = z
	.string({ error: EVENT_EDITOR_MESSAGES.titleRequired })
	.trim()
	.min(1, EVENT_EDITOR_MESSAGES.titleRequired)
	.max(EVENT_TITLE_MAX, `Le titre tient en ${EVENT_TITLE_MAX} caractères.`);

const descriptionSchema = z
	.string()
	.max(EVENT_DESCRIPTION_MAX, `La description tient en ${EVENT_DESCRIPTION_MAX} caractères.`)
	.optional()
	.transform((v) => (v ?? '').replace(/\r\n/g, '\n').trim());

// ---------------------------------------------------------------------------
// Entrées
// ---------------------------------------------------------------------------

export const listAgendaSchema = z.object({ pastPage: pageSchema }).default({});

export const setParticipationSchema = z.object({
	eventId: idSchema,
	participating: formBoolean,
	expectedRevision: expectedRevisionSchema
});

export const createEventSchema = z.object({
	title: titleSchema,
	type: eventTypeSchema.default('autre'),
	description: descriptionSchema,
	startsAt: startsAtSchema,
	capacity: capacitySchema.optional().transform((v) => v ?? 0),
	discordUrl: optionalDiscordUrlSchema,
	hidden: formBoolean.optional().default(false),
	/** « Prévenir les joueurs à la création » (MJ et administrateurs seulement). */
	notify: formBoolean.optional().default(false),
	/** Récit (combat archivé) rattaché au rendez-vous : « Lire le récit → ». */
	recitId: idSchema.optional()
});

export const updateEventSchema = z.object({
	eventId: idSchema,
	expectedRevision: expectedRevisionSchema,
	title: titleSchema.optional(),
	type: eventTypeSchema.optional(),
	description: z
		.string()
		.max(EVENT_DESCRIPTION_MAX, `La description tient en ${EVENT_DESCRIPTION_MAX} caractères.`)
		.transform((v) => v.replace(/\r\n/g, '\n').trim())
		.optional(),
	/** `undefined` = inchangée ; `null` ou `''` = « Date à confirmer ». */
	startsAt: z
		.union([z.string().trim().max(40, EVENT_EDITOR_MESSAGES.dateInvalid), z.null()])
		.optional(),
	capacity: capacitySchema.optional(),
	discordUrl: optionalDiscordUrlSchema.optional(),
	hidden: formBoolean.optional(),
	/** `''` ou `null` détache le récit. */
	recitId: z.union([idSchema, z.literal(''), z.null()]).optional()
});

export const setEventHiddenSchema = z.object({
	eventId: idSchema,
	hidden: formBoolean,
	expectedRevision: expectedRevisionSchema
});

export const strikeEventSchema = z.object({
	eventId: idSchema,
	expectedRevision: expectedRevisionSchema
});

export const notifyEventSchema = z.object({ eventId: idSchema });

export type ListAgendaInput = z.input<typeof listAgendaSchema>;
export type SetParticipationInput = z.input<typeof setParticipationSchema>;
export type CreateEventInput = z.input<typeof createEventSchema>;
export type UpdateEventInput = z.input<typeof updateEventSchema>;
export type SetEventHiddenInput = z.input<typeof setEventHiddenSchema>;
export type StrikeEventInput = z.input<typeof strikeEventSchema>;
export type NotifyEventInput = z.input<typeof notifyEventSchema>;

// ---------------------------------------------------------------------------
// Vues
// ---------------------------------------------------------------------------

export type EventClosedReason = 'undated' | 'past' | 'full' | 'unlinked';

export interface EventParticipantView {
	name: string;
	/** Le personnage du lecteur (« · toi »). */
	me: boolean;
}

/** Une ligne de l'agenda (06-contrats §B.5), déjà filtrée pour le rôle du lecteur. */
export interface EventRowView {
	id: string;
	title: string;
	type: EventType;
	/** « Combat / Chasse », « Exploration », « Social / Roleplay », « Événement majeur », « Autre ». */
	typeLabel: string;
	/** Token de couleur du losange (nom de propriété CSS). */
	typeColor: string;
	description: string;
	startsAt: string | null;
	/** 0 = sans limite. */
	capacity: number;
	count: number;
	participants: EventParticipantView[];
	registered: boolean;
	/**
	 * Le lecteur peut changer sa participation maintenant : s'inscrire si `registered` est faux,
	 * rayer sa place sinon. Faux pour un visiteur, un compte sans personnage, un rendez-vous masqué.
	 */
	canRegister: boolean;
	/** Pourquoi le lecteur ne peut pas s'inscrire (`null` : il le peut, ou il est déjà inscrit). */
	closedReason: EventClosedReason | null;
	discordUrl: string;
	/** Toujours `false` hors staff (les rendez-vous masqués ne sont pas servis). */
	hidden: boolean;
	/** Pseudo de l'organisateur (tampon), ou auteur hérité. */
	organizer: string | null;
	organizerStamp?: {
		role: 'joueur' | 'mj' | 'designer' | 'admin';
		pseudo: string;
		at: string;
	} | null;
	/** Récit rattaché, servi seulement à qui peut le lire. */
	recitId: string | null;
	revision: number;
}

export interface AgendaView {
	upcoming: EventRowView[];
	past: EventRowView[];
	pastPages: number;
}

export interface CreateEventResult {
	event: EventRowView;
	/** Corne déposée chez les comptes reliés. */
	notified: boolean;
	/** Échec de la notification, distinct de l'enregistrement (03-vision §5.6). */
	notifyError: string | null;
}

export interface NotifyEventResult {
	eventId: string;
	announcedAt: string;
	/** Comptes reliés à un personnage qui verront la corne. */
	linkedAccounts: number;
}
