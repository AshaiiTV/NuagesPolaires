// Registre › Journal d'audit › « Exporter (.txt) » : le journal filtré (acteur · action · dates) en
// texte tabulé, téléchargé. Administrateur seulement (404 sinon, comme la page) ; jamais mis en cache.
import { error } from '@sveltejs/kit';
import { requireCapability } from '$lib/server/guards';
import { auditAsText } from '$lib/server/domain/audit';
import { isNpError } from '$lib/server/http';
import type { RequestHandler } from './$types';

const JOUR = /^\d{4}-\d{2}-\d{2}$/;

export const GET: RequestHandler = async (event) => {
	const actor = requireCapability(event, 'admin.audit');
	const params = event.url.searchParams;
	const jour = (k: string) =>
		JOUR.test(params.get(k) ?? '') ? (params.get(k) as string) : undefined;
	let texte: string;
	try {
		texte = await auditAsText(event.locals.db, actor, {
			actor: (params.get('acteur') ?? '').trim().slice(0, 64) || undefined,
			action: (params.get('action') ?? '').trim().slice(0, 64) || undefined,
			from: jour('du'),
			to: jour('au')
		});
	} catch (e) {
		if (isNpError(e)) error(e.status, { message: e.message, code: e.code });
		throw e;
	}
	const date = new Date().toISOString().slice(0, 10);
	return new Response(texte, {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'content-disposition': `attachment; filename="journal-audit-${date}.txt"`,
			'cache-control': 'no-store'
		}
	});
};
