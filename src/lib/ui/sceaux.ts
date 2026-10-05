// Sceaux des Serments : un dessin au trait par Serment natif, dans une grammaire commune
// (carré de 48, trait seul, jamais d'aplat). Ils remplacent les émojis d'arme de l'ancien site.
// Un Serment créé par un administrateur reçoit l'étoile du carnet.

/** Étoile à quatre branches : le sceau d'un Serment sans dessin propre. */
const ETOILE = 'M24 9 L26.6 21.4 L39 24 L26.6 26.6 L24 39 L21.4 26.6 L9 24 L21.4 21.4 Z';

const ROND = (cx: number, cy: number, r: number) =>
	`M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`;

const ETINCELLE = (cx: number, cy: number, r: number) => {
	const c = r * 0.3;
	return `M${cx} ${cy - r} L${cx + c} ${cy - c} L${cx + r} ${cy} L${cx + c} ${cy + c} L${cx} ${cy + r} L${cx - c} ${cy + c} L${cx - r} ${cy} L${cx - c} ${cy - c} Z`;
};

const SCEAUX: Readonly<Record<string, string>> = {
	// Épée moyenne, pointe haute, pommeau en losange.
	duelliste:
		'M24 8 L26 12.5 V30 H22 V12.5 Z M17 30 H31 M24 30 V36.5 M24 36.5 l2.2 2.2 -2.2 2.2 -2.2 -2.2 Z',
	// Deux lames légères croisées.
	bretteur: `M14 37 L33 11 M34 37 L15 11 M16.2 27.4 L21.8 31.6 M31.8 27.4 L26.2 31.6 ${ROND(14, 37, 1.4)} ${ROND(34, 37, 1.4)}`,
	// Lame large à deux mains, pointe basse, quillons inclinés.
	claymore: `M20 15 H28 L27 34 L24 40 L21 34 Z M24 18.5 V31 M13 18 L20 15 M35 18 L28 15 M24 15 V8.6 ${ROND(24, 7, 1.5)}`,
	// Lame fine entre deux rameaux : la parole donnée.
	'lame-d-honneur': `M24 9 V30 M19.5 30 H28.5 M24 30 V36 ${ROND(24, 37.4, 1.4)} M15.5 13.5 C10 19.5 10 30 16.5 36.5 M32.5 13.5 C38 19.5 38 30 31.5 36.5 M12.4 19.8 l-2.6 -1 M13 31.4 l-2.4 1.6 M35.6 19.8 l2.6 -1 M35 31.4 l2.4 1.6`,
	// Hache barbue sur son manche.
	sauvageon: 'M16 40 L29 10 M28.35 11.5 Q32 12.6 36.5 9.5 Q41 16.5 38.5 24.5 Q32 19.6 25.4 18.4',
	// Écu et sa croix.
	croise:
		'M14 11.5 H34 V23.5 C34 31 29.5 36 24 39.5 C18.5 36 14 31 14 23.5 Z M24 16 V33.5 M18.5 22 H29.5',
	// Dague sous un croissant.
	rodeur: `M35 16 L27.4 29.1 L24 26.3 Z M22.1 24.8 L29.3 30.6 M25.7 27.7 L21.4 33.2 ${ROND(20.4, 34.4, 1.4)} M16.5 9 a5.6 5.6 0 1 0 5.2 7.8 a4.5 4.5 0 0 1 -5.2 -7.8 Z`,
	// Lance : la hampe et son fer en feuille.
	traqueur: 'M12 41 L30 16 M29.2 13.6 Q33.6 8.4 38.2 8.2 Q38 12.8 32.8 17.2 Z M27.3 20.2 l3 2.2',
	// Arc bandé et sa flèche.
	flecheur:
		'M21 8 C38 13 38 35 21 40 M21 8 V40 M11 24 H41 M37.4 20.8 L41 24 L37.4 27.2 M11.5 21.4 L14.5 24 L11.5 26.6',
	// Flamme sur l'onde.
	elementaliste:
		'M24 8.5 C29 14.5 32 18.5 32 24 A8 8 0 0 1 16 24 C16 18.5 19 14.5 24 8.5 Z M24 19.5 C26 22 27 23.6 27 25.4 A3 3 0 0 1 21 25.4 C21 23.6 22 22 24 19.5 Z M12.5 37.5 Q16.3 34.5 20.2 37.5 T27.8 37.5 T35.5 37.5',
	// Baguette et ses étincelles.
	evocateur: `M13.5 37.5 L29 18 M26.2 21.5 L28.6 23.4 ${ETINCELLE(33, 12.5, 5)} ${ETINCELLE(38, 23.5, 2.5)} ${ETINCELLE(22.5, 11.6, 2.1)}`,
	// Trois maillons.
	conjurateur:
		'M13.7 13.7 A5.8 3.8 45 1 0 21.9 21.9 A5.8 3.8 45 1 0 13.7 13.7 M19.9 19.9 A5.8 3.8 45 1 0 28.1 28.1 A5.8 3.8 45 1 0 19.9 19.9 M26.1 26.1 A5.8 3.8 45 1 0 34.3 34.3 A5.8 3.8 45 1 0 26.1 26.1',
	// Orbe sur son pied.
	arcaniste: `${ROND(24, 20.5, 9)} M19 17.5 A6 6 0 0 1 23 14.6 M17 34 Q24 29.4 31 34 M15 38 H33 ${ETINCELLE(36.5, 11, 2.5)}`
};

/** « Lame d'Honneur » → `lame-d-honneur`, « Rôdeur » → `rodeur`. */
function cleDeSceau(nom: string): string {
	return nom
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/** Tracé (attribut `d`) du sceau d'un Serment, par son nom ou son adresse. */
export function sceauPour(nom: string): string {
	return SCEAUX[cleDeSceau(nom)] ?? ETOILE;
}

/** Les Serments qui ont un dessin propre (planche du kit, tests). */
export const SERMENTS_DESSINES: readonly string[] = Object.keys(SCEAUX);
