import { error, redirect } from '@sveltejs/kit';
import { requireCharacter } from '$lib/server/guards';
import { getRecit } from '$lib/server/domain/combats';
import { listConsequences } from '$lib/server/domain/characters';
import { isNpError } from '$lib/server/http';
import type { ConsequenceView } from '$lib/schemas/characters';
import type { PageServerLoad } from './$types';

// Un récit : le combat archivé où ton personnage figure (03-vision §5.5, §9.9 ; 06-contrats §B.6).
// Le serveur filtre le journal du combat (notes du MJ jamais servies). `?format=txt` mène à l'export.

/** Les conséquences tamponnées de ce combat sur ta fiche (pages « Combats » et « XP », au plus 3 de chaque). */
async function consequencesDuCombat(
	event: Parameters<PageServerLoad>[0],
	combatId: string
): Promise<ConsequenceView[]> {
	const { actor } = requireCharacter(event);
	const vues: ConsequenceView[] = [];
	for (let page = 1; ; page++) {
		const lot = await listConsequences(event.locals.db, actor, { combatId, page });
		vues.push(...lot.rows);
		if (page >= lot.pages) break;
	}
	return vues.sort((a, b) => a.at.localeCompare(b.at));
}

export const load: PageServerLoad = async (event) => {
	const { actor } = requireCharacter(event);
	const id = event.params.id;
	if (event.url.searchParams.get('format') === 'txt')
		redirect(303, `/carnet/recits/${encodeURIComponent(id)}/texte`);

	try {
		const recit = await getRecit(event.locals.db, actor, id);
		const consequences = await consequencesDuCombat(event, recit.id);
		return { recit, consequences };
	} catch (e) {
		if (isNpError(e) && e.status >= 400 && e.status < 500)
			error(404, { message: 'Ce récit n’est pas dans ton carnet.', code: 'NOT_FOUND' });
		throw e;
	}
};
