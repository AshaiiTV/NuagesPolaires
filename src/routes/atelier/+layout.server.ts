import { requireCapability } from '$lib/server/guards';
import { can } from '$lib/server/permissions';
import type { LayoutServerLoad } from './$types';
export const load: LayoutServerLoad = (event) => {
	const actor = requireCapability(
		event,
		event.url.pathname.startsWith('/atelier/serments') ? 'oaths.manage' : 'beasts.manage'
	);
	return { atelierSerments: can(actor.role, 'oaths.manage') };
};
