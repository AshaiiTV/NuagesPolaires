// Dates du carnet : fr-FR, Europe/Paris, y compris aux changements d'heure (2026 : 29 mars et 25 octobre).
import { describe, expect, it } from 'vitest';
import {
	dateCourte,
	dateHeure,
	dateLongue,
	heure,
	heureRonde,
	jour,
	jourSemaine,
	joursCalendaires,
	mois,
	parisLocalToDate,
	parisOffsetMinutes,
	relatif,
	toDate,
	versChampLocal
} from './dates';

const NOW = '2026-10-01T10:00:00Z';

describe('formats de base', () => {
	it('jour(), jourSemaine(), heure(), heureRonde()', () => {
		expect(jour('2026-09-26T18:00:00Z')).toBe('samedi 26 septembre');
		expect(jourSemaine('2026-09-26T18:00:00Z')).toBe('samedi');
		expect(heure('2026-09-26T19:14:00Z')).toBe('21:14');
		expect(heureRonde('2026-09-26T18:00:00Z')).toBe('20 h');
		expect(heureRonde('2026-09-26T18:30:00Z')).toBe('20 h 30');
	});

	it('dateLongue() et dateCourte() ajoutent l’année seulement si elle diffère', () => {
		expect(dateLongue('2026-09-26T18:00:00Z', NOW)).toBe('26 septembre');
		expect(dateLongue('2025-09-26T18:00:00Z', NOW)).toBe('26 septembre 2025');
		expect(dateCourte('2026-09-26T18:00:00Z', NOW)).toBe('26 sept.');
		expect(dateCourte('2025-12-03T18:00:00Z', NOW)).toBe('3 déc. 2025');
		expect(dateHeure('2026-09-26T19:47:00Z', NOW)).toBe('26 septembre, 21:47');
		expect(mois('2026-09-26T18:00:00Z')).toBe('septembre 2026');
	});

	it('le jour est celui de Paris, pas celui d’UTC', () => {
		// 22:30 UTC le 26 = 00:30 le 27 à Paris (heure d'été).
		expect(dateLongue('2026-09-26T22:30:00Z', NOW)).toBe('27 septembre');
		expect(heure('2026-09-26T22:30:00Z')).toBe('00:30');
		// 23:30 UTC le 31 décembre = 00:30 le 1er janvier à Paris (heure d'hiver).
		expect(dateLongue('2026-12-31T23:30:00Z', '2027-01-02T00:00:00Z')).toBe('1er janvier');
		expect(dateCourte('2026-12-31T23:30:00Z', '2027-01-02T00:00:00Z')).toBe('1er janv.');
		expect(jour('2026-12-31T23:30:00Z')).toBe('vendredi 1er janvier');
	});

	it('une valeur absente ou invalide donne une chaîne vide', () => {
		for (const f of [jour, heure, heureRonde, mois, jourSemaine]) {
			expect(f(null)).toBe('');
			expect(f('pas une date')).toBe('');
		}
		expect(dateLongue(undefined)).toBe('');
		expect(dateCourte('')).toBe('');
		expect(relatif(null)).toBe('');
		expect(toDate('n’importe quoi')).toBeNull();
	});

	it('accepte Date, millisecondes et ISO', () => {
		const d = new Date('2026-09-26T19:14:00Z');
		expect(heure(d)).toBe('21:14');
		expect(heure(d.getTime())).toBe('21:14');
		expect(heure(d.toISOString())).toBe('21:14');
	});
});

describe('changements d’heure', () => {
	it('heure d’été → heure d’hiver (25 octobre 2026, 03:00 → 02:00)', () => {
		expect(parisOffsetMinutes('2026-10-25T00:30:00Z')).toBe(120);
		expect(parisOffsetMinutes('2026-10-25T01:30:00Z')).toBe(60);
		// Les deux instants affichent 02:30 : l'heure se répète.
		expect(heure('2026-10-25T00:30:00Z')).toBe('02:30');
		expect(heure('2026-10-25T01:30:00Z')).toBe('02:30');
		expect(jour('2026-10-25T01:30:00Z')).toBe('dimanche 25 octobre');
	});

	it('heure d’hiver → heure d’été (29 mars 2026, 02:00 → 03:00)', () => {
		expect(heure('2026-03-29T00:59:00Z')).toBe('01:59');
		expect(heure('2026-03-29T01:00:00Z')).toBe('03:00');
		expect(parisOffsetMinutes('2026-03-29T00:59:00Z')).toBe(60);
		expect(parisOffsetMinutes('2026-03-29T01:00:00Z')).toBe(120);
	});

	it('parisLocalToDate() lit l’heure murale de Paris des deux côtés du changement', () => {
		expect(parisLocalToDate('2030-01-01T20:00')?.toISOString()).toBe('2030-01-01T19:00:00.000Z');
		expect(parisLocalToDate('2026-07-14T20:00')?.toISOString()).toBe('2026-07-14T18:00:00.000Z');
		// Heure ambiguë d'automne : la première occurrence (heure d'été).
		expect(parisLocalToDate('2026-10-25T02:30')?.toISOString()).toBe('2026-10-25T00:30:00.000Z');
		expect(parisLocalToDate('2026-10-25T03:30')?.toISOString()).toBe('2026-10-25T02:30:00.000Z');
		// Heure inexistante de printemps : glisse d'une heure (02:30 → 03:30 CEST).
		const gap = parisLocalToDate('2026-03-29T02:30');
		expect(gap?.toISOString()).toBe('2026-03-29T01:30:00.000Z');
		expect(heure(gap)).toBe('03:30');
		expect(parisLocalToDate('2026-02-30T10:00')).toBeNull();
		expect(parisLocalToDate('demain')).toBeNull();
	});

	it('versChampLocal() est l’inverse de parisLocalToDate()', () => {
		for (const local of ['2026-03-29T03:30', '2026-10-25T02:30', '2026-12-24T21:00']) {
			expect(versChampLocal(parisLocalToDate(local))).toBe(local);
		}
	});

	it('relatif() compte les jours calendaires de Paris à travers le changement d’heure', () => {
		// Samedi 24 octobre 12:00 (CEST) → lundi 26 octobre 11:00 (CET) : 2 jours, même si 47 h.
		expect(joursCalendaires('2026-10-26T10:00:00Z', '2026-10-24T10:00:00Z')).toBe(2);
		expect(relatif('2026-10-26T10:00:00Z', '2026-10-24T10:00:00Z')).toBe('après-demain');
		expect(relatif('2026-10-24T10:00:00Z', '2026-10-26T10:00:00Z')).toBe('avant-hier');
		// 23:30 → 00:30 le lendemain à Paris : « demain » malgré une heure d'écart.
		expect(relatif('2026-09-26T22:30:00Z', '2026-09-26T21:30:00Z')).toBe('demain');
	});
});

describe('relatif()', () => {
	it('écrit l’écart dans la voix du carnet', () => {
		expect(relatif('2026-10-01T09:59:30Z', NOW)).toBe('à l’instant');
		expect(relatif('2026-10-01T09:55:00Z', NOW)).toBe('il y a 5 minutes');
		expect(relatif('2026-10-01T07:00:00Z', NOW)).toBe('il y a 3 heures');
		expect(relatif('2026-09-30T10:00:00Z', NOW)).toBe('hier');
		expect(relatif('2026-09-19T10:00:00Z', NOW)).toBe('il y a 12 jours');
		expect(relatif('2026-10-02T10:00:00Z', NOW)).toBe('demain');
		expect(relatif('2026-10-04T10:00:00Z', NOW)).toBe('dans 3 jours');
		expect(relatif('2026-06-01T10:00:00Z', NOW)).toBe('il y a 4 mois');
	});
});
