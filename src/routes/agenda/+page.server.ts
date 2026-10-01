// Agenda (03-vision §5.6 ; 06-contrats §B.5, §C) : les rendez-vous de la table, l'inscription explicite.
// Les rendez-vous masqués ne sont servis qu'aux rôles qui organisent : le domaine filtre.
import { action } from '$lib/server/actions';
import { listAgenda, setParticipation } from '$lib/server/domain/events';
import { requireAccount } from '$lib/server/guards';
import { can } from '$lib/server/permissions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const actor = requireAccount(event);
	const brut = Number(event.url.searchParams.get('passes') ?? '1');
	const pastPage = Number.isSafeInteger(brut) && brut >= 1 ? brut : 1;
	const agenda = await listAgenda(event.locals.db, actor, { pastPage });
	return {
		agenda,
		pagePasses: Math.min(pastPage, agenda.pastPages),
		relie: !!actor.characterId,
		pseudo: actor.pseudo,
		organiser: can(actor.role, 'events.manage'),
		/** Instant de la lecture : l'heure à laquelle les rendez-vous affichés ont été relevés. */
		lu: new Date().toISOString()
	};
};

export const actions: Actions = {
	participer: action(async (event, data) => {
		const row = await setParticipation(event.locals.db, event.locals.actor, {
			eventId: String(data.eventId ?? ''),
			participating: String(data.participating ?? ''),
			expectedRevision: data.expectedRevision as number
		});
		return { geste: row.registered ? ('venir' as const) : ('rayer' as const), eventId: row.id };
	})
};
