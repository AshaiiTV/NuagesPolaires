import type { LayoutServerLoad } from './$types';

// Ce que toute page sait du visiteur : son compte (ou rien), le thème choisi, le lien d'invitation.
// `event.locals` est rempli par `hooks.server.ts` (06-contrats §A « Navigation et thème »).
export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		compte: locals.compteNav,
		theme: locals.theme,
		discord: locals.discordInvite
	};
};
