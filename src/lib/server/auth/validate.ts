// Validation des entrées des domaines (06-contrats §A : Zod, erreurs `INVALID` 400 ; 04 §6 : 428).
import type { z } from 'zod';
import { NpError } from '$lib/server/http';

/** Messages Zod par défaut (anglais) : remplacés par une phrase française générique. */
const DEFAULT_ZOD_MESSAGE = /^(Invalid|Too (big|small)|Expected|Unrecognized|Required)/;

/** Valide `input` ; refus ⇒ NpError INVALID 400 avec le premier message (français) du schéma. */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
	const result = schema.safeParse(input ?? {});
	if (result.success) return result.data;
	const message = result.error.issues[0]?.message ?? '';
	throw new NpError(
		'INVALID',
		message && !DEFAULT_ZOD_MESSAGE.test(message) ? message : 'Entrée invalide.',
		400
	);
}

/** `expectedRevision` absent (ou vide) ⇒ 428 VERSION_REQUIRED (04 §6), avant toute validation. */
export function requireExpectedRevision(input: unknown): void {
	const value =
		input && typeof input === 'object'
			? (input as { expectedRevision?: unknown }).expectedRevision
			: undefined;
	if (value === undefined || value === null || value === '') throw NpError.versionRequired();
}

/** Vrai si l'erreur (ou sa cause) est une violation d'unicité Postgres (23505), éventuellement sur `constraint`. */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
	let current: unknown = error;
	for (let depth = 0; depth < 5 && current; depth++) {
		const e = current as {
			code?: unknown;
			constraint?: unknown;
			message?: unknown;
			cause?: unknown;
		};
		if (e.code === '23505') {
			if (!constraint) return true;
			const where = `${String(e.constraint ?? '')} ${String(e.message ?? '')}`;
			if (where.includes(constraint)) return true;
		}
		current = e.cause;
	}
	return false;
}
