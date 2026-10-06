// Les cahiers du carnet selon le rôle (03-vision.md §4). Ce qui n'est pas autorisé n'est pas rendu.
import type { Onglet } from './Cahier.svelte';

export type RoleCompte = 'joueur' | 'mj' | 'designer' | 'admin';

/** Ce que l'enveloppe sait du compte connecté (fourni par le `load` du layout racine). */
export interface CompteNav {
	pseudo: string;
	role: RoleCompte;
	/** Un personnage est relié à ce compte. */
	relie: boolean;
	portrait?: string | null;
	serment?: string;
	/** Des pages non lues existent (cornes) : ruban et onglet Mon carnet. */
	cornes?: boolean;
	/** Table ouverte conduite par ce MJ : le ruban y mène. */
	tableOuverte?: string | null;
}

export const LIBELLES_ROLE: Record<RoleCompte, string> = {
	joueur: 'joueur',
	mj: 'MJ',
	designer: 'designer',
	admin: 'administrateur'
};

const commence = (chemin: string, base: string) => chemin === base || chemin.startsWith(base + '/');

/** Onglets de la tranche (ordinateur), dans l'ordre de la vision. */
export function cahiersPour(compte: CompteNav, chemin: string): Onglet[] {
	const onglets: Onglet[] = [];
	if (compte.role === 'joueur' || compte.relie) {
		onglets.push({
			id: 'carnet',
			libelle: 'Mon carnet',
			court: 'Carnet',
			href: '/carnet',
			courant: commence(chemin, '/carnet'),
			corne: !!compte.cornes
		});
	}
	onglets.push({
		id: 'univers',
		libelle: 'L’univers',
		court: 'Univers',
		href: '/univers',
		courant: commence(chemin, '/univers')
	});
	onglets.push({
		id: 'agenda',
		libelle: 'Agenda',
		href: '/agenda',
		courant: commence(chemin, '/agenda')
	});
	if (compte.role === 'mj' || compte.role === 'admin') {
		onglets.push({
			id: 'table',
			libelle: 'La Table',
			court: 'Table',
			href: '/table',
			courant: commence(chemin, '/table')
		});
	}
	if (compte.role === 'designer' || compte.role === 'admin') {
		onglets.push({
			id: 'atelier',
			libelle: 'L’Atelier',
			court: 'Atelier',
			href: '/atelier/bestiaire',
			courant: commence(chemin, '/atelier')
		});
	}
	if (compte.role === 'admin') {
		onglets.push({
			id: 'registre',
			libelle: 'Le Registre',
			court: 'Registre',
			href: '/registre',
			courant: commence(chemin, '/registre')
		});
	}
	return onglets;
}

/** Bande basse du téléphone : cinq entrées au plus, la dernière est « Plus ». */
export function bandePour(compte: CompteNav, chemin: string): Onglet[] {
	const plus: Onglet = {
		id: 'plus',
		libelle: 'Plus',
		href: '/plus',
		courant: commence(chemin, '/plus') || commence(chemin, '/compte')
	};
	const univers: Onglet = {
		id: 'univers',
		libelle: 'Univers',
		href: '/univers',
		courant: commence(chemin, '/univers')
	};
	const agenda: Onglet = {
		id: 'agenda',
		libelle: 'Agenda',
		href: '/agenda',
		courant: commence(chemin, '/agenda')
	};
	if (compte.role === 'joueur') {
		const carnet: Onglet = {
			id: 'carnet',
			libelle: 'Carnet',
			href: '/carnet',
			courant:
				chemin === '/carnet' ||
				commence(chemin, '/carnet/journal') ||
				commence(chemin, '/carnet/recits'),
			corne: !!compte.cornes
		};
		if (!compte.relie) return [carnet, univers, agenda, plus];
		const fiche: Onglet = {
			id: 'fiche',
			libelle: 'Fiche',
			href: '/carnet/fiche',
			courant: commence(chemin, '/carnet/fiche')
		};
		return [carnet, fiche, agenda, univers, plus];
	}
	const tranche = cahiersPour(compte, chemin).map((o) => ({ ...o, libelle: o.court ?? o.libelle }));
	// MJ, designer, administrateur : les quatre premiers cahiers, puis « Plus » ouvre la tranche complète.
	return [...tranche.slice(0, 4), plus];
}

/** Le ruban « En scène » : second accès permanent, selon le rôle. `null` : pas de ruban. */
export function rubanPour(
	compte: CompteNav
): { href: string; libelle: string; corne: boolean } | null {
	if ((compte.role === 'mj' || compte.role === 'admin') && compte.tableOuverte) {
		// Un seul nom pour le ruban (03-vision §4) : seule sa destination change pour le MJ.
		return { href: `/table/combat/${compte.tableOuverte}`, libelle: 'En scène', corne: false };
	}
	if (compte.relie) return { href: '/carnet/scene', libelle: 'En scène', corne: !!compte.cornes };
	if (compte.role === 'joueur')
		return { href: '/carnet', libelle: 'En scène', corne: !!compte.cornes };
	return null;
}

/** Bande basse du visiteur. */
export function bandeVisiteur(chemin: string): Onglet[] {
	return [
		{ id: 'accueil', libelle: 'Accueil', href: '/', courant: chemin === '/' },
		{
			id: 'univers',
			libelle: 'Univers',
			href: '/univers',
			courant: commence(chemin, '/univers') && !commence(chemin, '/univers/serments')
		},
		{
			id: 'serments',
			libelle: 'Serments',
			href: '/univers/serments',
			courant: commence(chemin, '/univers/serments')
		},
		{ id: 'entrer', libelle: 'Entrer', href: '/entrer', courant: commence(chemin, '/entrer') }
	];
}
