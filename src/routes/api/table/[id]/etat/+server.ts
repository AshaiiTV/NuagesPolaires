import { json } from '@sveltejs/kit';
import { requireActor } from '$lib/server/permissions';
import { toErrorPayload } from '$lib/server/http';
import { getPlayerTable } from '$lib/server/domain/combats';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params, request }) => {
	const headers = { 'Cache-Control': 'private, no-store' };
	try {
		// Le hook garantit la session et renseigne l'acteur (06 A et C).
		const actor = requireActor(locals.session?.scope === 'full' ? locals.actor : null);
		const table = await getPlayerTable(locals.db, actor, params.id);
		const etag = `"${table.revision}"`;
		if (request.headers.get('If-None-Match') === etag)
			return new Response(null, { status: 304, headers: { ...headers, ETag: etag } });
		return json(table, { headers: { ...headers, ETag: etag } });
	} catch (error) {
		const payload = toErrorPayload(error);
		return json(
			{ code: payload.code, message: payload.message },
			{ status: payload.status, headers }
		);
	}
};
