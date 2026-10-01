// /agenda/organiser : la liste des rendez-vous (masqués compris) et le formulaire d'un nouveau rendez-vous.
import { actionsOrganiser, lireOrganiser } from './serveur';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => lireOrganiser(event);

export const actions: Actions = actionsOrganiser;
