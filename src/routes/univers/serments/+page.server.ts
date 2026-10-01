import { oathRankSchema } from '$lib/schemas/oaths';
import { loadOaths } from './source';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals, url }) => {
	const all = await loadOaths(locals);
	const ranks = oathRankSchema.options.filter((rank) => all.some((oath) => oath.rank === rank));
	const rank = url.searchParams.get('rang');
	return { oaths: all.filter((oath) => !rank || oath.rank === rank), ranks, rank };
};
