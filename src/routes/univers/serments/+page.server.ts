import { PUBLIC_RANKS } from '$lib/game/oaths';
import { loadOaths } from './source';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals, url }) => {
 const all = await loadOaths(locals);
 const ranks = PUBLIC_RANKS.filter(rank => all.some(oath => oath.rank === rank));
 const rank = url.searchParams.get('rang');
 return { oaths: all.filter(oath => PUBLIC_RANKS.includes(oath.rank) && (!rank || oath.rank === rank)), ranks, rank };
};
