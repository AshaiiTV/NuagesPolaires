import { error } from '@sveltejs/kit';
import { oathBranches, tierLevelsFor, PUBLIC_RANKS } from '$lib/game/oaths';
import { loadOath, loadOaths } from '../source';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals, params }) => {
 const oath = await loadOath(locals, params.nom);
 if (!oath || oath.hidden || !PUBLIC_RANKS.includes(oath.rank)) error(404, 'Cette page n’existe pas dans le carnet.');
 const all = (await loadOaths(locals)).filter(o => PUBLIC_RANKS.includes(o.rank));
 const index = all.findIndex(o => o.id === oath.id);
 const link = (o: typeof oath | undefined) => o ? { href: '/univers/serments/' + o.id, title: o.name } : null;
 return { oath, branches: oathBranches(oath), levels: tierLevelsFor(oath.rank), previous: link(all[index - 1]), next: link(all[index + 1]), tuEsIci: null as number | null, readerBranch: null as string | null };
};
