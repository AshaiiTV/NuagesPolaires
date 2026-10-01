import { requireAccount } from '$lib/server/guards';
import type { LayoutServerLoad } from './$types';

// Mon carnet : un compte connecté seulement (03-vision §4). Un compte en attente de liaison garde
// l'accès à Dernières pages (état réduit) ; les pages qui demandent une fiche posent leur propre garde.
export const load: LayoutServerLoad = async (event) => {
	requireAccount(event);
	return {};
};
