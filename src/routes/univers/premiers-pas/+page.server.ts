// Premiers pas (06-contrats §C) : la page reçoit l'état du compte et ne montre que le chapitre
// qui le concerne — visiteur, compte en attente de liaison, personnage relié, liaison sans fiche,
// ou rôle de MJ, d'administrateur, de designer.
import { getContent } from '$lib/content';
import { voisines } from '../pages';
import type { PageServerLoad } from './$types';

export type EtatPremiersPas = 'visiteur' | 'attente' | 'relie' | 'indisponible' | 'staff';

export const load: PageServerLoad = ({ locals }) => {
	const content = getContent('premiers-pas');
	const { previous, next } = voisines('premiers-pas');
	const compte = locals.compteNav;
	const account = locals.account;

	let etat: EtatPremiersPas = 'visiteur';
	if (compte && account) {
		if (compte.role !== 'joueur') etat = 'staff';
		else if (locals.character) etat = 'relie';
		else if (account.characterId) etat = 'indisponible';
		else etat = 'attente';
	}

	return {
		titre: content.title,
		resume: content.resume,
		etat,
		pseudo: compte?.pseudo ?? null,
		role: compte?.role ?? null,
		personnage: etat === 'relie' || etat === 'staff' ? (locals.character?.name ?? null) : null,
		previous,
		next
	};
};
