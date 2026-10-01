// /table/apparitions — tirer les créatures d'une zone, relire les 24 derniers tirages et les totaux par
// créature, envoyer un tirage à la Table (03-vision §5.8, 06-contrats B.6 et C). Ce qui n'est pas
// autorisé n'est pas rendu : sans le droit d'apparition, la page n'existe pas (404).
import { redirect } from '@sveltejs/kit';
import { requireCapability } from '$lib/server/guards';
import { action, type FormValues } from '$lib/server/actions';
import { NpError } from '$lib/server/http';
import { drawSpawn, spawnHistory, spawnToTable, spawnTotals } from '$lib/server/domain/spawn';
import { listZones } from '$lib/server/domain/zones';
import { listCharacters } from '$lib/server/domain/characters';
import { listBeasts } from '$lib/server/domain/beasts';
import { NO_ZONE_VALUE } from '$lib/game/spawn';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const actor = requireCapability(event, 'spawn.run');
	const db = event.locals.db;
	const [zones, historique, totaux, personnages, creatures] = await Promise.all([
		listZones(db, actor),
		spawnHistory(db, actor),
		spawnTotals(db, actor),
		listCharacters(db, actor, {}),
		listBeasts(db, actor, {})
	]);
	const parCreature = new Map(creatures.map((b) => [b.id, b]));
	return {
		zones: [
			...zones.map((z) => ({ id: z.id, nom: z.name, defaut: z.isDefault })),
			{ id: NO_ZONE_VALUE, nom: 'Sans zone', defaut: false }
		],
		tirages: historique.map((r) => ({
			id: r.id,
			at: r.at,
			zone: zones.find((z) => z.id === r.zoneId)?.name ?? (r.zoneId === NO_ZONE_VALUE ? 'Sans zone' : (r.zoneId ?? 'Sans zone')),
			groupes: r.packs.map((p) => ({
				id: p.id,
				nom: p.name,
				niveau: p.level,
				quantite: p.qty,
				comportement: p.behavior,
				couleur: parCreature.get(p.id)?.behaviorColor ?? 'currentColor',
				probabilite: p.prob
			}))
		})),
		totaux: Object.entries(totaux.totals)
			.filter(([, n]) => n > 0)
			.map(([id, n]) => ({ id, nom: parCreature.get(id)?.name ?? 'créature rayée du bestiaire', total: n }))
			.sort((a, b) => b.total - a.total || a.nom.localeCompare(b.nom, 'fr')),
		personnages: personnages.map((p) => ({ id: p.id, nom: p.name, serment: p.oath.name, niveau: p.level }))
	};
};

function texte(v: FormValues[string]): string {
	return typeof v === 'string' ? v.trim() : '';
}
function liste(v: FormValues[string]): string[] {
	if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string' && x.length > 0);
	return typeof v === 'string' && v ? [v] : [];
}

export const actions: Actions = {
	tirer: action(async (event, data) => {
		const actor = requireCapability(event, 'spawn.run');
		const zoneId = texte(data.zone);
		if (!zoneId) throw new NpError('INVALID', 'Choisis une zone.');
		const count = Math.max(1, Math.min(5, Number.parseInt(texte(data.nombre), 10) || 1));
		const run = await drawSpawn(event.locals.db, actor, { zoneId, count });
		return { tirage: run.id };
	}),

	envoyer: action(async (event, data) => {
		const actor = requireCapability(event, 'spawn.run');
		requireCapability(event, 'combat.run');
		const runId = texte(data.tirage);
		if (!runId) throw new NpError('INVALID', 'Choisis un tirage à envoyer.');
		const table = await spawnToTable(event.locals.db, actor, { runId, characterIds: liste(data.personnages) });
		redirect(303, `/table/combat/${table.row.id}`);
	})
};
