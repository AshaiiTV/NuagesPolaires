import { describe, expect, it } from 'vitest';
import { error, isActionFailure, redirect, type RequestEvent } from '@sveltejs/kit';
import { NpError } from '$lib/server/http';
import {
	action,
	actionGuard,
	formDataToObject,
	formValues,
	safeValues,
	toRevision
} from './actions';

function post(fields: [string, string][]): RequestEvent {
	const body = new FormData();
	for (const [k, v] of fields) body.append(k, v);
	return {
		request: new Request('https://np.test/x', { method: 'POST', body })
	} as unknown as RequestEvent;
}

describe('form actions (06-contrats §A)', () => {
	it('lit le FormData : clés répétées en tableau, expectedRevision en nombre', async () => {
		const data = await formValues(
			post([
				['texte', 'bonjour'],
				['ids', 'a'],
				['ids', 'b'],
				['expectedRevision', '7']
			])
		);
		expect(data).toEqual({ texte: 'bonjour', ids: ['a', 'b'], expectedRevision: 7 });
		expect(toRevision('')).toBeUndefined();
		expect(toRevision(' 3 ')).toBe(3);
		expect(toRevision('abc')).toBe('abc');
		const empty = new FormData();
		empty.append('expectedRevision', '');
		expect(formDataToObject(empty)).toEqual({ expectedRevision: undefined });
	});

	it('NpError ⇒ fail(status, { code, message, values }) sans secret', async () => {
		const run = action(async () => {
			throw new NpError('VERSION_CONFLICT', 'Conflit.', 409);
		});
		const result: unknown = await run(
			post([
				['texte', 'gardé'],
				['password', 'secret'],
				['next', 'x'],
				['expectedRevision', '2']
			])
		);
		expect(isActionFailure(result)).toBe(true);
		expect(result).toMatchObject({
			status: 409,
			data: {
				code: 'VERSION_CONFLICT',
				message: 'Conflit.',
				values: { texte: 'gardé', expectedRevision: '2' }
			}
		});
	});

	it('laisse passer redirect et error de SvelteKit, et les erreurs inattendues', async () => {
		await expect(action(() => redirect(303, '/ailleurs'))(post([]))).rejects.toMatchObject({
			status: 303,
			location: '/ailleurs'
		});
		await expect(action(() => error(404, 'absent'))(post([]))).rejects.toMatchObject({
			status: 404
		});
		await expect(action(() => Promise.reject(new Error('panne')))(post([]))).rejects.toThrow(
			'panne'
		);
	});

	it('transmet les données au handler et renvoie son résultat', async () => {
		const run = actionGuard(async (_event, data) => ({ ok: data.texte }));
		expect(await run(post([['texte', 'noté']]))).toEqual({ ok: 'noté' });
		expect(safeValues({ a: 'x', motDePasse: 'y', n: 1 })).toEqual({ a: 'x', n: '1' });
	});
});
