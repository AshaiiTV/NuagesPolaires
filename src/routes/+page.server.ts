// Accueil public (03-vision §5.1 ; 06-contrats §C `/`) : « Dernières pages » (trois feuillets au plus,
// publiés ou tirés de l'agenda visible), la liste des Serments publics, le lien d'invitation Discord.
// Toutes les lectures sont attendues avant de répondre (la base de la requête se ferme ensuite).
// Serveur muet : `leaves = null`, la page dit « Les dernières pages reviendront quand le serveur
// répondra. » ; les Serments retombent sur le catalogue intégré.
import { visibleOaths, OATH_CATEGORY_LABELS } from '$lib/game/oaths';
import { listHomeLeaves } from '$lib/server/domain/publications';
import { listOaths } from '$lib/server/domain/oaths';
import { getPublicSettings } from '$lib/server/domain/settings';
import type { HomeLeaf } from '$lib/schemas/publications';
import type { PageServerLoad } from './$types';

export type { HomeLeaf };

type SermentPublic = { id: string; name: string; weapon: string; category: string };

export const load: PageServerLoad = async ({ locals }) => {
	const db = locals.db;

	let leaves: HomeLeaf[] | null;
	try {
		leaves = await listHomeLeaves(db);
	} catch {
		leaves = null;
	}

	let oaths: SermentPublic[];
	try {
		oaths = (await listOaths(db, null)).map((oath) => ({
			id: oath.id,
			name: oath.name,
			weapon: oath.weapon,
			category: OATH_CATEGORY_LABELS[oath.category] ?? ''
		}));
	} catch {
		oaths = visibleOaths().map((oath) => ({
			id: oath.id,
			name: oath.name,
			weapon: oath.weapon,
			category: OATH_CATEGORY_LABELS[oath.category] ?? ''
		}));
	}

	let discord: string | null;
	try {
		discord = (await getPublicSettings(db)).discordInvite;
	} catch {
		discord = locals.discordInvite ?? null;
	}

	return { leaves, oaths, discord };
};
