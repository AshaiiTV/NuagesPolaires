import { redirect } from '@sveltejs/kit';
import { action } from '$lib/server/actions';
import { requireCapability } from '$lib/server/guards';
import { can } from '$lib/server/permissions';
import { createCharacter, listCharacters } from '$lib/server/domain/characters';
import { listOaths } from '$lib/server/domain/oaths';
import { createCharacterSchema } from '$lib/schemas/characters';
import { entree, lecture, texte } from './serveur';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) =>
	lecture(async () => {
		const actor = requireCapability(event, 'characters.read_all');
		const search = event.url.searchParams.get('recherche')?.trim() ?? '';
		const oathId = event.url.searchParams.get('serment') ?? '';
		const liaison = event.url.searchParams.get('liaison') ?? '';
		const [characters, oaths, creationOaths] = await Promise.all([
			listCharacters(event.locals.db, actor, {
				search: search || undefined,
				oathId: oathId || undefined,
				linked: liaison === 'relie' ? true : liaison === 'non-relie' ? false : undefined
			}),
			listOaths(event.locals.db, actor),
			// La création ne propose que les Serments publics ; aucun Serment masqué ne sera refusé après choix.
			listOaths(event.locals.db, null)
		]);
		return {
			characters,
			oaths,
			creationOaths,
			search,
			oathId,
			liaison,
			canCreate: can(actor.role, 'characters.create')
		};
	});

export const actions: Actions = {
	creer: action(async (event, data) => {
		const actor = requireCapability(event, 'characters.create');
		const sheet = await createCharacter(
			event.locals.db,
			actor,
			entree(createCharacterSchema, {
				name: texte(data, 'name'),
				oathId: texte(data, 'oathId'),
				portraitUrl: texte(data, 'portraitUrl'),
				motif: texte(data, 'motif')
			})
		);
		redirect(303, `/table/personnages/${sheet.id}`);
	})
};
