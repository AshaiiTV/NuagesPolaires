// Entrées des formulaires Personnages : les domaines restent responsables des droits et des règles.
import type { z } from 'zod';
import type { FormValues } from '$lib/server/actions';
import { error } from '@sveltejs/kit';
import { isNpError, NpError } from '$lib/server/http';

/** Une fiche absente ou rayée garde le statut métier dans une lecture SvelteKit. */
export async function lecture<T>(read: () => Promise<T>): Promise<T> {
	try {
		return await read();
	} catch (cause) {
		if (isNpError(cause)) error(cause.status, { message: cause.message, code: cause.code });
		throw cause;
	}
}

export function texte(data: FormValues, key: string): string {
	const value = data[key];
	return typeof value === 'string' ? value : '';
}

export function nombre(data: FormValues, key: string): number {
	const value = data[key];
	return (typeof value === 'string' && value.trim() !== '') || typeof value === 'number'
		? Number(value)
		: NaN;
}

export function revision(data: FormValues): number {
	if (data.expectedRevision === undefined || data.expectedRevision === '')
		throw NpError.versionRequired();
	return nombre(data, 'expectedRevision');
}

export function entree<T>(schema: z.ZodType<T>, input: unknown): T {
	const result = schema.safeParse(input);
	if (!result.success)
		throw new NpError('INVALID', result.error.issues[0]?.message ?? 'Relis la saisie.');
	return result.data;
}

export function numeroPage(raw: string | null): number {
	const n = Number(raw);
	return Number.isSafeInteger(n) && n > 0 ? n : 1;
}
