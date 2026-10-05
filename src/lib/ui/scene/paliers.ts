// Les paliers d'une branche, écrits de la même façon partout (feuillet, fiche, fiche à imprimer) :
// « Palier I — Éveil · niveau 2 » pour un palier atteint, « Palier IV — Plénitude · au niveau 10 »
// pour le suivant (03-vision §5.3, lexique §8 : on *atteint* un palier, on ne le « débloque » pas).

const ROMAINS = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const PALIERS = ['Éveil', 'Densité', 'Maîtrise', 'Plénitude'];

/** « Palier III — Maîtrise » (rang compté depuis 0 ; `stage` : nom donné par l'atelier, en repli). */
export function nomPalier(rang: number, stage = ''): string {
	const romain = ROMAINS[rang] ?? String(rang + 1);
	const nom = PALIERS[rang] ?? stage;
	return nom ? `Palier ${romain} — ${nom}` : `Palier ${romain}`;
}

/** En-tête d'un palier atteint : « Palier I — Éveil · niveau 2 ». */
export function palierAtteint(rang: number, niveau: number, stage = ''): string {
	return `${nomPalier(rang, stage)} · niveau ${niveau}`;
}

/** En-tête du palier suivant : « Palier IV — Plénitude · au niveau 10 ». */
export function palierSuivant(rang: number, niveau: number, stage = ''): string {
	return `${nomPalier(rang, stage)} · au niveau ${niveau}`;
}
