import { error } from '@sveltejs/kit';
import { requireCharacter } from '$lib/server/guards';
import { getRecit, recitAsText } from '$lib/server/domain/combats';
import { isNpError } from '$lib/server/http';
import type { RequestHandler } from './$types';

// « Exporter (.txt) » d'un récit : le texte filtré par le serveur (notes du MJ jamais servies).

function nomDeFichier(titre: string): string {
	const base = titre
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);
	return `recit-${base || 'combat'}.txt`;
}

export const GET: RequestHandler = async (event) => {
	const { actor } = requireCharacter(event);
	try {
		const recit = await getRecit(event.locals.db, actor, event.params.id);
		const texte = await recitAsText(event.locals.db, actor, event.params.id);
		return new Response(texte, {
			headers: {
				'content-type': 'text/plain; charset=utf-8',
				'content-disposition': `attachment; filename="${nomDeFichier(recit.title)}"`,
				'cache-control': 'private, no-store'
			}
		});
	} catch (e) {
		if (isNpError(e) && e.status >= 400 && e.status < 500)
			error(404, { message: 'Ce récit n’est pas dans ton carnet.', code: 'NOT_FOUND' });
		throw e;
	}
};
