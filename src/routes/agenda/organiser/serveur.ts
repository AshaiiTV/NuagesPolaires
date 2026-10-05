// « Organiser » (03-vision §5.6 ; 06-contrats §B.5, §C) : lecture et form actions partagées par
// /agenda/organiser (nouveau rendez-vous) et /agenda/organiser/[id] (rendez-vous ouvert).
// MJ, designer, administrateur (`events.manage`) ; « Prévenir les joueurs » : MJ et administrateurs
// (`events.notify`, 03-vision §12 réponse 5). Le domaine vérifie chaque droit ; la page n'affiche
// que ce que le rôle peut faire.
import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import { action, type FormValues } from '$lib/server/actions';
import {
	createEvent,
	listAgenda,
	notifyEvent,
	setEventHidden,
	strikeEvent,
	updateEvent
} from '$lib/server/domain/events';
import { requireCapability } from '$lib/server/guards';
import { NpError } from '$lib/server/http';
import { can } from '$lib/server/permissions';
import type { AgendaView, EventRowView, EventType } from '$lib/schemas/events';

export interface DonneesOrganiser {
	signataire: { role: string; pseudo: string };
	agenda: AgendaView;
	pagePasses: number;
	peutPrevenir: boolean;
	lu: string;
	/** Titre d'un rendez-vous rayé à l'instant (retour de ?/rayer). */
	raye: string | null;
}

type Evenement = Pick<RequestEvent, 'locals' | 'url'>;

/** Agenda complet vu par qui organise : rendez-vous masqués compris. */
export async function lireOrganiser(event: Evenement): Promise<DonneesOrganiser> {
	const actor = requireCapability(event, 'events.manage');
	const brut = Number(event.url.searchParams.get('passes') ?? '1');
	const pastPage = Number.isSafeInteger(brut) && brut >= 1 ? brut : 1;
	const agenda = await listAgenda(event.locals.db, actor, { pastPage });
	const raye = event.url.searchParams.get('raye');
	return {
		signataire: { role: actor.role, pseudo: actor.pseudo },
		agenda,
		pagePasses: Math.min(pastPage, agenda.pastPages),
		peutPrevenir: can(actor.role, 'events.notify'),
		lu: new Date().toISOString(),
		raye: raye ? raye.slice(0, 140) : null
	};
}

/** Retrouve un rendez-vous dans l'agenda (à venir, puis chaque page des passés). */
export async function trouverRendezVous(
	event: Evenement,
	donnees: DonneesOrganiser,
	id: string
): Promise<EventRowView> {
	const actor = requireCapability(event, 'events.manage');
	const ici = [...donnees.agenda.upcoming, ...donnees.agenda.past].find((ev) => ev.id === id);
	if (ici) return ici;
	for (let page = 1; page <= donnees.agenda.pastPages; page++) {
		if (page === donnees.pagePasses) continue;
		const autre = await listAgenda(event.locals.db, actor, { pastPage: page });
		const trouve = autre.past.find((ev) => ev.id === id);
		if (trouve) return trouve;
	}
	error(404, { message: 'Ce rendez-vous n’est plus dans l’agenda.', code: 'NOT_FOUND' });
}

const texte = (v: FormValues[string]): string => (typeof v === 'string' ? v.trim() : '');

/** Date et heure saisies séparément, interprétées à l'heure de Paris par le domaine. */
function debut(data: FormValues): string | null {
	const date = texte(data.date);
	const heure = texte(data.heure);
	if (!date && !heure) return null;
	if (!date) throw new NpError('INVALID', 'Choisis aussi une date, ou laisse l’heure vide.', 400);
	if (!heure) throw new NpError('INVALID', 'Choisis une heure, ou laisse la date vide.', 400);
	return `${date}T${heure}`;
}

function champs(data: FormValues) {
	return {
		title: texte(data.titre),
		type: (texte(data.type) || 'autre') as EventType,
		description: typeof data.description === 'string' ? data.description : '',
		startsAt: debut(data),
		capacity: texte(data.places) || '0',
		discordUrl: texte(data.salon),
		hidden: texte(data.visibilite) === 'masque'
	};
}

const maintenant = () => new Date().toISOString();

export const actionsOrganiser = {
	creer: action(async (event, data) => {
		const c = champs(data);
		const resultat = await createEvent(event.locals.db, event.locals.actor, {
			...c,
			notify: texte(data.prevenir) === 'oui'
		});
		return {
			geste: 'creer' as const,
			eventId: resultat.event.id,
			at: maintenant(),
			notified: resultat.notified,
			notifyError: resultat.notifyError
		};
	}),

	modifier: action(async (event, data) => {
		const c = champs(data);
		const row = await updateEvent(event.locals.db, event.locals.actor, {
			eventId: texte(data.eventId),
			expectedRevision: data.expectedRevision,
			...c,
			startsAt: c.startsAt ?? ''
		});
		return { geste: 'modifier' as const, eventId: row.id, at: maintenant() };
	}),

	masquer: action(async (event, data) => {
		const row = await setEventHidden(event.locals.db, event.locals.actor, {
			eventId: texte(data.eventId),
			hidden: texte(data.hidden),
			expectedRevision: data.expectedRevision
		});
		return { geste: 'masquer' as const, eventId: row.id, at: maintenant(), hidden: row.hidden };
	}),

	rayer: action(async (event, data) => {
		await strikeEvent(event.locals.db, event.locals.actor, {
			eventId: texte(data.eventId),
			expectedRevision: data.expectedRevision
		});
		const titre = texte(data.titre).slice(0, 140);
		redirect(303, `/agenda/organiser${titre ? `?raye=${encodeURIComponent(titre)}` : ''}`);
	}),

	prevenir: action(async (event, data) => {
		const resultat = await notifyEvent(event.locals.db, event.locals.actor, {
			eventId: texte(data.eventId)
		});
		return { geste: 'prevenir' as const, eventId: resultat.eventId, at: resultat.announcedAt };
	})
};

/** Ce que renvoient les actions (prop `form` de la page). */
export type RetourOrganiser =
	| { geste: 'creer'; eventId: string; at: string; notified: boolean; notifyError: string | null }
	| { geste: 'modifier'; eventId: string; at: string }
	| { geste: 'masquer'; eventId: string; at: string; hidden: boolean }
	| { geste: 'prevenir'; eventId: string; at: string }
	| { code: string; message: string; values?: Record<string, string | string[]> };
