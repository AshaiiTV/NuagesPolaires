/**
 * Règles d'inscription aux événements — module pur, sans I/O.
 *
 * Sources : audit 05 §3.5 et §5.5 (`set_event_participation`), audit 08 §1.7,
 * §2 (état calculé des cartes) et §4 (règles serveur), legacy
 * netlify/functions/db.js l. 877-958 et assets/js/main.js l. 15013-15019 (`EV_TYPES`).
 *
 * Les codes et messages sont ceux du serveur legacy, repris tels quels.
 * Aucun import de `$lib/server` : ce fichier est partagé client/serveur.
 */

import { MEANING_COLORS } from './colors';

// ─── Types d'événement ───────────────────────────────────────────────────────

export type EventType = 'combat' | 'exploration' | 'social' | 'evenement' | 'autre';

export const EVENT_TYPES: readonly EventType[] = [
	'combat',
	'exploration',
	'social',
	'evenement',
	'autre'
];

export interface EventTypeMeta {
	icon: string;
	/** Couleur de sens en hexadécimal (table unique $lib/game/colors, décision INT-1). */
	color: string;
	label: string;
}

/** Libellés et icônes des types (`EV_TYPES`, legacy main.js:15013-15019). */
export const EV_TYPES: Readonly<Record<EventType, EventTypeMeta>> = {
	combat: { icon: '⚔', color: MEANING_COLORS.eventType.combat, label: 'Combat / Chasse' },
	exploration: { icon: '🗺', color: MEANING_COLORS.eventType.exploration, label: 'Exploration' },
	social: { icon: '💬', color: MEANING_COLORS.eventType.social, label: 'Social / Roleplay' },
	evenement: { icon: '🌟', color: MEANING_COLORS.eventType.evenement, label: 'Événement majeur' },
	autre: { icon: '☁️', color: MEANING_COLORS.eventType.autre, label: 'Autre' }
};

/** Type inconnu ⇒ `autre` (legacy main.js:15124). */
export function eventTypeMeta(type: string | null | undefined): EventTypeMeta {
	return EV_TYPES[isEventType(type) ? type : 'autre'];
}

export function isEventType(type: unknown): type is EventType {
	return typeof type === 'string' && (EVENT_TYPES as readonly string[]).includes(type);
}

// ─── Entrées ─────────────────────────────────────────────────────────────────

/** Projection minimale d'un événement (table `events`, 04-architecture §3.5). */
export interface RegistrableEvent {
	id: string;
	hidden: boolean;
	/** Date de début ; `null` = « Date à confirmer ». */
	startsAt: Date | number | null;
	/** Places ; `0`/`null` = illimité (audit 05 §3.5). */
	capacity: number | null;
	/** Identifiants des personnages inscrits (`event_participants`). */
	participantIds: readonly string[];
}

/** Projection minimale du personnage qui agit. */
export interface RegisteringCharacter {
	id: string;
	name: string;
	/**
	 * Vrai si un autre personnage porte le même nom (calculé par la couche domaine).
	 * Le legacy identifiait les inscrits par nom (audit 08 §1.7) ; la règle est conservée
	 * tant que l'équipe n'a pas distingué les homonymes.
	 */
	hasHomonym?: boolean;
}

// ─── Résultats ───────────────────────────────────────────────────────────────

export type RegistrationErrorCode =
	'EVENT_CLOSED' | 'EVENT_FULL' | 'EVENT_UNAVAILABLE' | 'EVENT_NOT_FOUND' | 'CHARACTER_UNNAMED';

export interface RegistrationRefusal {
	ok: false;
	code: RegistrationErrorCode;
	message: string;
	/** Statut HTTP du legacy, à reprendre dans `NpError`. */
	status: 400 | 404 | 409;
}

export interface RegistrationAllowed {
	ok: true;
	/** Déjà inscrit : l'inscription est un no-op (legacy db.js:942). */
	alreadyRegistered: boolean;
}

export interface UnregistrationAllowed {
	ok: true;
	wasRegistered: boolean;
}

export type RegistrationResult = RegistrationAllowed | RegistrationRefusal;
export type UnregistrationResult = UnregistrationAllowed | RegistrationRefusal;

/** Messages exacts du serveur legacy (db.js:932-946, audit 05 §5.5). */
export const EVENT_MESSAGES = {
	notFound: 'Événement introuvable.',
	unnamed: 'Ton personnage doit avoir un nom pour participer.',
	homonym:
		"Plusieurs personnages portent ton nom : demande à l'équipe de les distinguer avant de modifier ta participation.",
	closed: 'Les inscriptions à cet événement sont fermées.',
	badCapacity: "La capacité de cet événement doit être corrigée par l'équipe.",
	full: 'Événement complet.'
} as const;

function refuse(
	code: RegistrationErrorCode,
	message: string,
	status: 400 | 404 | 409
): RegistrationRefusal {
	return { ok: false, code, message, status };
}

function toTimestamp(value: Date | number | null | undefined): number | null {
	if (value === null || value === undefined) return null;
	const ts = value instanceof Date ? value.getTime() : Number(value);
	// legacy db.js:491-494 : date valide si finie et > 0
	return Number.isFinite(ts) && ts > 0 ? ts : null;
}

/** Capacité normalisée : `null`/absente ⇒ 0 = illimité ; invalide ⇒ `null` (legacy db.js:943-944). */
export function normalizeCapacity(capacity: number | null | undefined): number | null {
	const max = capacity === undefined || capacity === null ? 0 : Number(capacity);
	if (!Number.isSafeInteger(max) || max < 0) return null;
	return max;
}

/** Vrai si `capacity > 0` et le nombre d'inscrits atteint la capacité (audit 08 §2.1). */
export function isEventFull(
	capacity: number | null | undefined,
	participantCount: number
): boolean {
	const max = normalizeCapacity(capacity) ?? 0;
	return max > 0 && participantCount >= max;
}

/** Contrôles communs aux deux sens (legacy db.js:931-935). */
function checkCharacter(character: RegisteringCharacter): RegistrationRefusal | null {
	if (!character.name || !character.name.trim())
		return refuse('CHARACTER_UNNAMED', EVENT_MESSAGES.unnamed, 400);
	if (character.hasHomonym) return refuse('EVENT_UNAVAILABLE', EVENT_MESSAGES.homonym, 409);
	return null;
}

/**
 * Peut-on inscrire `character` à `event` ? Ordre des refus repris de
 * legacy db.js:931-946 (audit 05 §5.5, audit 08 §4) :
 * nom vide → homonymes → masqué (404) → date absente ou passée (EVENT_CLOSED)
 * → [si pas déjà inscrit] capacité invalide (EVENT_UNAVAILABLE) → complet (EVENT_FULL).
 */
export function canRegister(
	event: RegistrableEvent,
	character: RegisteringCharacter,
	now: Date | number = Date.now()
): RegistrationResult {
	const characterError = checkCharacter(character);
	if (characterError) return characterError;

	if (event.hidden) return refuse('EVENT_NOT_FOUND', EVENT_MESSAGES.notFound, 404);

	const date = toTimestamp(event.startsAt);
	const nowTs = now instanceof Date ? now.getTime() : now;
	if (!date || date < nowTs) return refuse('EVENT_CLOSED', EVENT_MESSAGES.closed, 409);

	const alreadyRegistered = event.participantIds.includes(character.id);
	if (alreadyRegistered) return { ok: true, alreadyRegistered: true };

	const max = normalizeCapacity(event.capacity);
	if (max === null) return refuse('EVENT_UNAVAILABLE', EVENT_MESSAGES.badCapacity, 409);
	if (max > 0 && event.participantIds.length >= max)
		return refuse('EVENT_FULL', EVENT_MESSAGES.full, 409);

	return { ok: true, alreadyRegistered: false };
}

/**
 * Peut-on désinscrire `character` ? Autorisé même si l'événement est masqué ou passé
 * (legacy db.js:949, audit 08 §4 « désinscription ») ; seuls le nom vide et les
 * homonymes bloquent.
 */
export function canUnregister(
	event: Pick<RegistrableEvent, 'participantIds'>,
	character: RegisteringCharacter
): UnregistrationResult {
	const characterError = checkCharacter(character);
	if (characterError) return characterError;
	return { ok: true, wasRegistered: event.participantIds.includes(character.id) };
}

// ─── Édition staff ───────────────────────────────────────────────────────────

/** Messages de validation de l'éditeur staff (audit 08 §3.2, legacy main.js:15246-15257). */
export const EVENT_EDITOR_MESSAGES = {
	titleRequired: "Donne un titre à l'événement.",
	dateInvalid: 'Choisis une date valide.',
	capacityInvalid: 'Le nombre de places doit être un entier positif, ou 0 pour aucune limite.',
	capacityBelowParticipants:
		'La capacité ne peut pas être inférieure au nombre de participants déjà inscrits.'
} as const;

/**
 * Validation de la capacité saisie par le staff : entier ≥ 0 (0 = illimité) et,
 * si > 0, jamais inférieure au nombre d'inscrits existants (audit 08 §3.2).
 * Renvoie le message d'erreur, ou `null` si valide.
 */
export function capacityError(capacity: unknown, participantCount: number): string | null {
	const max = Number(capacity);
	if (!Number.isSafeInteger(max) || max < 0) return EVENT_EDITOR_MESSAGES.capacityInvalid;
	if (max > 0 && max < participantCount) return EVENT_EDITOR_MESSAGES.capacityBelowParticipants;
	return null;
}

// ─── État d'affichage ────────────────────────────────────────────────────────

export type EventState = 'hidden' | 'past' | 'undated' | 'joined' | 'full' | 'open';

/** Libellés d'état des cartes de l'agenda (audit 08 §2.1, legacy main.js:15138). */
export const EVENT_STATE_LABELS: Readonly<Record<EventState, string>> = {
	hidden: 'Masqué · staff',
	past: 'Passé',
	undated: 'Date à confirmer',
	joined: 'Vous participez',
	full: 'Complet',
	open: 'Inscriptions ouvertes'
};

/** État calculé d'un événement, dans l'ordre `hidden > past > undated > joined > full > open` (audit 08 §2.1). */
export function eventState(
	event: RegistrableEvent,
	viewerCharacterId: string | null,
	now: Date | number = Date.now()
): EventState {
	if (event.hidden) return 'hidden';
	const date = toTimestamp(event.startsAt);
	const nowTs = now instanceof Date ? now.getTime() : now;
	if (date !== null && date < nowTs) return 'past';
	if (date === null) return 'undated';
	if (viewerCharacterId && event.participantIds.includes(viewerCharacterId)) return 'joined';
	if (isEventFull(event.capacity, event.participantIds.length)) return 'full';
	return 'open';
}

/** Places restantes ; `null` si sans limite (« Sans limite de places. », audit 08 §2.1). */
export function remainingSeats(
	capacity: number | null | undefined,
	participantCount: number
): number | null {
	const max = normalizeCapacity(capacity) ?? 0;
	if (max <= 0) return null;
	return Math.max(0, max - participantCount);
}
