// Le Registre : cahier de l'administrateur (03-vision §4, §5.11). Ce qui n'est pas autorisé n'est pas
// rendu : un compte sans le droit reçoit une 404, jamais une page grisée.
import { requireCapability } from '$lib/server/guards';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	requireCapability(event, 'admin.accounts');
	return {};
};
