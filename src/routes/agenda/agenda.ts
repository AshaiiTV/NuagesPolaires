// Outils de l'Agenda (03-vision §5.6) : teintes de sens des cinq types, bloc-date, phrase des inscrits.
// Module pur, partagé par /agenda et /agenda/organiser.
import { EVENT_TYPES, EV_TYPES, type EventType } from '$lib/game/events';
import { parisParts, toDate, type DateInput } from '$lib/ui/dates';

/**
 * Teintes de sens des types de rendez-vous (03-vision §7 : « couleurs de sens conservées comme
 * losange de 4 px devant un libellé, jamais comme fond »). Les valeurs sont celles de l'ancien
 * agenda (audit 07 : `EV_TYPES` combat `--red`, exploration `--gold`, social `--glacier`,
 * événement majeur `--purple`, autre `--faint`), que les tokens du carnet ne portent plus.
 * Elles ne colorent jamais un texte ni un fond : seulement le losange.
 */
const TEINTES_HERITEES: Record<string, string> = {
	'--red': '#c94a4a',
	'--gold': '#c9a84c',
	'--glacier': '#7eb8d4',
	'--purple': '#9a74c4',
	'--faint': '#8a9ea8'
};

/** Couleur du losange d'un type : couleur directe, token hérité traduit, ou token du carnet. */
export function teinte(couleur: string | null | undefined): string {
	if (!couleur) return 'var(--encre-grise)';
	if (couleur.startsWith('--')) return TEINTES_HERITEES[couleur] ?? `var(${couleur})`;
	return couleur;
}

export interface TypeRendezVous {
	id: EventType;
	libelle: string;
	couleur: string;
}

/** Les cinq types, dans l'ordre du carnet. */
export const TYPES: TypeRendezVous[] = EVENT_TYPES.map((id) => ({
	id,
	libelle: EV_TYPES[id].label,
	couleur: teinte(EV_TYPES[id].color)
}));

const moisCourt = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'Europe/Paris' });
const jourCourt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'Europe/Paris' });

export interface BlocDate {
	jour: string;
	mois: string;
	semaine: string;
	/** Année, seulement si elle diffère de celle de `maintenant`. */
	annee: string | null;
}

/** Bloc-date d'une ligne d'agenda (« 12 / OCT. / sam. ») ; `null` : date à confirmer. */
export function blocDate(valeur: DateInput, maintenant: DateInput): BlocDate | null {
	const d = toDate(valeur);
	const p = parisParts(d);
	if (!d || !p) return null;
	const n = parisParts(maintenant);
	return {
		jour: String(p.day),
		mois: moisCourt.format(d).replace('.', ''),
		semaine: jourCourt.format(d).replace('.', ''),
		annee: n && n.year !== p.year ? String(p.year) : null
	};
}

/** Clé de mois (« 2026-10 ») pour poser un filet quand le mois change. */
export function cleMois(valeur: DateInput): string | null {
	const p = parisParts(valeur);
	return p ? `${p.year}-${String(p.month).padStart(2, '0')}` : null;
}

/**
 * Phrase des places, jamais « 0 » (03-vision §8 « Le vide ») : « 4 inscrits sur 6 », « sans limite »,
 * « Personne encore · 6 places ».
 */
export function phrasePlaces(count: number, capacity: number): string {
	const limite = capacity > 0;
	if (count === 0) return limite ? `aucun inscrit sur ${capacity}` : 'aucun inscrit · sans limite';
	const inscrits = `${count} inscrit${count > 1 ? 's' : ''}`;
	return limite ? `${inscrits} sur ${capacity}` : `${inscrits} · sans limite`;
}

/** Phrase des inscrits d'un rendez-vous passé : « 2 inscrits », jamais « 0 ». */
export function phrasePasses(count: number): string {
	if (count === 0) return 'Personne n’y était inscrit';
	return `${count} inscrit${count > 1 ? 's' : ''}`;
}
