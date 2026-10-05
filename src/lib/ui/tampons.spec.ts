import { describe, expect, it } from 'vitest';
import { phraseTampon, signature } from './tampons';

describe('tampons partagés', () => {
	const date = '2026-09-26T19:47:00Z';
	it('signe avec rôle, pseudo, date courte et heure de Paris', () => {
		expect(signature('mj', 'Maitre', date)).toBe('MJ Maitre · 26 sept. 21:47');
	});
	it('ne répète pas un pseudo identique au rôle', () => {
		expect(signature('mj', 'mj', date)).toBe('MJ · 26 sept. 21:47');
		expect(signature('admin', 'ADMINISTRATEUR', date)).toBe('administrateur · 26 sept. 21:47');
	});
	it('imprime le motif et le premier du mois en toutes lettres', () => {
		expect(phraseTampon('mj', 'Maitre', '2026-10-01T19:47:00Z', 'combat archivé')).toBe(
			'tamponné par MJ Maitre le 1er octobre, 21:47 — motif : combat archivé'
		);
	});
});
