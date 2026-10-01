import { describe, expect, it } from 'vitest';
import {
	EVENT_MESSAGES,
	EVENT_STATE_LABELS,
	EVENT_TYPES,
	EV_TYPES,
	canRegister,
	canUnregister,
	capacityError,
	eventState,
	eventTypeMeta,
	isEventFull,
	isEventType,
	normalizeCapacity,
	remainingSeats,
	type RegistrableEvent,
	type RegisteringCharacter
} from './events';

const NOW = new Date('2026-09-30T20:00:00Z').getTime();
const FUTURE = NOW + 86_400_000;
const PAST = NOW - 86_400_000;

const alice: RegisteringCharacter = { id: 'p_alice', name: 'Alice' };

function event(over: Partial<RegistrableEvent> = {}): RegistrableEvent {
	return { id: 'e_1', hidden: false, startsAt: FUTURE, capacity: 0, participantIds: [], ...over };
}

describe('EV_TYPES (legacy main.js:15013-15019, audit 05 §3.5)', () => {
	it('expose les cinq types avec libellés et icônes exacts', () => {
		expect(EVENT_TYPES).toEqual(['combat', 'exploration', 'social', 'evenement', 'autre']);
		expect(EV_TYPES.combat).toEqual({ icon: '⚔', color: '#c94a4a', label: 'Combat / Chasse' });
		expect(EV_TYPES.exploration).toEqual({ icon: '🗺', color: '#c9a84c', label: 'Exploration' });
		expect(EV_TYPES.social).toEqual({ icon: '💬', color: '#95cdbb', label: 'Social / Roleplay' });
		expect(EV_TYPES.evenement).toEqual({ icon: '🌟', color: '#9a74c4', label: 'Événement majeur' });
		expect(EV_TYPES.autre).toEqual({ icon: '☁️', color: '#92aaa3', label: 'Autre' });
	});

	it('type inconnu ⇒ autre', () => {
		expect(eventTypeMeta('chasse')).toBe(EV_TYPES.autre);
		expect(eventTypeMeta(null)).toBe(EV_TYPES.autre);
		expect(eventTypeMeta('combat')).toBe(EV_TYPES.combat);
		expect(isEventType('social')).toBe(true);
		expect(isEventType('SOCIAL')).toBe(false);
	});
});

describe('canRegister (audit 05 §5.5, legacy db.js:931-946)', () => {
	it('accepte un événement publié, daté dans le futur, avec des places', () => {
		expect(canRegister(event({ capacity: 3, participantIds: ['p_bob'] }), alice, NOW)).toEqual({
			ok: true,
			alreadyRegistered: false
		});
		expect(canRegister(event({ startsAt: new Date(FUTURE) }), alice, new Date(NOW))).toEqual({
			ok: true,
			alreadyRegistered: false
		});
	});

	it('nom vide → 400 « Ton personnage doit avoir un nom pour participer. »', () => {
		expect(canRegister(event(), { id: 'p_x', name: '   ' }, NOW)).toEqual({
			ok: false,
			code: 'CHARACTER_UNNAMED',
			message: EVENT_MESSAGES.unnamed,
			status: 400
		});
	});

	it('homonymes → 409 EVENT_UNAVAILABLE avec le message exact', () => {
		expect(canRegister(event(), { ...alice, hasHomonym: true }, NOW)).toEqual({
			ok: false,
			code: 'EVENT_UNAVAILABLE',
			message:
				"Plusieurs personnages portent ton nom : demande à l'équipe de les distinguer avant de modifier ta participation.",
			status: 409
		});
	});

	it('événement masqué → 404 « Événement introuvable. »', () => {
		expect(canRegister(event({ hidden: true }), alice, NOW)).toEqual({
			ok: false,
			code: 'EVENT_NOT_FOUND',
			message: 'Événement introuvable.',
			status: 404
		});
	});

	it('date absente ou passée → 409 EVENT_CLOSED', () => {
		const closed = {
			ok: false,
			code: 'EVENT_CLOSED',
			message: 'Les inscriptions à cet événement sont fermées.',
			status: 409
		};
		expect(canRegister(event({ startsAt: null }), alice, NOW)).toEqual(closed);
		expect(canRegister(event({ startsAt: PAST }), alice, NOW)).toEqual(closed);
		expect(canRegister(event({ startsAt: 0 }), alice, NOW)).toEqual(closed);
		expect(canRegister(event({ startsAt: Number.NaN }), alice, NOW)).toEqual(closed);
		// à l'instant exact : `date < now` est faux → ouvert (legacy db.js:941)
		expect(canRegister(event({ startsAt: NOW }), alice, NOW).ok).toBe(true);
	});

	it('capacité : 0 ou null = illimité ; max > 0 et n ≥ max → 409 EVENT_FULL « Événement complet. »', () => {
		const three = ['p_a', 'p_b', 'p_c'];
		expect(canRegister(event({ capacity: 0, participantIds: three }), alice, NOW).ok).toBe(true);
		expect(canRegister(event({ capacity: null, participantIds: three }), alice, NOW).ok).toBe(true);
		expect(canRegister(event({ capacity: 4, participantIds: three }), alice, NOW).ok).toBe(true);
		expect(canRegister(event({ capacity: 3, participantIds: three }), alice, NOW)).toEqual({
			ok: false,
			code: 'EVENT_FULL',
			message: 'Événement complet.',
			status: 409
		});
	});

	it('capacité malformée → 409 EVENT_UNAVAILABLE', () => {
		const bad = {
			ok: false,
			code: 'EVENT_UNAVAILABLE',
			message: "La capacité de cet événement doit être corrigée par l'équipe.",
			status: 409
		};
		expect(canRegister(event({ capacity: -1 }), alice, NOW)).toEqual(bad);
		expect(canRegister(event({ capacity: 1.5 }), alice, NOW)).toEqual(bad);
		expect(canRegister(event({ capacity: Number.POSITIVE_INFINITY }), alice, NOW)).toEqual(bad);
	});

	it('déjà inscrit : ok sans contrôle de capacité (no-op)', () => {
		expect(canRegister(event({ capacity: 1, participantIds: ['p_alice'] }), alice, NOW)).toEqual({
			ok: true,
			alreadyRegistered: true
		});
		// mais un événement passé ou masqué refuse même un inscrit
		expect(canRegister(event({ startsAt: PAST, participantIds: ['p_alice'] }), alice, NOW).ok).toBe(false);
	});

	it("respecte l'ordre des refus : nom > homonyme > masqué > fermé > capacité", () => {
		const worst = event({ hidden: true, startsAt: null, capacity: -1, participantIds: [] });
		const code = (r: ReturnType<typeof canRegister>) => (r.ok ? 'OK' : r.code);
		expect(code(canRegister(worst, { id: 'p', name: '' }, NOW))).toBe('CHARACTER_UNNAMED');
		expect(code(canRegister(worst, { ...alice, hasHomonym: true }, NOW))).toBe('EVENT_UNAVAILABLE');
		expect(code(canRegister(worst, alice, NOW))).toBe('EVENT_NOT_FOUND');
		expect(code(canRegister({ ...worst, hidden: false }, alice, NOW))).toBe('EVENT_CLOSED');
		expect(code(canRegister({ ...worst, hidden: false, startsAt: FUTURE }, alice, NOW))).toBe('EVENT_UNAVAILABLE');
	});
});

describe('canUnregister (legacy db.js:949, audit 08 §4)', () => {
	it('autorisé même sur un événement masqué ou passé', () => {
		expect(canUnregister(event({ hidden: true, startsAt: PAST, participantIds: ['p_alice'] }), alice)).toEqual({
			ok: true,
			wasRegistered: true
		});
		expect(canUnregister(event(), alice)).toEqual({ ok: true, wasRegistered: false });
	});

	it('refuse les homonymes et les personnages sans nom', () => {
		expect(canUnregister(event(), { ...alice, hasHomonym: true })).toMatchObject({
			ok: false,
			code: 'EVENT_UNAVAILABLE',
			status: 409
		});
		expect(canUnregister(event(), { id: 'p', name: '' })).toMatchObject({ ok: false, code: 'CHARACTER_UNNAMED' });
	});
});

describe('capacité et places (audit 08 §2.1, §3.2)', () => {
	it('normalizeCapacity', () => {
		expect(normalizeCapacity(undefined)).toBe(0);
		expect(normalizeCapacity(null)).toBe(0);
		expect(normalizeCapacity(5)).toBe(5);
		expect(normalizeCapacity(-1)).toBeNull();
		expect(normalizeCapacity(2.5)).toBeNull();
	});

	it('isEventFull / remainingSeats', () => {
		expect(isEventFull(0, 50)).toBe(false);
		expect(isEventFull(2, 1)).toBe(false);
		expect(isEventFull(2, 2)).toBe(true);
		expect(remainingSeats(0, 3)).toBeNull();
		expect(remainingSeats(5, 3)).toBe(2);
		expect(remainingSeats(2, 5)).toBe(0);
	});

	it('capacityError : messages exacts du staff', () => {
		expect(capacityError(0, 4)).toBeNull();
		expect(capacityError(4, 4)).toBeNull();
		expect(capacityError(1, 2)).toBe(
			'La capacité ne peut pas être inférieure au nombre de participants déjà inscrits.'
		);
		const invalid = 'Le nombre de places doit être un entier positif, ou 0 pour aucune limite.';
		expect(capacityError('1', 2)).toBe('La capacité ne peut pas être inférieure au nombre de participants déjà inscrits.');
		expect(capacityError(-1, 0)).toBe(invalid);
		expect(capacityError(1.5, 0)).toBe(invalid);
		expect(capacityError(Number.NaN, 0)).toBe(invalid);
		expect(capacityError(Number.POSITIVE_INFINITY, 0)).toBe(invalid);
	});
});

describe('eventState (audit 08 §2.1, legacy main.js:15138)', () => {
	it('ordre hidden > past > undated > joined > full > open', () => {
		expect(eventState(event({ hidden: true, startsAt: PAST }), 'p_alice', NOW)).toBe('hidden');
		expect(eventState(event({ startsAt: PAST, participantIds: ['p_alice'] }), 'p_alice', NOW)).toBe('past');
		expect(eventState(event({ startsAt: null, participantIds: ['p_alice'] }), 'p_alice', NOW)).toBe('undated');
		expect(eventState(event({ capacity: 1, participantIds: ['p_alice'] }), 'p_alice', NOW)).toBe('joined');
		expect(eventState(event({ capacity: 1, participantIds: ['p_bob'] }), 'p_alice', NOW)).toBe('full');
		expect(eventState(event({ capacity: 1, participantIds: ['p_bob'] }), null, NOW)).toBe('full');
		expect(eventState(event(), null, NOW)).toBe('open');
	});

	it('libellés exacts', () => {
		expect(EVENT_STATE_LABELS).toEqual({
			hidden: 'Masqué · staff',
			past: 'Passé',
			undated: 'Date à confirmer',
			joined: 'Vous participez',
			full: 'Complet',
			open: 'Inscriptions ouvertes'
		});
	});
});
