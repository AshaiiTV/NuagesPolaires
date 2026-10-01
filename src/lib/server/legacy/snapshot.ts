// Format strict de legacy/scripts/helpers/store-backup.js:10-59 ; audit 05 §9.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';

export type SnapshotErrorCode =
	| 'UNREADABLE_BACKUP'
	| 'INVALID_FORMAT'
	| 'INVALID_ROWS'
	| 'INVALID_ROW'
	| 'DUPLICATE_KEY'
	| 'INVALID_JSONB'
	| 'COUNT_MISMATCH'
	| 'INVALID_ROW_ORDER'
	| 'CHECKSUM_MISMATCH';
export class SnapshotError extends Error {
	constructor(readonly code: SnapshotErrorCode) {
		super(`Sauvegarde héritée refusée : ${code}.`);
		this.name = 'SnapshotError';
	}
}
export interface SnapshotRow {
	key: string;
	value: string;
	updated_at: string | null;
}
export interface Snapshot {
	format: 'np-store-backup-v1';
	exportedAt: string;
	valueEncoding: 'postgresql-jsonb-text';
	count: number;
	rows: SnapshotRow[];
	sha256: string;
}

/** Canonisation de l'enveloppe ; le texte JSONB reste intact (grands nombres et microsecondes). */
export function canonicalJson(value: unknown): string {
	if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
	if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
	const record = value as Record<string, unknown>;
	return `{${Object.keys(record)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
		.join(',')}}`;
}
export function checksum(value: unknown): string {
	return createHash('sha256').update(canonicalJson(value)).digest('hex');
}
const envelope = z.strictObject({
	format: z.literal('np-store-backup-v1'),
	exportedAt: z
		.string()
		.regex(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/)
		.refine((v) => Number.isFinite(Date.parse(v))),
	valueEncoding: z.literal('postgresql-jsonb-text'),
	count: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
	rows: z.unknown().refine((v) => v !== undefined),
	sha256: z.string().regex(/^[a-f0-9]{64}$/)
});
const rowSchema = z.strictObject({
	key: z.string(),
	value: z.string(),
	updated_at: z.string().min(1).nullable()
});
export function validateSnapshot(value: unknown): Snapshot {
	const parsed = envelope.safeParse(value);
	if (!parsed.success) throw new SnapshotError('INVALID_FORMAT');
	if (!Array.isArray(parsed.data.rows)) throw new SnapshotError('INVALID_ROWS');
	const rows: SnapshotRow[] = [],
		seen = new Set<string>();
	for (const value of parsed.data.rows) {
		const row = rowSchema.safeParse(value);
		if (!row.success) throw new SnapshotError('INVALID_ROW');
		if (seen.has(row.data.key)) throw new SnapshotError('DUPLICATE_KEY');
		seen.add(row.data.key);
		try {
			JSON.parse(row.data.value);
		} catch {
			throw new SnapshotError('INVALID_JSONB');
		}
		rows.push(row.data);
	}
	if (parsed.data.count !== rows.length) throw new SnapshotError('COUNT_MISMATCH');
	for (let i = 1; i < rows.length; i++)
		if (rows[i - 1].key >= rows[i].key) throw new SnapshotError('INVALID_ROW_ORDER');
	const { sha256, ...payload } = { ...parsed.data, rows };
	if (checksum(payload) !== sha256) throw new SnapshotError('CHECKSUM_MISMATCH');
	return { ...payload, sha256 };
}
export function makeSnapshot(rows: SnapshotRow[], exportedAt = new Date().toISOString()): Snapshot {
	const payload = {
		format: 'np-store-backup-v1' as const,
		exportedAt,
		valueEncoding: 'postgresql-jsonb-text' as const,
		count: rows.length,
		rows: [...rows].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
	};
	return validateSnapshot({ ...payload, sha256: checksum(payload) });
}
export async function readSnapshot(filename: string): Promise<Snapshot> {
	let value: unknown;
	try {
		value = JSON.parse(await readFile(filename, 'utf8'));
	} catch {
		throw new SnapshotError('UNREADABLE_BACKUP');
	}
	return validateSnapshot(value);
}
