// Cahier Agenda : visible par tout compte connecté (03-vision §4). Un visiteur est renvoyé vers /entrer.
import { requireAccount } from '$lib/server/guards';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	requireAccount(event);
	return {};
};
