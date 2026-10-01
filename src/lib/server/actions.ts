// Assistant des form actions (06-contrats §A « Routes ») :
//   export const actions = { noter: action(async (event, data) => …) };
// `action()` lit le FormData en objet, convertit `expectedRevision` en nombre, appelle le handler,
// traduit une NpError en `fail(status, { code, message, values })` et laisse passer `redirect` / `error`
// de SvelteKit. Les valeurs renvoyées pour regarnir le formulaire ne contiennent jamais de secret.
import { fail, isHttpError, isRedirect, type ActionFailure, type RequestEvent } from '@sveltejs/kit';
import { isNpError } from '$lib/server/http';

export type FormValue = string | string[] | number | File | File[] | undefined;
export type FormValues = Record<string, FormValue>;

export interface ActionFailureData {
	code: string;
	message: string;
	/** Saisie à regarnir (sans mot de passe ni secret). */
	values?: Record<string, string | string[]>;
}

/** Champs jamais renvoyés au formulaire. */
const SECRET_FIELD = /pass|mot.?de.?passe|secret|token|jeton|^current$|^next$/i;

/** `expectedRevision` du formulaire : vide ⇒ absent (428 côté domaine), entier ⇒ nombre, sinon tel quel (400). */
export function toRevision(value: FormValue): FormValue {
	if (value === undefined) return undefined;
	if (typeof value !== 'string') return value;
	const trimmed = value.trim();
	if (trimmed === '') return undefined;
	return /^\d{1,9}$/.test(trimmed) ? Number(trimmed) : trimmed;
}

/** Convertit un FormData en objet : clés répétées ⇒ tableau ; `expectedRevision` ⇒ nombre. */
export function formDataToObject(form: FormData): FormValues {
	const out: FormValues = {};
	for (const [key, raw] of form.entries()) {
		const value = raw as string | File;
		const previous = out[key];
		if (previous === undefined) out[key] = value;
		else if (Array.isArray(previous)) (previous as (string | File)[]).push(value);
		else out[key] = [previous as string | File, value] as string[] | File[];
	}
	if ('expectedRevision' in out) out.expectedRevision = toRevision(out.expectedRevision);
	return out;
}

/** Lit le formulaire de la requête (06 §A `formValues(event)`). */
export async function formValues(event: Pick<RequestEvent, 'request'>): Promise<FormValues> {
	try {
		return formDataToObject(await event.request.formData());
	} catch {
		return {};
	}
}

/** Valeurs regarnissables : textes seulement, sans les champs secrets. */
export function safeValues(values: FormValues): Record<string, string | string[]> {
	const out: Record<string, string | string[]> = {};
	for (const [key, value] of Object.entries(values)) {
		if (SECRET_FIELD.test(key)) continue;
		if (typeof value === 'string') out[key] = value;
		else if (typeof value === 'number') out[key] = String(value);
		else if (Array.isArray(value) && value.every((v) => typeof v === 'string')) out[key] = value as string[];
	}
	return out;
}

export type ActionHandler<E extends RequestEvent, R> = (event: E, data: FormValues) => Promise<R> | R;

/**
 * Enveloppe une form action : `NpError` ⇒ `fail(status, { code, message, values })` ; `redirect` et
 * `error` de SvelteKit passent ; toute autre erreur remonte (500 générique de SvelteKit).
 */
export function action<E extends RequestEvent, R>(handler: ActionHandler<E, R>) {
	return async (event: E): Promise<R | ActionFailure<ActionFailureData>> => {
		const data = await formValues(event);
		try {
			return await handler(event, data);
		} catch (e) {
			if (isRedirect(e) || isHttpError(e)) throw e;
			if (isNpError(e)) return fail(e.status, { code: e.code, message: e.message, values: safeValues(data) });
			throw e;
		}
	};
}

/** Alias du contrat (06 §A mentionne « l'assistant `actionGuard` »). */
export const actionGuard = action;
