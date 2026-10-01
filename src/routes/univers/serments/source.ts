import { visibleOaths, findOath } from '$lib/game/oaths';
// Point de raccordement au domaine serveur. Ne jamais envoyer un Serment masqué.
export async function loadOaths(_locals: App.Locals) { return visibleOaths(); }
export async function loadOath(locals: App.Locals, idOrSlug: string) { return findOath(idOrSlug, await loadOaths(locals)); }
