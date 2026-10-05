// Chargement d'une page de lecture de L'univers (côté serveur) : le texte de `src/content`,
// mis en page par `preparer`, son titre de page et ses voisines.
import { getContent, renderMarkdown } from '$lib/content';
import { GEM_META } from '$lib/schemas/characters';
import { MEANING_COLORS } from '$lib/game/colors';
import { preparer } from './lecture';
import { voisines } from './pages';

// Couleurs de sens des trois gemmes (03-vision §7) : un losange devant leur nom.
const TEINTES = Object.fromEntries([
	...Object.values(GEM_META).map((gemme) => [`gemme ${gemme.label}`.toLowerCase(), gemme.color]),
	...Object.entries(MEANING_COLORS.behavior).map(([nom, couleur]) => [nom.toLowerCase(), couleur])
]);

/**
 * @param titreDuCahier le titre de page reprend celui de l'index et du pied « Tourner »
 *   (« Le système de jeu ») plutôt que celui de la source (« Système de Combat »).
 */
export function chargerLecture(slug: string, { titreDuCahier = false } = {}) {
	const content = getContent(slug);
	const { page, previous, next } = voisines(slug);
	return {
		slug: content.slug,
		titre: titreDuCahier && page ? page.title : content.title,
		resume: content.resume,
		lecture: preparer(renderMarkdown(content.body), content.title, content.resume, TEINTES),
		previous,
		next
	};
}
