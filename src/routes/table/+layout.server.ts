// La Table : cahier du MJ et de l'administrateur (03-vision §4, §5.8). Ce qui n'est pas autorisé
// n'est pas rendu : un compte sans le droit de conduire une Table reçoit une 404, jamais une page grisée.
import { requireCapability } from '$lib/server/guards';
import { redirect } from '@sveltejs/kit';
import { can } from '$lib/server/permissions';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	if (
		event.locals.actor &&
		!can(event.locals.actor.role, 'combat.run') &&
		event.params.id &&
		event.url.pathname.startsWith('/table/combat/')
	) {
		redirect(303, `/carnet/table/${encodeURIComponent(event.params.id)}`);
	}
	requireCapability(event, 'combat.run');
	return {};
};
