import { requireCharacter } from '$lib/server/guards';
import { sheetForExport } from '$lib/server/domain/characters';
import type { PageServerLoad } from './$types';

// Export de la fiche (03-vision §5.4 « Exporter cette fiche (PDF) » ; 06-contrats §B.2 `sheetForExport`) :
// une page HTML imprimable aux couleurs de Mystique polaire ; le navigateur l'enregistre en PDF.
export const load: PageServerLoad = async (event) => {
	const { actor } = requireCharacter(event);
	const vue = await sheetForExport(event.locals.db, actor);
	return { vue };
};
