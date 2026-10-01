import { describe, expect, it } from 'vitest';
import {
	MEANING_COLORS,
	behaviorColor,
	eventTypeColor,
	gemColor,
	statusColor,
	UNKNOWN_BEHAVIOR_COLOR,
	UNKNOWN_STATUS_COLOR
} from './colors';
import { STATUS_EFFECTS, STATUS_IDS } from './combat/statuses';
import { EVENT_TYPES, EV_TYPES } from './events';

const HEX = /^#[0-9a-f]{6}$/;

describe('couleurs de sens (table unique, INT-1)', () => {
	it('douze statuts, cinq types de rendez-vous, six comportements, trois gemmes — tous en hex', () => {
		expect(Object.keys(MEANING_COLORS.status)).toHaveLength(12);
		expect(Object.keys(MEANING_COLORS.eventType)).toHaveLength(5);
		expect(Object.keys(MEANING_COLORS.behavior)).toHaveLength(6);
		expect(Object.keys(MEANING_COLORS.gem)).toHaveLength(3);
		for (const group of Object.values(MEANING_COLORS)) {
			for (const value of Object.values(group)) expect(value).toMatch(HEX);
		}
	});

	it('statuts : mêmes valeurs que le moteur de la Table (STATUT_EFFECTS, main.js:12474-12487)', () => {
		expect(Object.keys(MEANING_COLORS.status).sort()).toEqual([...STATUS_IDS].sort());
		for (const id of STATUS_IDS) expect(statusColor(id)).toBe(STATUS_EFFECTS[id].color);
		expect(statusColor('inconnu')).toBe(UNKNOWN_STATUS_COLOR);
		expect(statusColor('toString')).toBe(UNKNOWN_STATUS_COLOR);
	});

	it('rendez-vous : chaque type a sa couleur hex, plus aucune variable CSS', () => {
		expect(Object.keys(MEANING_COLORS.eventType).sort()).toEqual([...EVENT_TYPES].sort());
		for (const type of EVENT_TYPES) {
			expect(EV_TYPES[type].color).toBe(eventTypeColor(type));
			expect(EV_TYPES[type].color).not.toMatch(/^--/);
		}
		expect(eventTypeColor('inconnu')).toBe(MEANING_COLORS.eventType.autre);
		expect(eventTypeColor('combat')).toBe('#c94a4a');
	});

	it('comportements (BHC, main.js:7413-7426) et gemmes (audit 07 §2)', () => {
		expect(behaviorColor('Agressif')).toBe('#c45858');
		expect(behaviorColor('Boss')).toBe('#b98cff');
		expect(behaviorColor('???')).toBe(UNKNOWN_BEHAVIOR_COLOR);
		expect([gemColor('blanche'), gemColor('incarnate'), gemColor('ecarlate')]).toEqual([
			'#e8e8f8',
			'#9a74c4',
			'#c94a4a'
		]);
	});
});
