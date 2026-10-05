import { resolve } from '$app/paths';
import type { ResolvedPathname } from '$app/types';

/** Les vues fournissent des chemins déjà construits, sans paramètres de route à substituer. */
export function chemin(href: string): ResolvedPathname {
	if (!href.startsWith('/')) throw new Error('Un chemin interne doit commencer par /.');
	return resolve(href as '/');
}

/** Les liens des composants peuvent également mener vers Discord ou une autre URL externe. */
export function adresse(href: string): string {
	return href.startsWith('/') ? chemin(href) : href;
}
