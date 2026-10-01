import { listOaths, getOath } from '$lib/server/domain/oaths';
import { requireCapability } from '$lib/server/guards';
import { lire } from '../../univers/bestiaire/lecture';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async (event) => {
	const actor = requireCapability(event, 'oaths.manage');
	const rows = await listOaths(event.locals.db, actor);
	const oaths = await Promise.all(rows.map((row) => lire(getOath(event.locals.db, actor, row.id))));
	return { oaths };
};
