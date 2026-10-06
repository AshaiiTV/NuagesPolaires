// Une seule signature pour toutes les décisions imprimées dans le carnet.
import { dateCourte, dateHeure, heure, type DateInput } from './dates';
import { LIBELLES_ROLE } from './navigation';

export function signataire(role: string | null, pseudo: string | null): string {
	const libelle = LIBELLES_ROLE[role as keyof typeof LIBELLES_ROLE] ?? role ?? 'MJ';
	const nom = pseudo?.trim() ?? '';
	return !nom || nom.toLocaleLowerCase('fr') === libelle.toLocaleLowerCase('fr')
		? libelle
		: `${libelle} ${nom}`;
}

export function signature(role: string | null, pseudo: string | null, date: DateInput): string {
	return `${signataire(role, pseudo)} · ${dateCourte(date)} ${heure(date)}`;
}

export function signaturePersonnelle(auteur: string, date: DateInput): string {
	return `${auteur} · ${dateCourte(date)} ${heure(date)}`;
}

export function phraseTampon(
	role: string | null,
	pseudo: string | null,
	date: DateInput,
	motif: string
): string {
	return `tamponné par ${signataire(role, pseudo)} le ${dateHeure(date)} — motif : ${motif}`;
}
