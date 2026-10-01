import { getOath, listOaths } from '$lib/server/domain/oaths';
import { getOwnSheet } from '$lib/server/domain/characters';
import { branchMatchesLabel } from '$lib/game/oaths';
import type { OathView } from '$lib/schemas/oaths';
// 06-contrats §B.7 : références administrables en base et vues déjà filtrées.
export async function loadOaths(locals: App.Locals) {
	return listOaths(locals.db, locals.actor);
}
export async function loadOath(locals: App.Locals, idOrSlug: string) {
	return getOath(locals.db, locals.actor, idOrSlug);
}

export async function repereLecteur(locals: App.Locals, oath: OathView) {
	if (!locals.actor?.characterId) return { tuEsIci: null, readerBranch: null };
	const sheet = await getOwnSheet(locals.db, locals.actor);
	if (!sheet || sheet.oath.id !== oath.id) return { tuEsIci: null, readerBranch: null };
	const branch = oath.branches.find((b) =>
		branchMatchesLabel({ nom: b.label, style: b.style, paliers: [] }, sheet.branch)
	);
	return branch
		? { tuEsIci: sheet.level, readerBranch: branch.label }
		: { tuEsIci: null, readerBranch: null };
}
