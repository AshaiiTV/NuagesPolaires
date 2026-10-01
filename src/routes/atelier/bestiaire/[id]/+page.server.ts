import { getBeast } from '$lib/server/domain/beasts';
import { listZones } from '$lib/server/domain/zones';
import { requireCapability } from '$lib/server/guards';
import { lire } from '../../../univers/bestiaire/lecture';
import { creer, modifier, dupliquer, masquer, archiver, zone } from '../serveur';
import type { PageServerLoad, Actions } from './$types';
export const load: PageServerLoad = async (event) => {
	const actor = requireCapability(event, 'beasts.manage');
	const [beast, zones] = await Promise.all([
		event.params.id === 'nouveau' ? null : lire(getBeast(event.locals.db, actor, event.params.id)),
		listZones(event.locals.db, actor)
	]);
	return { beast, zones };
};
export const actions: Actions = { creer, modifier, dupliquer, masquer, archiver, zone };
