import type { LayoutServerLoad } from './$types';
import type { CompteNav } from '$lib/ui/navigation';

// Ce que toute page sait du visiteur : son compte (ou rien), le thème choisi, le lien d'invitation.
// `event.locals` est rempli par `hooks.server.ts` (paquet Auth) ; tant qu'il ne l'est pas, tout le
// monde est visiteur.
export const load: LayoutServerLoad = async ({ locals }) => {
	const session = locals as unknown as {
		compteNav?: CompteNav | null;
		theme?: { id: string; ton: 'sombre' | 'clair' } | null;
		discordInvite?: string | null;
	};
	return {
		compte: session.compteNav ?? null,
		theme: session.theme ?? { id: 'dark', ton: 'sombre' as const },
		discord: session.discordInvite ?? null
	};
};
