import { describe, expect, it } from 'vitest';
import { checksum, makeSnapshot, readSnapshot, validateSnapshot, SnapshotError } from './snapshot';
const rows = [
	{ key: 'a', value: '{"large":9007199254740993123}', updated_at: '2026-09-30 12:00:00.123456+00' },
	{ key: 'b', value: 'null', updated_at: null }
];
describe('snapshot np-store-backup-v1', () => {
	it('préserve le texte JSONB et les microsecondes, canonise les clés de l’enveloppe', async () => {
		const snapshot = makeSnapshot([...rows].reverse(), '2026-09-30T12:00:00.000Z');
		expect(validateSnapshot(JSON.parse(JSON.stringify(snapshot)))).toEqual(snapshot);
		expect(snapshot.rows).toEqual(rows);
		expect(checksum({ b: 2, a: 1 })).toBe(checksum({ a: 1, b: 2 }));
		expect((await readSnapshot('tests/fixtures/np-store-demo.json')).count).toBe(25);
	});
	it.each([
		['INVALID_FORMAT', { format: 'autre' }],
		['INVALID_FORMAT', { extra: 1 }],
		['INVALID_ROWS', { rows: {} }],
		['INVALID_ROW', { rows: [{ key: 'a', value: 'null' }] }],
		['INVALID_JSONB', { rows: [{ ...rows[0], value: '{' }] }],
		['DUPLICATE_KEY', { rows: [rows[0], rows[0]] }],
		['COUNT_MISMATCH', { count: 4 }],
		['INVALID_ROW_ORDER', { rows: [...rows].reverse() }],
		['CHECKSUM_MISMATCH', { rows: [{ ...rows[0], value: '{}' }, rows[1]] }]
	])('refuse %s', (code, changes) => {
		expect(() => validateSnapshot({ ...makeSnapshot(rows), ...changes })).toThrow(
			expect.objectContaining({ code })
		);
	});
	it('refuse un fichier illisible avec une erreur typée', async () => {
		await expect(readSnapshot('tests/fixtures/inexistant.json')).rejects.toBeInstanceOf(
			SnapshotError
		);
	});
});
