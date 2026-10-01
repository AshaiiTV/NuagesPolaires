// Français typographique à l'affichage : les sources restent telles que leur auteur les a écrites.
// Apostrophe courbe entre deux lettres, espace insécable devant « : ; ? ! » et dans les guillemets.

const INSECABLE = '\xA0';

/** Texte brut (données des Serments, titres). */
export function typo(texte: string): string {
	return texte
		.replace(/(?<=\p{L})'(?=\p{L})/gu, '’')
		.replace(/ ([:;?!»])/g, INSECABLE + '$1')
		.replace(/« /g, '«' + INSECABLE);
}

/** HTML issu du Markdown : mêmes règles, l'apostrophe y est une entité. */
export function typoHtml(html: string): string {
	return html
		.replace(/(?<=\p{L})(?:&#39;|')(?=\p{L})/gu, '’')
		.replace(/ ([:;?!»])/g, INSECABLE + '$1')
		.replace(/« /g, '«' + INSECABLE);
}

/**
 * Coupe un titre avant son dernier mot : la voix du carnet le met en italique
 * (« Les premiers *pas.* »). Un titre d'un seul mot reste entier.
 */
export function titreEnVoix(titre: string): { debut: string; voix?: string } {
	const propre = typo(titre.trim());
	const coupe = propre.lastIndexOf(' ');
	if (coupe < 0) return { debut: propre };
	return { debut: propre.slice(0, coupe), voix: propre.slice(coupe + 1) };
}
