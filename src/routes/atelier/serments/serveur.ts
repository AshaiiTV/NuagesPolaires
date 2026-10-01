import { redirect } from '@sveltejs/kit';
import { action, type FormValues } from '$lib/server/actions';
import { requireCapability } from '$lib/server/guards';
import { createOath, updateOath, setOathHidden } from '$lib/server/domain/oaths';
import { oathRankSchema, oathCategorySchema } from '$lib/schemas/oaths';
import { tierLevelsFor } from '$lib/game/oaths';
import { NpError } from '$lib/server/http';

const texte = (d: FormValues, key: string) => String(d[key] ?? '');
function champs(data: FormValues) {
	const rank = oathRankSchema.safeParse(data.rank);
	const category = oathCategorySchema.safeParse(data.category);
	if (!rank.success || !category.success)
		throw new NpError('INVALID', 'Choisis un rang et une catégorie.');
	const niveaux = tierLevelsFor(rank.data);
	const branche = (key: string) => {
		if (!texte(data, `${key}.label`).trim()) return null;
		return {
			nom: texte(data, `${key}.label`),
			style: texte(data, `${key}.style`),
			descPhys: texte(data, `${key}.physical`),
			flavor: texte(data, `${key}.flavor`),
			paliers: niveaux.map((niv, i) => ({
				niv,
				nom: texte(data, `${key}.${i}.name`),
				cout: texte(data, `${key}.${i}.cost`),
				desc: texte(data, `${key}.${i}.description`)
			}))
		};
	};
	return {
		name: texte(data, 'name'),
		weapon: texte(data, 'weapon'),
		rank: rank.data,
		category: category.data,
		growth: { pvN: Number(data.pvN), epN: Number(data.epN), emN: Number(data.emN) },
		baseDamage: Number(data.baseDamage),
		damageType: texte(data, 'damageType'),
		lore: texte(data, 'lore'),
		hidden: data.hidden === 'on',
		evolvesFrom: texte(data, 'evolvesFrom') || null,
		branches: { bA: branche('bA'), bB: branche('bB') }
	};
}
export const modifier = action(async (event, data) => {
	const actor = requireCapability(event, 'oaths.manage');
	await updateOath(event.locals.db, actor, {
		...champs(data),
		id: event.params.id!,
		expectedRevision: data.expectedRevision as number | undefined,
		motif: texte(data, 'motif')
	});
	return { at: new Date().toISOString(), geste: 'modifier' };
});
export const creer = action(async (event, data) => {
	const actor = requireCapability(event, 'oaths.manage');
	const oath = await createOath(event.locals.db, actor, champs(data));
	redirect(303, `/atelier/serments/${oath.id}`);
});
export const masquer = action(async (event, data) => {
	const actor = requireCapability(event, 'oaths.manage');
	await setOathHidden(event.locals.db, actor, {
		id: event.params.id!,
		expectedRevision: data.expectedRevision as number | undefined,
		hidden: data.hidden === 'true'
	});
	return { at: new Date().toISOString(), geste: 'masquer' };
});
