// Mise en page d'un texte de L'univers : prépare à l'affichage le HTML issu de `src/content`
// sans toucher aux sources. Retire ce que la page affiche déjà (titre, ligne décorative, résumé),
// sépare les numéros de chapitre de leur intitulé, habille les tableaux et dresse le sommaire.
import { typoHtml } from './typo';

export type Entree = { id: string; title: string; level: number; numero?: string };

const ENTITES: Record<string, string> = {
	'&#39;': "'",
	'&quot;': '"',
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>'
};

/** Texte lisible d'un fragment HTML. */
function lire(html: string): string {
	return html
		.replace(/<[^>]+>/g, '')
		.replace(/&#39;|&quot;|&amp;|&lt;|&gt;/g, (e) => ENTITES[e])
		.replace(/\s+/g, ' ')
		.trim();
}

/** Deux textes disent la même chose, à la casse, aux apostrophes et à la ponctuation finale près. */
function pareil(a: string, b: string): boolean {
	const net = (t: string) =>
		t
			.toLowerCase()
			.replace(/[’']/g, "'")
			.replace(/\xA0/g, ' ')
			.replace(/[\s.]+$/g, '')
			.trim();
	return net(a) === net(b);
}

// « I. Philosophie du Combat », « Partie II — Règlement Roleplay (RP) »
const CHAPITRE = /^(Partie\s+[IVXLC]+|[IVXLC]+)(?:\.\s+|\s+[—–-]\s+)([\s\S]+)$/;
// « I.1 — Respect mutuel », « II.3.b — Changement de Serment »
const SOUS_CHAPITRE = /^([IVXLC]+\.\d+(?:\.[a-z])?)\s+[—–-]\s+([\s\S]+)$/;
// « ⚔ DÉGÂTS TRANCHANT »
const SIGNE = /^(\p{Extended_Pictographic}️?)\s+([\s\S]+)$/u;

const TITRE = /<h([1-4]) id="([^"]*)">([\s\S]*?)<\/h\1>/g;

export function preparer(
	source: string,
	titre: string,
	resume: string
): { html: string; entrees: Entree[] } {
	let html = source;

	// 1. Le premier titre répète le titre de page ; ce qui le précède est une ligne décorative.
	const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>\s*/.exec(html);
	if (h1 && pareil(lire(h1[1]), titre)) {
		const avant = html.slice(0, h1.index);
		const decor = /^\s*(?:<p>(?:(?!<\/p>)[\s\S]){0,120}<\/p>\s*)*$/.test(avant);
		html = (decor ? '' : avant) + html.slice(h1.index + h1[0].length);
	}

	// 2. Le résumé est déjà écrit en marge : pas deux fois.
	const premier = /^\s*<p>([\s\S]*?)<\/p>\s*/.exec(html);
	if (premier && pareil(lire(premier[1]), resume)) html = html.slice(premier[0].length);

	// 3. Un filet de la source juste avant un chapitre ferait doublon avec le filet du chapitre.
	html = html.replace(/<hr\s*\/?>\s*(?=<h2\b)/g, '');

	html = typoHtml(html);

	// 4. Chapitres : numéro de la source s'il existe, sinon numérotation du carnet (01, 02…).
	const numerotes = [...html.matchAll(TITRE)].some((m) => m[1] === '2' && CHAPITRE.test(m[3]));
	const dernierH2 = html.lastIndexOf('<h2 ');
	const chute =
		dernierH2 >= 0 && /^<h2 [^>]*>[\s\S]*?<\/h2>\s*$/.test(html.slice(dernierH2)) ? dernierH2 : -1;
	const entrees: Entree[] = [];
	let rang = 0;
	html = html.replace(
		TITRE,
		(tout, niveau: string, id: string, contenu: string, position: number) => {
			const level = Number(niveau);
			if (level === 2) {
				// Un dernier titre sans texte dessous est la phrase de chute du récit, pas un chapitre.
				if (position === chute) {
					return `<h2 id="${id}" class="chute">${contenu}</h2>`;
				}
				const lu = CHAPITRE.exec(contenu);
				const numero = lu ? lu[1] : numerotes ? undefined : String(++rang).padStart(2, '0');
				const intitule = lu ? lu[2] : contenu;
				// En marge, « Partie II » se réduit à son chiffre : la colonne des numéros reste étroite.
				entrees.push({ id, level, numero: numero?.replace(/^\D+\s+/, ''), title: lire(intitule) });
				return (
					`<h2 id="${id}">` +
					(numero
						? `<span class="numero${/^[IVXLC]+$/.test(numero) ? ' romain' : ''}">${numero}</span> `
						: '') +
					`<span class="intitule">${intitule}</span></h2>`
				);
			}
			if (level === 3 || level === 4) {
				const lu = SOUS_CHAPITRE.exec(contenu);
				if (lu) {
					entrees.push({ id, level, numero: lu[1], title: lire(lu[2]) });
					return `<h${level} id="${id}"><span class="numero">${lu[1]}</span> <span class="intitule">${lu[2]}</span></h${level}>`;
				}
				const signe = SIGNE.exec(contenu);
				if (signe) {
					entrees.push({ id, level, title: lire(signe[2]) });
					return `<h${level} id="${id}" class="signee"><span class="signe" aria-hidden="true">${signe[1]}</span><span class="intitule">${signe[2]}</span></h${level}>`;
				}
			}
			entrees.push({ id, level, title: lire(contenu) });
			return tout;
		}
	);

	// 5. Tableaux : défilement interne, rubriques sur toute la largeur, en-tête vide retiré.
	html = html.replace(/<table>([\s\S]*?)<\/table>/g, (_tout, interieur: string) => {
		const ligne = /<tr>([\s\S]*?)<\/tr>/.exec(interieur);
		const colonnes = ligne ? (ligne[1].match(/<t[hd]\b/g) ?? []).length : 1;
		const corps = interieur
			.replace(/<thead>([\s\S]*?)<\/thead>/, (tete: string, cellules: string) =>
				lire(cellules) ? tete : ''
			)
			.replace(
				/<tr>\s*<td>((?:(?!<\/td>)[\s\S])+)<\/td>((?:\s*<td><\/td>)+)\s*<\/tr>/g,
				(_ligne: string, libelle: string) =>
					`<tr class="rubrique"><th colspan="${colonnes}">${libelle.replace(/<[^>]+>/g, '').trim()}</th></tr>`
			);
		return `<div class="tableau"><table style="--colonnes:${colonnes}">${corps}</table></div>`;
	});

	return { html, entrees };
}
