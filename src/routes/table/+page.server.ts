// /table — les Tables ouvertes et récentes, et « Ouvrir une Table » (03-vision §5.8, 06-contrats C).
import { redirect } from '@sveltejs/kit';
import { requireCapability } from '$lib/server/guards';
import { action } from '$lib/server/actions';
import { NpError } from '$lib/server/http';
import { createTable, listTables } from '$lib/server/domain/combats';
import { listCharacters } from '$lib/server/domain/characters';
import { listBeasts } from '$lib/server/domain/beasts';
import type { Actions, PageServerLoad } from './$types';

/** Tables repliées montrées sous les Tables ouvertes (les autres sont dans les Archives). */
const RECENTES = 6;

export const load: PageServerLoad = async (event) => {
	const actor = requireCapability(event, 'combat.run');
	const db = event.locals.db;
	const [tables, personnages, creatures] = await Promise.all([
		listTables(db, actor, {}),
		listCharacters(db, actor, {}),
		listBeasts(db, actor, {})
	]);
	return {
		creature: creatures.some((b) => b.id === event.url.searchParams.get('creature'))
			? event.url.searchParams.get('creature')
			: null,
		ouvertes: tables.filter((t) => t.status !== 'termine'),
		recentes: tables.filter((t) => t.status === 'termine').slice(0, RECENTES),
		personnages: personnages.map((p) => ({
			id: p.id,
			nom: p.name,
			serment: p.oath.name,
			niveau: p.level,
			pv: p.pv,
			ep: p.ep,
			em: p.em,
			relie: p.linkedPseudo
		})),
		creatures: creatures.map((b) => ({
			id: b.id,
			nom: b.name,
			sousTitre: b.subtitle,
			niveau: b.level,
			comportement: b.behavior,
			couleur: b.behaviorColor
		}))
	};
};

function texte(v: unknown): string {
	return typeof v === 'string' ? v.trim() : '';
}
function liste(v: unknown): string[] {
	if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string' && x.length > 0);
	return typeof v === 'string' && v ? [v] : [];
}

export const actions: Actions = {
	ouvrir: action(async (event, data) => {
		const actor = requireCapability(event, 'combat.run');
		const name = texte(data.nom);
		if (!name) throw new NpError('INVALID', 'Donne un nom à la Table.');
		const discordUrl = texte(data.salon);
		if (discordUrl && !/^https:\/\/(?:[\w-]+\.)?discord(?:app)?\.com\//i.test(discordUrl))
			throw new NpError('INVALID', 'Le salon doit être un lien Discord (https://discord.com/…).');
		const beasts: { beastId: string; qty: number }[] = [];
		for (const [cle, valeur] of Object.entries(data)) {
			if (!cle.startsWith('qte_')) continue;
			const qty = Number.parseInt(texte(valeur), 10);
			if (Number.isFinite(qty) && qty > 0)
				beasts.push({ beastId: cle.slice(4), qty: Math.min(30, qty) });
		}
		const table = await createTable(event.locals.db, actor, {
			name,
			discordUrl,
			characterIds: liste(data.personnages),
			beasts
		});
		redirect(303, `/table/combat/${table.row.id}`);
	})
};
