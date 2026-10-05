// Agenda (03-vision §5.6 ; 06-contrats §B.5, §C) : les rendez-vous de la table, l'inscription explicite.
// Les rendez-vous masqués ne sont servis qu'aux rôles qui organisent : le domaine filtre.
import { eq, inArray } from 'drizzle-orm';
import { action } from '$lib/server/actions';
import { accounts, events } from '$lib/server/db/schema';
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
		tampons: await tamponsOrganisateurs(event.locals.db, [...agenda.upcoming, ...agenda.past].map((e) => e.id)),
		pagePasses: Math.min(pastPage, agenda.pastPages),
		relie: !!actor.characterId,
		pseudo: actor.pseudo,
		organiser: can(actor.role, 'events.manage'),
		/** Instant de la lecture : l'heure à laquelle les rendez-vous affichés ont été relevés. */
		lu: new Date().toISOString()
	};
};

/**
 * Le tampon de l'organisateur (03-vision §5.6, §8 « MJ Maitre · 26 sept. ») : rôle, pseudo et date
 * d'écriture du rendez-vous. Écart assumé : `EventRowView.organizer` ne porte que le pseudo ; la lecture
 * reste en lecture seule et bornée aux rendez-vous que `listAgenda` vient de servir à ce compte.
 */
async function tamponsOrganisateurs(
	db: App.Locals['db'],
	ids: string[]
): Promise<Record<string, { role: (typeof accounts.$inferSelect)['role']; pseudo: string; at: string }>> {
	if (ids.length === 0) return {};
	const lignes = await db
		.select({ id: events.id, at: events.createdAt, role: accounts.role, pseudo: accounts.pseudo })
		.from(events)
		.innerJoin(accounts, eq(accounts.id, events.createdBy))
		.where(inArray(events.id, ids));
	return Object.fromEntries(lignes.map((l) => [l.id, { role: l.role, pseudo: l.pseudo, at: l.at.toISOString() }]));
}

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
