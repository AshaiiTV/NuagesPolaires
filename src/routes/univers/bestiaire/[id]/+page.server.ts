import { action } from '$lib/server/actions';
import { requireAccount } from '$lib/server/guards';
import { can } from '$lib/server/permissions';
import { getBeast } from '$lib/server/domain/beasts';
import { proposeObservation } from '$lib/server/domain/observations';
import { getRecit } from '$lib/server/domain/combats';
import { isNpError } from '$lib/server/http';
import { lire } from '../lecture';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const beast = await lire(getBeast(locals.db, locals.actor, params.id));
	const recits: string[] = [];
	if (locals.actor) {
		await Promise.all(
			[...new Set(beast.observations.flatMap((o) => (o.combatId ? [o.combatId] : [])))].map(
				async (id) => {
					try {
						await getRecit(locals.db, locals.actor, id);
						recits.push(id);
					} catch (cause) {
						if (!isNpError(cause) || ![403, 404].includes(cause.status)) throw cause;
					}
				}
			)
		);
	}
	return {
		beast,
		recits,
		connected: !!locals.actor,
		canEdit: can(locals.actor?.role, 'beasts.manage'),
		canTable: can(locals.actor?.role, 'combat.run'),
		calque: url.searchParams.get('calque') === '1'
	};
};
export const actions: Actions = {
	proposer: action(async (event, data) => {
		const actor = requireAccount(event);
		await proposeObservation(event.locals.db, actor, {
			beastId: event.params.id,
			text: String(data.text ?? '')
		});
		return { observationProposee: true };
	})
};
