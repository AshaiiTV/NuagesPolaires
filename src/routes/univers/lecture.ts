// Mise en page d'un texte de L'univers : prépare à l'affichage le HTML issu de `src/content`
// sans toucher aux sources. Retire ce que la page affiche déjà (titre, ligne décorative, résumé),
// sépare les numéros de chapitre de leur intitulé, remplace les pictogrammes par des losanges,
// répare et habille les tableaux, dresse le sommaire.
import { titreFr, typoHtml } from './typo';

export type Entree = { id: string; title: string; level: number; numero?: string };
export type Lecture = {
	html: string;
	entrees: Entree[];
	/** Le résumé ouvre déjà le texte (en gras) : la marge ne le répète pas. */
	resumeDansCorps: boolean;
};

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

/** Texte posé dans un attribut HTML. */
function attribut(texte: string): string {
	return texte.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
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
// Pictogramme de la source (⚔, 🔥, 💎…) : le carnet n'en imprime aucun (03-vision §8).
// Les signes typographiques (©, ™, flèches) n'en sont pas.
const PICTO = String.raw`(?![©®™↔-↪])\p{Extended_Pictographic}️?`;
// « ⚔ DÉGÂTS TRANCHANT »
const SIGNE = new RegExp(`^${PICTO}\\s+([\\s\\S]+)$`, 'u');
const LOSANGE = '<span class="signe" aria-hidden="true"></span>';

const TITRE = /<h([1-4]) id="([^"]*)">([\s\S]*?)<\/h\1>/g;

/**
 * @param teintes couleur de sens d'un libellé (« Gemme Blanche » → sa teinte) : le pictogramme
 *   qui le précède dans un tableau devient un losange de cette couleur.
 */
export function preparer(
	source: string,
	titre: string,
	resume: string,
	teintes: Record<string, string> = {}
): Lecture {
	let html = source;

	// 1. Le premier titre répète le titre de page ; ce qui le précède est une ligne décorative.
	const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>\s*/.exec(html);
	if (h1 && pareil(lire(h1[1]), titre)) {
		const avant = html.slice(0, h1.index);
		const decor = /^\s*(?:<p>(?:(?!<\/p>)[\s\S]){0,120}<\/p>\s*)*$/.test(avant);
		html = (decor ? '' : avant) + html.slice(h1.index + h1[0].length);
	}

	// 2. Le résumé est déjà écrit en marge : pas deux fois. S'il ouvre le texte en gras
	//    (après une éventuelle épigraphe), c'est la marge qui s'efface.
	const premier = /^\s*<p>([\s\S]*?)<\/p>\s*/.exec(html);
	if (premier && pareil(lire(premier[1]), resume)) html = html.slice(premier[0].length);
	const attaque = /^\s*(?:<blockquote>[\s\S]*?<\/blockquote>\s*)?<p><strong>([\s\S]*?)<\/strong>/.exec(
		html
	);
	const resumeDansCorps = !!attaque && pareil(lire(attaque[1]), resume);

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
				const intitule = titreFr(lu ? lu[2] : contenu);
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
					const intitule = titreFr(lu[2]);
					entrees.push({ id, level, numero: lu[1], title: lire(intitule) });
					return `<h${level} id="${id}"><span class="numero">${lu[1]}</span> <span class="intitule">${intitule}</span></h${level}>`;
				}
				const signe = SIGNE.exec(contenu);
				if (signe) {
					const intitule = titreFr(signe[1]);
					entrees.push({ id, level, title: lire(intitule) });
					return `<h${level} id="${id}" class="signee">${LOSANGE}<span class="intitule">${intitule}</span></h${level}>`;
				}
				const intitule = titreFr(contenu);
				entrees.push({ id, level, title: lire(intitule) });
				return `<h${level} id="${id}">${intitule}</h${level}>`;
			}
			entrees.push({ id, level, title: lire(contenu) });
			return tout;
		}
	);

	// 5. Pictogrammes. « ⚠ » en tête de paragraphe : un avis, filet rouille en marge, un par ligne.
	const avis = (_tout: string, texte: string) =>
		texte
			.split(/\n\s*⚠️?\s*/)
			.map((ligne) => `<p class="avis">${ligne.trim()}</p>`)
			.join('\n');
	html = html
		.replace(/<p><em>\s*⚠️?\s*((?:(?!<\/p>)[\s\S])*?)<\/em><\/p>/g, avis)
		.replace(/<p>\s*⚠️?\s*((?:(?!<\/p>)[\s\S])*?)<\/p>/g, avis);
	//    En tête de cellule : le losange de 4 px, à la teinte de son libellé s'il en a une.
	html = html.replace(
		new RegExp(`(<td>(?:<strong>)?)\\s*${PICTO}\\s*([^<]*)`, 'gu'),
		(_tout, ouvre: string, libelle: string) => {
			const teinte = teintes[lire(libelle).toLowerCase()];
			const losange = teinte
				? LOSANGE.replace('<span ', `<span style="--teinte:${attribut(teinte)}" `)
				: LOSANGE;
			return ouvre + losange + libelle;
		}
	);
	//    Partout ailleurs : retiré.
	html = html.replace(/<[^>]*>|[^<]+/g, (morceau) =>
		morceau.startsWith('<') ? morceau : morceau.replace(new RegExp(`${PICTO}[ \\xA0]*`, 'gu'), '')
	);

	// 6. Tableau mal formé dans la source : un en-tête sans lignes, suivi d'une liste dont chaque
	//    entrée porte ses cellules (« **X** — a | b »). La liste redevient le corps du tableau.
	html = html.replace(
		/<table>\s*(<thead>(?:(?!<\/thead>)[\s\S])*<\/thead>)\s*<\/table>\s*<ul>((?:(?!<\/ul>)[\s\S])*)<\/ul>/g,
		(tout, tete: string, liste: string) => {
			const entreesListe = [...liste.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1]);
			if (!entreesListe.length || !entreesListe.every((entree) => entree.includes('|'))) return tout;
			const colonnes = (tete.match(/<th\b/g) ?? []).length;
			const lignes = entreesListe.map((entree) => {
				const lu = /^\s*(<strong>[\s\S]*?<\/strong>)\s*[—–-]\s*([\s\S]*)$/.exec(entree);
				const cellules = (lu ? [lu[1], ...lu[2].split('|')] : entree.split('|')).map((c) =>
					c.trim()
				);
				// Une barre de trop reste du texte dans la dernière cellule.
				const rangees = [
					...cellules.slice(0, colonnes - 1),
					cellules.slice(colonnes - 1).join(' | ')
				];
				return `<tr>\n${rangees.map((c) => `<td>${c}</td>`).join('\n')}\n</tr>`;
			});
			return `<table>\n${tete}\n<tbody>${lignes.join('\n')}\n</tbody></table>`;
		}
	);

	// 7. Tableaux : rubriques sur toute la largeur, en-tête vide retiré, libellé de colonne sur
	//    chaque cellule. Sur téléphone, quatre colonnes et plus s'empilent en lignes de carnet.
	html = html.replace(/<table>([\s\S]*?)<\/table>/g, (_tout, interieur: string) => {
		const tete = /<thead>([\s\S]*?)<\/thead>/.exec(interieur);
		const libelles = tete
			? [...tete[1].matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map((m) => lire(m[1]))
			: [];
		const ligne = /<tr>([\s\S]*?)<\/tr>/.exec(interieur);
		const colonnes = ligne ? (ligne[1].match(/<t[hd]\b/g) ?? []).length : 1;
		const pile = colonnes >= 5 ? 'liste' : colonnes === 4 ? 'fiche' : '';
		let premiere = 0;
		const corps = interieur
			.replace(/<thead>([\s\S]*?)<\/thead>/, (bloc: string, cellules: string) =>
				lire(cellules) ? bloc : ''
			)
			.replace(
				/<tr>\s*<td>((?:(?!<\/td>)[\s\S])+)<\/td>((?:\s*<td><\/td>)+)\s*<\/tr>/g,
				(_ligne: string, libelle: string) =>
					`<tr class="rubrique"><th colspan="${colonnes}">${titreFr(libelle.replace(/<[^>]+>/g, '').trim())}</th></tr>`
			)
			.replace(/<tr>([\s\S]*?)<\/tr>/g, (rangee: string, cellules: string) => {
				let rangCellule = 0;
				return rangee.replace(/<td>([\s\S]*?)<\/td>/g, (_cellule, contenu: string) => {
					const libelle = libelles[rangCellule] ?? '';
					const texte = lire(contenu);
					if (rangCellule === 0) premiere = Math.max(premiere, texte.length);
					// En liste, une cellule trop longue pour une demi-largeur prend toute la ligne.
					const long = pile === 'liste' && libelle.length + texte.length > 17;
					rangCellule++;
					return (
						`<td${libelle ? ` data-label="${attribut(libelle)}"` : ''}` +
						`${long ? ' class="long"' : ''}>${contenu}</td>`
					);
				});
			});
		// Première colonne courte : elle garde sa largeur naturelle, les tableaux frères partagent un axe.
		const axe = premiere > 0 && premiere <= 30 ? ' axe' : '';
		const cadre = `<div class="tableau${axe}" data-colonnes="${colonnes}"`;
		if (!pile) return `${cadre}><table>${corps}</table></div>`;
		// Empilé, le tableau ne s'affiche plus comme un tableau : ses rôles restent écrits.
		const roles = corps
			.replace(/<(thead|tbody)>/g, '<$1 role="rowgroup">')
			.replace(/<tr/g, '<tr role="row"')
			.replace(/<th/g, '<th role="columnheader"')
			.replace(/<td/g, '<td role="cell"');
		return `${cadre} data-pile="${pile}"><table role="table">${roles}</table></div>`;
	});

	return { html, entrees, resumeDansCorps };
}
