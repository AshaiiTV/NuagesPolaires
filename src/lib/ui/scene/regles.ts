// Lecture des règles pour le régime scène : la règle sous le pouce et la ligne de déclaration lisent
// la même source (`src/lib/game/rules.ts`, 03-vision §12.1). Ce module ne fait que présenter :
// libellés sans pictogrammes, coûts imprimés, ancres de la page Système de jeu.
import type { ActionRule } from '$lib/game/rules';

/**
 * Libellé hérité sans pictogramme ni marque de dégâts : « ⚔ Frappe (N) » → « Frappe »,
 * « 🛡 Bloquer −50% » → « Bloquer −50 % ». Le carnet n'affiche aucun émoji (03-vision §8).
 */
export function libelleSansPicto(label: string): string {
	return label
		.replace(/[^\p{L}\p{N}\s'’()−%+<>-]/gu, '')
		.replace(/\(N(?: PV)?\)/g, '')
		.replace(/(\d)%/g, '$1 %')
		.replace(/\s+/g, ' ')
		.trim();
}

/** « 8 EP », « 6 EM », « — » n'existe pas : sans coût fixe, rien. */
export function coutImprime(rule: Pick<ActionRule, 'cost' | 'resource'>): string {
	if (rule.cost === null || rule.resource === null) return 'coût du palier';
	return `${rule.cost} ${rule.resource.toUpperCase()}`;
}

/**
 * Ancres de `rules.ts` → sections réelles de /univers/systeme (titres numérotés de la page publique).
 * Table de correspondance, pas un calcul ; une ancre inconnue mène au haut de la page.
 */
const ANCRES: Record<string, string> = {
	'/univers/systeme#actions': '/univers/systeme#v-actions-de-combat-couts-en-energie',
	'/univers/systeme#recuperation': '/univers/systeme#iii-recuperation',
	'/univers/systeme#statistiques': '/univers/systeme#ii-statistiques',
	'/univers/systeme#statuts': '/univers/systeme#iv-structure-d-un-combat'
};
export function ancreSysteme(anchor: string): string {
	return ANCRES[anchor] ?? (anchor.startsWith('/univers/systeme') ? anchor : '/univers/systeme');
}
