// La Table : cahier du MJ et de l'administrateur (03-vision §4, §5.8). Ce qui n'est pas autorisé
// n'est pas rendu : un compte sans le droit de conduire une Table reçoit une 404, jamais une page grisée.
import { requireCapability } from '$lib/server/guards';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	requireCapability(event, 'combat.run');
	return {};
};
