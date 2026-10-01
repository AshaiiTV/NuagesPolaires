import { visibleOaths, OATH_CATEGORY_LABELS } from '$lib/game/oaths';
import type { PageServerLoad } from './$types';

/** Un feuillet de « Dernières pages » : récit publié par un MJ, rendez-vous passé ou à venir. */
export type HomeLeaf = {
	id: string;
	kind: 'recit' | 'passe' | 'a-venir';
	margin: string;
	title: string;
	excerpt: string;
	stamp: string | null;
	href: string | null;
};

export const load: PageServerLoad = async () => {
	// Les feuillets viennent des publications tamponnées et de l'agenda visible (domaines
	// `publications` et `events`). Tant qu'aucune page n'est publiée, l'accueil montre un feuillet blanc.
	const leaves: HomeLeaf[] | null = [];

	const oaths = visibleOaths().map((oath) => ({
		id: oath.id,
		name: oath.name,
		weapon: oath.weapon,
		category: OATH_CATEGORY_LABELS[oath.category] ?? ''
	}));

	return { leaves, oaths, discord: null as string | null };
};
