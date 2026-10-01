// /table/archives — tous les récits (Tables repliées), recherche, 20 par page (03-vision §5.8,
// 06-contrats C). La lecture complète, les notes du MJ et les publications sont sur /table/archives/[id].
import { requireCapability } from '$lib/server/guards';
import { listRecits } from '$lib/server/domain/combats';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const actor = requireCapability(event, 'combat.run');
	const recherche = (event.url.searchParams.get('q') ?? '').trim().slice(0, 200);
	const page = Math.max(1, Number.parseInt(event.url.searchParams.get('page') ?? '1', 10) || 1);
	// Une ligne de plus que la page dit s'il existe une page suivante, sans compter les récits.
	const [lignes, suivante] = await Promise.all([
		listRecits(event.locals.db, actor, { page, search: recherche || undefined }),
		listRecits(event.locals.db, actor, { page: page + 1, search: recherche || undefined })
	]);
	return {
		recherche,
		page,
		suivante: suivante.length > 0,
		recits: lignes.map((r) => ({
			id: r.id,
			titre: r.title || r.name,
			nom: r.name,
			at: r.at,
			rounds: Math.max(1, r.round - 1),
			lisible: r.visibleToParticipants
		}))
	};
};
