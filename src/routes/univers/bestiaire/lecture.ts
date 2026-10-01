import { error } from '@sveltejs/kit';
import { isNpError } from '$lib/server/http';
import { listBeastsSchema } from '$lib/schemas/beasts';

export function filtres(url: URL) {
	const result = listBeastsSchema.safeParse({
		search: url.searchParams.get('recherche') ?? '',
		behavior: url.searchParams.get('comportement') || undefined,
		zoneId: url.searchParams.get('zone') || undefined,
		sort: url.searchParams.get('tri') || 'name'
	});
	if (!result.success) error(400, 'Ces repères ne permettent pas d’ouvrir le bestiaire.');
	return result.data;
}

export async function lire<T>(lecture: Promise<T>): Promise<T> {
	try {
		return await lecture;
	} catch (cause) {
		if (isNpError(cause)) error(cause.status, { message: cause.message, code: cause.code });
		throw cause;
	}
}
