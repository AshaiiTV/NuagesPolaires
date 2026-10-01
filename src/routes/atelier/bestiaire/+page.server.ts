import { listBeasts, getBeast } from '$lib/server/domain/beasts';
import { listZones } from '$lib/server/domain/zones';
import { listPendingObservations } from '$lib/server/domain/observations';
import { requireCapability } from '$lib/server/guards';
import { filtres, lire } from '../../univers/bestiaire/lecture';
import { valider, rejeter } from './serveur';
import type { PageServerLoad, Actions } from './$types';
export const load: PageServerLoad = async (event) => {
	const actor = requireCapability(event, 'beasts.manage');
	const filters = filtres(event.url);
	const [rows, zones, pending] = await Promise.all([
		listBeasts(event.locals.db, actor, filters),
		listZones(event.locals.db, actor),
		listPendingObservations(event.locals.db, actor)
	]);
	const beasts = await Promise.all(
		rows.map((row) => lire(getBeast(event.locals.db, actor, row.id)))
	);
	return { beasts, zones, pending, filters };
};
export const actions: Actions = { valider, rejeter };
