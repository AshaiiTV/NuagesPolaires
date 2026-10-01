import { getOath, listOaths } from '$lib/server/domain/oaths';
import { requireCapability } from '$lib/server/guards';
import { lire } from '../../../univers/bestiaire/lecture';
import { modifier, masquer, creer } from '../serveur';
import type { PageServerLoad, Actions } from './$types';
export const load: PageServerLoad = async (event) => {
	const actor = requireCapability(event, 'oaths.manage');
	const [oath, oaths] = await Promise.all([
		event.params.id === 'nouveau' ? null : lire(getOath(event.locals.db, actor, event.params.id)),
		listOaths(event.locals.db, actor)
	]);
	return { oath, oaths };
};
export const actions: Actions = { modifier, masquer, creer };
