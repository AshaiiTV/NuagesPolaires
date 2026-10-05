// Les pages du cahier « L'univers », dans l'ordre de lecture (03-vision §4).
// Une page dont la route n'est pas encore écrite n'apparaît nulle part : ni dans l'index,
// ni dans le pied « Tourner » (03-vision §2 : absent de la navigation tant qu'il n'existe pas).
export type PageUnivers = {
	href: string;
	title: string;
	/** Texte de `src/content` dont la page tire son résumé. */
	slug?: string;
	resume?: string;
	/** Page du colophon (mentions, données) : lisible et tournable, hors de l'index. */
	colophon?: boolean;
};

const ecrites = new Set(
	Object.keys(import.meta.glob('./*/+page.svelte')).map((chemin) => chemin.split('/')[1])
);

const toutes: PageUnivers[] = [
	{ href: '/univers/synopsis', title: 'Synopsis', slug: 'synopsis' },
	{
		href: '/univers/serments',
		title: 'Les Serments',
		resume: 'Les armes, les branches et les paliers de chaque Serment.'
	},
	{
		href: '/univers/bestiaire',
		title: 'Le bestiaire',
		resume: 'Les pages consacrées aux créatures et à leurs observations.'
	},
	{ href: '/univers/systeme', title: 'Le système de jeu', slug: 'systeme-de-jeu' },
	{ href: '/univers/reglement', title: 'Le règlement', slug: 'reglement' },
	{ href: '/univers/premiers-pas', title: 'Premiers pas', slug: 'premiers-pas' },
	{
		href: '/univers/site-et-donnees',
		title: 'Le site et vos données',
		slug: 'site-et-donnees',
		colophon: true
	}
];

export const pages: PageUnivers[] = toutes.filter((page) => ecrites.has(page.href.split('/')[2]));

/** Les voisines d'une page, pour le pied « Tourner ». */
export function voisines(slug: string) {
	const index = pages.findIndex((page) => page.slug === slug);
	const lien = (page: PageUnivers | undefined) =>
		page ? { href: page.href, title: page.title } : null;
	return {
		page: pages[index],
		previous: index > 0 ? lien(pages[index - 1]) : null,
		next: index >= 0 ? lien(pages[index + 1]) : null
	};
}
