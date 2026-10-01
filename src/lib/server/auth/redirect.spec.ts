import { describe, expect, it } from 'vitest';
import { safeLoginReturn } from './redirect';

const origin = 'https://nuages.example';
describe('retour de connexion', () => {
	it.each([
		'/\t/evil.example',
		'/\n/evil.example',
		'/\r/evil.example',
		'/\u0000x',
		'//evil.example',
		'/\\evil.example',
		'https://evil.example',
		'/entrer?x=1',
		'/entrer/discord/retour',
		'//nuages.example//evil.example'
	])('refuse %j', (value) => {
		expect(safeLoginReturn(value, origin)).toBeNull();
	});
	it('normalise chemin, query et fragment ; accepte une URL de même origine', () => {
		expect(safeLoginReturn('/carnet/a/../journal?q=x#note', origin)).toBe(
			'/carnet/journal?q=x#note'
		);
		expect(safeLoginReturn(`${origin}/carnet`, origin)).toBe('/carnet');
	});
});
