import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// 06-contrats §C nomme `/carnet/fiche/pdf` ; l'export vit sur `/carnet/fiche/imprimer` (page HTML
// imprimable, aucune bibliothèque PDF). L'ancienne adresse mène à la nouvelle.
export const GET: RequestHandler = () => redirect(308, '/carnet/fiche/imprimer');
