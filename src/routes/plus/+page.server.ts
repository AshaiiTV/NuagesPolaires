// « Plus » (03-vision §4 « Téléphone ») : la suite de la bande basse. La liste se compose côté page à
// partir des mêmes règles de navigation que la tranche (src/lib/ui/navigation.ts) ; ici, seulement
// l'exigence d'un compte et le portrait du personnage relié.
import { isDiscordEnabled } from '$lib/server/domain/accounts';
import { requireAccount } from '$lib/server/guards';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireAccount(event);
	const character = event.locals.character;
	// La connexion Discord n'est annoncée que si elle est ouverte sur ce carnet.
	return {
		personnage: character ? { name: character.name } : null,
		discordActif: isDiscordEnabled()
	};
};
