// La Table vue par un joueur (03-vision §5.9 ; 06-contrats §C `/carnet/table/[id]`).
// Lecture seule : la projection filtrée par le serveur (getPlayerTable : participant uniquement,
// chiffres des adversaires remplacés par l'état narratif). Aucune action : on lève les yeux de
// Discord, on ne joue pas ici. La suite arrive par le sondage de /api/table/[id]/etat.
// Table repliée (combat archivé) : on le dit, avec le lien vers le récit s'il est lisible.
import { error } from '@sveltejs/kit';
import { requireCharacter } from '$lib/server/guards';
import { NpError } from '$lib/server/http';
import { getPlayerTable, getRecit, listRecits } from '$lib/server/domain/combats';
import { ruleCardFor, type RuleCard } from '$lib/game/rules';
import { STATUS_EFFECTS, STATUS_IDS } from '$lib/game/combat/statuses';
import { statusColor } from '$lib/game/colors';
import type { PageServerLoad } from './$types';

const PAS_LA_TIENNE = 'Cette Table n’est pas la tienne.';

/**
 * Les cartes de règle possibles, calculées ici par la table de correspondance de rules.ts : la page
 * choisit selon l'état reçu (déclarations → actions ; statut actif → sa définition ; EP basse →
 * récupération ; sinon le glossaire), sans embarquer le moteur de combat dans le navigateur.
 */
function cartes() {
	const statuts: Record<string, RuleCard> = {};
	for (const id of STATUS_IDS) statuts[id] = ruleCardFor({ kind: 'status', status: id });
	return {
		actions: ruleCardFor({ kind: 'declaration' }),
		recuperation: ruleCardFor({ kind: 'recovery' }),
		glossaire: ruleCardFor({ kind: 'out-of-combat' }),
		statuts
	};
}

/** Libellé et couleur de chaque statut (losange). */
function statuts(): Record<string, { label: string; color: string }> {
	return Object.fromEntries(STATUS_IDS.map((id) => [id, { label: STATUS_EFFECTS[id].label, color: statusColor(id) }]));
}

/** Un refus « introuvable » ou « interdit » du domaine : la page n'est pas servie. */
function estRefus(e: unknown): boolean {
	return e instanceof NpError && (e.status === 404 || e.status === 403);
}

export const load: PageServerLoad = async (event) => {
	const { actor } = requireCharacter(event);
	const db = event.locals.db;
	const id = event.params.id;
	const maintenant = new Date().toISOString();

	// Une Table repliée se lit comme un récit (archivé, visible de ses participants). La liste des
	// récits ne relit pas l'état du combat : elle dit seulement si celui-ci est replié et à moi.
	const recits = await listRecits(db, actor, { page: 1 });
	const r = recits.find((x) => x.id === id);
	if (r) {
		let discordUrl = '';
		try {
			discordUrl = (await getRecit(db, actor, id)).discordUrl;
		} catch (e) {
			// Le récit reste lisible depuis le journal ; seul le lien du salon manque ici.
			if (!(e instanceof NpError)) throw e;
		}
		return {
			table: null,
			repliee: { id: r.id, title: r.title, name: r.name, at: r.at, discordUrl },
			maintenant,
			cartes: null,
			statuts: statuts()
		};
	}

	try {
		const table = await getPlayerTable(db, actor, id);
		return { table, repliee: null, maintenant, cartes: cartes(), statuts: statuts() };
	} catch (e) {
		if (estRefus(e) || (e instanceof NpError && e.code === 'INVALID'))
			error(404, { message: PAS_LA_TIENNE, code: 'NOT_FOUND' });
		throw e;
	}
};
