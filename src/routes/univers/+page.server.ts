import { getContent } from '$lib/content';
import { pages } from './pages';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = () => ({ chapters: pages.slice(0, 6).map(p => ({ ...p, resume: p.slug ? getContent(p.slug).resume : p.resume })) });
