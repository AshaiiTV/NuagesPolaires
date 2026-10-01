/** Retour de connexion normalisé à l'origine de la requête. */
export function safeLoginReturn(value: unknown, origin: string): string | null {
	if (typeof value !== 'string' || value.length > 512 || /[\u0000-\u001f\u007f]/.test(value))
		return null;
	try {
		const url = new URL(value, origin);
		if (url.origin !== new URL(origin).origin) return null;
		if (url.pathname === '/entrer' || url.pathname.startsWith('/entrer/')) return null;
		// Un Location commençant par // serait interprété comme une autre origine.
		if (url.pathname.startsWith('//')) return null;
		return url.pathname + url.search + url.hash;
	} catch {
		return null;
	}
}
