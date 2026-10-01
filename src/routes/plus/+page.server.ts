// « Plus » (03-vision §4 « Téléphone ») : la suite de la bande basse. La liste se compose côté page à
// partir des mêmes règles de navigation que la tranche (src/lib/ui/navigation.ts) ; ici, seulement
// l'exigence d'un compte et le portrait du personnage relié.
import { requireAccount } from '$lib/server/guards';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireAccount(event);
	const character = event.locals.character;
	return { personnage: character ? { name: character.name } : null };
};
