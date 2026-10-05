import { error } from '@sveltejs/kit';
import { isNpError } from '$lib/server/http';
import { loadOath, loadOaths, repereLecteur } from '../source';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	// 06-contrats §B.7 : la vue arrive déjà filtrée (Serments masqués et rangs hors vitrine absents).
	const oath = await loadOath(locals, params.nom).catch((e: unknown) => {
		if (isNpError(e) && e.status < 500) error(404, 'Cette page n’existe pas dans le carnet.');
		throw e;
	});
	const [all, reader] = await Promise.all([loadOaths(locals), repereLecteur(locals, oath)]);
	const categories = ['melee', 'distance', 'magie', 'soutien'];
	all.sort(
		(a, b) =>
			categories.indexOf(a.category) - categories.indexOf(b.category) ||
			a.name.localeCompare(b.name, 'fr')
	);
	const index = all.findIndex((o) => o.id === oath.id);
	const link = (o: (typeof all)[number] | undefined) =>
		o ? { href: '/univers/serments/' + o.id, title: o.name } : null;
	return {
		oath,
		previous: index > 0 ? link(all[index - 1]) : null,
		next: index >= 0 ? link(all[index + 1]) : null,
		...reader
	};
};
