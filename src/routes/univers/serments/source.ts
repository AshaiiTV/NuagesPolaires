import { getOath, listOaths } from '$lib/server/domain/oaths';
// 06-contrats §B.7 : références administrables en base et vues déjà filtrées.
export async function loadOaths(locals: App.Locals) {
	return listOaths(locals.db, locals.actor);
}
export async function loadOath(locals: App.Locals, idOrSlug: string) {
	return getOath(locals.db, locals.actor, idOrSlug);
}
