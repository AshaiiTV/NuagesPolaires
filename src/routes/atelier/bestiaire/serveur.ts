import type { RequestEvent } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { action, type FormValues } from '$lib/server/actions';
import { requireCapability } from '$lib/server/guards';
import {
	getBeast,
	createBeast,
	updateBeast,
	duplicateBeast,
	setBeastHidden,
	archiveBeast,
	restoreBeast
} from '$lib/server/domain/beasts';
import { createZone } from '$lib/server/domain/zones';
import { validateObservation, rejectObservation } from '$lib/server/domain/observations';
import { NpError } from '$lib/server/http';
import { behaviorSchema } from '$lib/schemas/beasts';

const texte = (d: FormValues, k: string) => String(d[k] ?? '');
const nombres = (d: FormValues, k: string) => Number(d[k]);
const tableau = (value: FormValues[string]): string[] =>
	Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];
function champs(data: FormValues, garderComportement = false) {
	const behavior = behaviorSchema.safeParse(data.behavior);
	if (!behavior.success && !garderComportement)
		throw new NpError('INVALID', 'Choisis un comportement.');
	const champs = {
		name: texte(data, 'name'),
		subtitle: texte(data, 'subtitle'),
		behavior: behavior.success ? behavior.data : undefined,
		level: nombres(data, 'level'),
		pv: nombres(data, 'pv'),
		ep: nombres(data, 'ep'),
		strike: texte(data, 'strike'),
		skill: texte(data, 'skill'),
		drops: texte(data, 'drops'),
		gem: texte(data, 'gem'),
		description: texte(data, 'description'),
		quote: texte(data, 'quote'),
		imageUrl: texte(data, 'imageUrl'),
		adminNote: texte(data, 'adminNote'),
		zones: tableau(data.zones),
		hidden: data.hidden === 'on',
		...Object.fromEntries(
			['qtyMin', 'qtyMax', 'spawnWeight']
				.filter((k) => texte(data, k).trim() !== '')
				.map((k) => [k, nombres(data, k)])
		)
	};
	return champs;
}
const commande = (event: RequestEvent, data: FormValues) => ({
	id: event.params.id!,
	expectedRevision: data.expectedRevision as number | undefined
});
export const creer = action(async (event, data) => {
	const actor = requireCapability(event, 'beasts.manage');
	const beast = await createBeast(event.locals.db, actor, champs(data));
	redirect(303, `/atelier/bestiaire/${beast.id}`);
});
export const modifier = action(async (event, data) => {
	const actor = requireCapability(event, 'beasts.manage');
	const ancien = await getBeast(event.locals.db, actor, event.params.id!);
	const garder =
		!behaviorSchema.safeParse(data.behavior).success && data.behavior === ancien.behavior;
	await updateBeast(event.locals.db, actor, { ...champs(data, garder), ...commande(event, data) });
	return { at: new Date().toISOString(), geste: 'modifier' };
});
export const dupliquer = action(async (event, data) => {
	const actor = requireCapability(event, 'beasts.manage');
	const beast = await duplicateBeast(event.locals.db, actor, commande(event, data));
	redirect(303, `/atelier/bestiaire/${beast.id}`);
});
export const masquer = action(async (event, data) => {
	const actor = requireCapability(event, 'beasts.manage');
	await setBeastHidden(event.locals.db, actor, {
		...commande(event, data),
		hidden: data.hidden === 'true'
	});
	return { at: new Date().toISOString(), geste: 'masquer' };
});
export const archiver = action(async (event, data) => {
	const actor = requireCapability(event, 'beasts.manage');
	await (data.restore === 'true' ? restoreBeast : archiveBeast)(
		event.locals.db,
		actor,
		commande(event, data)
	);
	return { at: new Date().toISOString(), geste: 'archiver' };
});
export const zone = action(async (event, data) => {
	const actor = requireCapability(event, 'beasts.manage');
	const zone = await createZone(event.locals.db, actor, { name: texte(data, 'zoneName') });
	return { zoneId: zone.id, at: new Date().toISOString(), geste: 'zone' };
});
function revue(refus: boolean) {
	return action(async (event, data) => {
		const actor = requireCapability(event, 'beasts.manage');
		await (refus ? rejectObservation : validateObservation)(event.locals.db, actor, {
			id: texte(data, 'observationId'),
			expectedRevision: data.expectedRevision as number | undefined,
			motif: texte(data, 'motif')
		});
		return { at: new Date().toISOString(), geste: refus ? 'rejeter' : 'valider' };
	});
}
export const valider = revue(false);
export const rejeter = revue(true);
