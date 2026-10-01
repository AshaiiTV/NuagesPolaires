import { getContent } from '$lib/content';
import { pages } from './pages';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	chapters: pages
		.filter((page) => !page.colophon)
		.map((page) => ({
			href: page.href,
			title: page.title,
			resume: page.slug ? getContent(page.slug).resume : (page.resume ?? '')
		}))
});
