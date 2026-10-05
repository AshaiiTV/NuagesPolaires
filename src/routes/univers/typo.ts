// Français typographique à l'affichage : les sources restent telles que leur auteur les a écrites.
// Apostrophe courbe entre deux lettres, espace insécable devant « : ; ? ! % » et dans les guillemets,
// virgule décimale, signe de multiplication détaché du nombre, capitales à la française dans les titres.

const INSECABLE = '\xA0';

/** Règles communes au texte brut et aux nœuds de texte d'un HTML. */
function regles(texte: string): string {
	return (
		texte
			.replace(/ ([:;?!»])/g, INSECABLE + '$1')
			.replace(/« /g, '«' + INSECABLE)
			// « 66–100 % », « 25 % »
			.replace(/(\d)\s?%/g, '$1' + INSECABLE + '%')
			// « 9,5 », « × 2,5 » : un nombre décimal isolé s'écrit à la virgule.
			.replace(/(?<![\d.,])(\d+)\.(\d+)(?![\d.,]*\d)/g, '$1,$2')
			// « × 2 » : le signe se détache du nombre.
			.replace(/×\s?(?=\d)/g, '×' + INSECABLE)
	);
}

/** Texte brut (données des Serments, titres). */
export function typo(texte: string): string {
	return regles(texte.replace(/(?<=\p{L})'(?=\p{L})/gu, '’'));
}

/** HTML issu du Markdown : mêmes règles sur le texte seul, l'apostrophe y est une entité. */
export function typoHtml(html: string): string {
	return html.replace(/<[^>]*>|[^<]+/g, (morceau) =>
		morceau.startsWith('<')
			? morceau
			: regles(morceau.replace(/(?<=\p{L})(?:&#39;|')(?=\p{L})/gu, '’'))
	);
}

// Mots qui gardent leur capitale à l'intérieur d'un titre : noms propres et termes du monde.
const PROPRES = new Set([
	'Serment',
	'Serments',
	'Sang',
	'Discord',
	'Nuages',
	'Polaires',
	'Netlify'
]);

/**
 * Capitales à la française : seul le premier mot d'un titre porte la capitale
 * (« Philosophie du combat »). Sigles (HRP, J1) et noms propres restent tels quels ;
 * un titre tout en capitales (« DÉGÂTS TRANCHANT ») revient en minuscules.
 */
export function titreFr(titre: string): string {
	// Balises et entités d'un titre en HTML passent telles quelles.
	const HORS_TEXTE = /<[^>]*>|&[#\w]+;/g;
	const lettres = titre.replace(HORS_TEXTE, '').replace(/[^\p{L}]/gu, '');
	const crie = lettres.length > 3 && lettres === lettres.toUpperCase();
	let premier = true;
	return titre.replace(/<[^>]*>|&[#\w]+;|[\p{L}\p{N}]+/gu, (mot) => {
		if (mot.startsWith('<') || mot.startsWith('&')) return mot;
		const tete = premier;
		premier = false;
		if (crie) {
			const bas = mot.toLowerCase();
			return tete ? bas[0].toUpperCase() + bas.slice(1) : bas;
		}
		if (tete || PROPRES.has(mot) || /\p{N}/u.test(mot)) return mot;
		if (mot.length > 1 && mot === mot.toUpperCase()) return mot;
		return mot[0].toLowerCase() + mot.slice(1);
	});
}

/**
 * Titre de page : il se termine par un point (la voix du carnet : « Dernières pages. ») et son
 * dernier mot passe en italique (« Les premiers *pas.* »). Un titre d'un seul mot reste entier.
 */
export function titreEnVoix(titre: string): { debut: string; voix?: string } {
	let propre = typo(titre.trim());
	if (!/[.?!…]$/.test(propre)) propre += '.';
	const coupe = propre.lastIndexOf(' ');
	if (coupe < 0) return { debut: propre };
	return { debut: propre.slice(0, coupe), voix: propre.slice(coupe + 1) };
}
