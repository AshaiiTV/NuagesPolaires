// /agenda/organiser/[id] : un rendez-vous ouvert pour être modifié, masqué, annoncé ou rayé.
import { actionsOrganiser, lireOrganiser, trouverRendezVous } from '../serveur';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const donnees = await lireOrganiser(event);
	const evenement = await trouverRendezVous(event, donnees, event.params.id);
	return { ...donnees, evenement };
};

export const actions: Actions = actionsOrganiser;
