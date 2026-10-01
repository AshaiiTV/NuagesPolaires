import { listBeasts } from '$lib/server/domain/beasts';
import { listZones } from '$lib/server/domain/zones';
import { filtres, lire } from './lecture';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const filters = filtres(url);
	const [beasts, zones] = await Promise.all([
		lire(listBeasts(locals.db, locals.actor, filters)),
		lire(listZones(locals.db, locals.actor))
	]);
	return { beasts, zones, filters };
};
