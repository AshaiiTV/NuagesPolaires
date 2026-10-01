import { redirect } from '@sveltejs/kit';
import { action, type FormValues } from '$lib/server/actions';
import { requireCapability } from '$lib/server/guards';
import { can } from '$lib/server/permissions';
import { NpError } from '$lib/server/http';
import * as characters from '$lib/server/domain/characters';
import * as schemas from '$lib/schemas/characters';
import { listPendingFor, reportDeclaration, strikeDeclaration } from '$lib/server/domain/declarations';
import { listFacts, validateFact, rejectFact, settleFact } from '$lib/server/domain/facts';
import { listEntries } from '$lib/server/domain/journal';
import { getOath, listOaths } from '$lib/server/domain/oaths';
import { listBeasts } from '$lib/server/domain/beasts';
import { reportDeclarationSchema, strikeDeclarationSchema } from '$lib/schemas/declarations';
import { validateFactSchema, rejectFactSchema, settleFactSchema } from '$lib/schemas/facts';
import { entree, lecture, nombre, numeroPage, revision, texte } from '../serveur';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

export const load: PageServerLoad = async (event) => lecture(async () => {
	const actor = requireCapability(event, 'characters.read_all');
	const sheet = await characters.getSheet(event.locals.db, actor, event.params.id);
	const rawFilter = event.url.searchParams.get('filtre');
	const filter = schemas.CONSEQUENCE_FILTERS.find((f) => f === rawFilter);
	const [consequences, declarations, facts, journal, beasts, oaths] = await Promise.all([
		characters.listConsequences(event.locals.db, actor, { characterId: sheet.id, filter, page: numeroPage(event.url.searchParams.get('page')) }),
		listPendingFor(event.locals.db, actor, sheet.id),
		listFacts(event.locals.db, actor, { characterId: sheet.id }),
		listEntries(event.locals.db, actor, { characterId: sheet.id, page: numeroPage(event.url.searchParams.get('journal')) }),
		listBeasts(event.locals.db, actor, {}),
		can(actor.role, 'characters.identity') ? listOaths(event.locals.db, actor) : Promise.resolve([])
	]);
	// Les choix de branches n'exposent que les champs utiles. Pas de notes réservées supplémentaires.
	const identityOaths = await Promise.all(oaths.map(async (oath) => {
		const view = await getOath(event.locals.db, actor, oath.id);
		return { id: view.id, name: view.name, weapon: view.weapon, branches: view.branches.map((b) => b.label) };
	}));
	const latest = filter || consequences.page > 1
		? await characters.listConsequences(event.locals.db, actor, { characterId: sheet.id, page: 1 })
		: consequences;
	return {
		sheet, consequences, declarations, facts, journal, filter: filter ?? '', identityOaths,
		lastStamp: latest.rows.find((c) => c.stamp) ?? null,
		beasts: beasts.map(({ id, name, level }) => ({ id, name, level })),
		canStamp: can(actor.role, 'characters.stamp'), canIdentity: can(actor.role, 'characters.identity'),
		canValidate: can(actor.role, 'facts.validate'), showStruck: event.url.searchParams.get('ratures') === 'oui'
	};
});

function base(event: RequestEvent, data: FormValues) {
	requireCapability(event, 'characters.stamp');
	return { characterId: event.params.id, motif: texte(data, 'motif'), expectedRevision: revision(data) };
}

async function declarationOnPage(event: RequestEvent, id: string) {
	const actor = requireCapability(event, 'characters.stamp');
	const pending = await listPendingFor(event.locals.db, actor, event.params.id);
	if (!pending.some((d) => d.id === id)) throw NpError.notFound('Cette déclaration n’attend pas de report sur cette page.');
	return actor;
}

export const actions: Actions = {
	corriger: action(async (event, data) => {
		const input = entree(schemas.correctResourceSchema, { ...base(event, data), resource: texte(data, 'resource'), newValue: nombre(data, 'newValue'), replacesId: texte(data, 'replacesId') || undefined });
		await characters.correctResource(event.locals.db, event.locals.actor, input);
		return { stamped: true };
	}),
	xp: action(async (event, data) => {
		const common = base(event, data);
		const beasts = await listBeasts(event.locals.db, event.locals.actor, {});
		const beast = beasts.find((b) => b.id === texte(data, 'beastId'));
		if (!beast) throw new NpError('INVALID', 'Choisis la créature vaincue.');
		await characters.grantCombatXp(event.locals.db, event.locals.actor, entree(schemas.grantCombatXpSchema, {
			...common, beastLevel: beast.level, beastName: beast.name, participationPct: nombre(data, 'participationPct')
		}));
		return { stamped: true };
	}),
	gemmes: action(async (event, data) => {
		await characters.fuseGems(event.locals.db, event.locals.actor, entree(schemas.fuseGemsSchema, { ...base(event, data), kind: texte(data, 'kind'), qty: nombre(data, 'qty') }));
		return { stamped: true };
	}),
	objet: action(async (event, data) => {
		const common = { ...base(event, data), qty: nombre(data, 'qty'), note: texte(data, 'note') };
		if (texte(data, 'geste') === 'retirer') {
			await characters.removeItem(event.locals.db, event.locals.actor, entree(schemas.removeItemSchema, { ...common, itemId: texte(data, 'itemId') }));
		} else if (texte(data, 'geste') === 'ajouter') {
			await characters.addItem(event.locals.db, event.locals.actor, entree(schemas.addItemSchema, { ...common, name: texte(data, 'name'), category: texte(data, 'category'), description: texte(data, 'description') }));
		} else throw new NpError('INVALID', 'Choisis un objet à ajouter ou à retirer.');
		return { stamped: true };
	}),
	statut: action(async (event, data) => {
		const common = { ...base(event, data), statusId: texte(data, 'statusId') };
		if (texte(data, 'geste') === 'retirer') await characters.removeStatus(event.locals.db, event.locals.actor, entree(schemas.removeStatusSchema, common));
		else if (texte(data, 'geste') === 'poser') await characters.setStatus(event.locals.db, event.locals.actor, entree(schemas.setStatusSchema, { ...common, note: texte(data, 'note') }));
		else throw new NpError('INVALID', 'Choisis un statut à poser ou à retirer.');
		return { stamped: true };
	}),
	equipement: action(async (event, data) => {
		await characters.setEquipment(event.locals.db, event.locals.actor, entree(schemas.setEquipmentSchema, {
			...base(event, data), equipment: { helmet: texte(data, 'helmet'), chest: texte(data, 'chest'), legs: texte(data, 'legs') }
		}));
		return { stamped: true };
	}),
	reporter: action(async (event, data) => {
		const actor = await declarationOnPage(event, texte(data, 'id'));
		await reportDeclaration(event.locals.db, actor, entree(reportDeclarationSchema, { id: texte(data, 'id'), motif: texte(data, 'motif'), expectedRevision: revision(data) }));
		return { stamped: true };
	}),
	rayerDeclaration: action(async (event, data) => {
		const actor = await declarationOnPage(event, texte(data, 'id'));
		await strikeDeclaration(event.locals.db, actor, entree(strikeDeclarationSchema, { id: texte(data, 'id'), motif: texte(data, 'motif') }));
		return { stamped: true };
	}),
	fait: action(async (event, data) => {
		const actor = requireCapability(event, 'facts.validate');
		const facts = await listFacts(event.locals.db, actor, { characterId: event.params.id });
		if (!facts.some((f) => f.id === texte(data, 'id'))) throw NpError.notFound('Ce fait n’appartient pas à cette page.');
		const input = { id: texte(data, 'id'), motif: texte(data, 'motif'), expectedRevision: revision(data) };
		switch (texte(data, 'geste')) {
			case 'tamponner': await validateFact(event.locals.db, actor, entree(validateFactSchema, input)); break;
			case 'refuser': await rejectFact(event.locals.db, actor, entree(rejectFactSchema, input)); break;
			case 'regler': await settleFact(event.locals.db, actor, entree(settleFactSchema, input)); break;
			default: throw new NpError('INVALID', 'Choisis ce qui s’écrit sur ce fait.');
		}
		return { stamped: true };
	}),
	identite: action(async (event, data) => {
		const actor = requireCapability(event, 'characters.identity');
		const delta = texte(data, 'levelDelta');
		await characters.updateIdentity(event.locals.db, actor, entree(schemas.updateIdentitySchema, {
			characterId: event.params.id, expectedRevision: revision(data), motif: texte(data, 'motif'),
			name: texte(data, 'name'), oathId: texte(data, 'oathId'), branch: texte(data, 'branch'),
			weapon: texte(data, 'weapon'), levelDelta: delta && Number(delta) !== 0 ? Number(delta) : undefined
		}));
		return { stamped: true };
	}),
	rayerPersonnage: action(async (event, data) => {
		const actor = requireCapability(event, 'characters.identity');
		await characters.strikeCharacter(event.locals.db, actor, entree(schemas.strikeCharacterSchema, {
			characterId: event.params.id, expectedRevision: revision(data), typedName: texte(data, 'typedName'), motif: texte(data, 'motif')
		}));
		redirect(303, '/table/personnages');
	})
};
