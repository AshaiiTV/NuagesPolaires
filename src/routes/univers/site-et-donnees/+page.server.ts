import { getContent, renderMarkdown } from '$lib/content';
import { pages } from '../pages';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = () => {
 const content = getContent('site-et-donnees');
 const index = pages.findIndex(p => p.slug === content.slug);
 return { content, html: renderMarkdown(content.body), previous: pages[index - 1] ?? null, next: pages[index + 1] ?? null };
};
