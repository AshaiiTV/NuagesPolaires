import { chargerLecture } from '../charger';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => chargerLecture('systeme-de-jeu', { titreDuCahier: true });
