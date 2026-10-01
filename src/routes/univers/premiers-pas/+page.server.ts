import { chargerLecture } from '../charger';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => chargerLecture('premiers-pas');
